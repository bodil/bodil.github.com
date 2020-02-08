#![forbid(rust_2018_idioms)]
#![deny(nonstandard_style)]

use hyper::server::conn::AddrStream;
use hyper::HeaderMap;
use hyper::Uri;
use std::env;
use std::io::{Error, ErrorKind};
use std::net::SocketAddr;
use std::path::Path;

use hyper::{
    header::{HeaderValue, ACCEPT_LANGUAGE, HOST, LOCATION, REFERER, USER_AGENT},
    service::{make_service_fn, service_fn},
    Body, Client, Request, Response, Server,
};
use hyper_staticfile as stat;
use log::{error, info, trace};
use url::Url;

const PROXY_BASE: &str = "http://github.bodil.lol";
const STATIC_FILE_PATH: &str = "./public";
const MATOMO_PATH: &str = "https://tortuga.lol.camp/matomo/matomo.php";
const MATOMO_SITE_ID: &str = "1";

fn main() {
    dotenv::dotenv().ok();
    env_logger::init();

    match tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(main_process())
    {
        Err(err) => error!("{:?}", err),
        _ => trace!("Process exited without incident."),
    }
}

async fn track(addr: SocketAddr, uri: Uri, headers: HeaderMap<HeaderValue>) -> Result<(), Error> {
    let client = Client::new();
    let mut url = Url::parse(MATOMO_PATH).unwrap();
    let random: u128 = rand::random();
    url.query_pairs_mut()
        .clear()
        .append_pair("idsite", MATOMO_SITE_ID)
        .append_pair("rec", "1")
        .append_pair("url", &uri.to_string())
        .append_pair(
            "urlref",
            &headers[REFERER]
                .to_str()
                .map_err(|err| Error::new(ErrorKind::Other, err))?,
        )
        .append_pair(
            "ua",
            &headers[USER_AGENT]
                .to_str()
                .map_err(|err| Error::new(ErrorKind::Other, err))?,
        )
        .append_pair(
            "lang",
            &headers[ACCEPT_LANGUAGE]
                .to_str()
                .map_err(|err| Error::new(ErrorKind::Other, err))?,
        )
        .append_pair("cip", &addr.ip().to_string())
        .append_pair(
            "cdt",
            &format!(
                "{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::SystemTime::UNIX_EPOCH)
                    .map_err(|err| Error::new(ErrorKind::Other, err))?
                    .as_secs()
            ),
        )
        .append_pair(
            "token_auth",
            &env::var("MATOMO_TOKEN").expect("no MATOMO_TOKEN env var set"),
        )
        .append_pair("rand", &format!("{}", random))
        .append_pair("apiv", "1")
        .append_pair("send_image", "0");
    let uri = url
        .into_string()
        .parse()
        .map_err(|err| Error::new(ErrorKind::Other, err))?;
    client
        .get(uri)
        .await
        .map_err(|err| Error::new(ErrorKind::Other, err))
        .map(|_| {})
}

async fn resolve_static(req: Request<Body>) -> Result<Response<Body>, Error> {
    stat::resolve(Path::new(STATIC_FILE_PATH), &req)
        .await
        .and_then(move |stat_result| match stat_result {
            result @ stat::ResolveResult::Found(_, _, _) => Ok(stat::ResponseBuilder::new()
                .request(&req)
                .build(result)
                .unwrap()),
            _ => Err(Error::new(ErrorKind::Other, "file not found")),
        })
}

async fn resolve_proxy(path: &str) -> Result<Response<Body>, Error> {
    let url = format!("{}{}", PROXY_BASE, path)
        .parse()
        .unwrap_or_default();
    let client = Client::new();
    client
        .get(url)
        .await
        .map_err(|err| Error::new(ErrorKind::Other, err))
}

fn resolve_redirect(req: &Request<Body>) -> Result<Response<Body>, Error> {
    if env::var("NODE_ENV") == Ok("production".to_owned())
        && req.headers().get("x-forwarded-proto") != Some(&HeaderValue::from_static("https"))
    {
        let redirect = format!(
            "https://{}{}",
            req.uri().host().unwrap_or_else(|| req
                .headers()
                .get(HOST)
                .and_then(|host| host.to_str().ok())
                .unwrap_or_default()),
            req.uri().path()
        );
        trace!("Redirecting: {:?} => {:?}", req.uri(), redirect);
        Ok(Response::builder()
            .status(301)
            .header(LOCATION, redirect.as_str())
            .body(Body::empty())
            .unwrap())
    } else {
        Err(Error::new(ErrorKind::Other, "no redirect"))
    }
}

async fn resolve(addr: SocketAddr, req: Request<Body>) -> Result<Response<Body>, Error> {
    let path = req.uri().path().to_owned();
    let uri = req.uri().clone();
    let headers = req.headers().clone();
    let response = if let response @ Ok(_) = resolve_redirect(&req) {
        response
    } else if let response @ Ok(_) = resolve_static(req).await {
        response
    } else {
        resolve_proxy(&path).await
    };
    if let Ok(response) = &response {
        if response.status().is_success() {
            tokio::spawn(track(addr.clone(), uri, headers));
        }
    }
    response
}

async fn main_process() -> Result<(), hyper::Error> {
    let port = env::var("PORT")
        .expect("No PORT environment variable set.")
        .parse()
        .expect("Unable to parse value of PORT environment variable.");
    let addr = ([0, 0, 0, 0], port).into();
    let server = Server::bind(&addr).serve(make_service_fn(|conn: &AddrStream| {
        let remote_addr = conn.remote_addr();
        async move { Ok::<_, Error>(service_fn(move |req| resolve(remote_addr, req))) }
    }));
    info!(
        "Serving path {}",
        Path::new(STATIC_FILE_PATH)
            .canonicalize()
            .unwrap()
            .display()
    );
    info!("Proxying to {}", PROXY_BASE);
    info!("Listening on port {}", port);

    server.await
}
