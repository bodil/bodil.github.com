#![forbid(rust_2018_idioms)]
#![deny(nonstandard_style)]

use std::env;
use std::io::{Error, ErrorKind};
use std::net::SocketAddr;
use std::path::Path;

use hyper::{
    header::{HeaderValue, ACCEPT_LANGUAGE, HOST, LOCATION, REFERER, USER_AGENT},
    server::conn::AddrStream,
    service::{make_service_fn, service_fn},
    Body, Client, HeaderMap, Request, Response, Server, Uri,
};
use hyper_staticfile as stat;
use hyper_tls::HttpsConnector;
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

#[allow(dead_code)]
async fn track(addr: SocketAddr, uri: Uri, headers: HeaderMap<HeaderValue>) -> Result<(), Error> {
    let https = HttpsConnector::new();
    let client = Client::builder().build::<_, Body>(https);
    let mut url = Url::parse(MATOMO_PATH).unwrap();
    let random: u128 = rand::random();
    url.query_pairs_mut()
        .clear()
        .append_pair("idsite", MATOMO_SITE_ID)
        .append_pair("rec", "1")
        .append_pair("url", &uri.to_string())
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
    if let Some(header) = headers.get(REFERER) {
        url.query_pairs_mut().append_pair(
            "urlref",
            header
                .to_str()
                .map_err(|err| Error::new(ErrorKind::Other, err))?,
        );
    }
    if let Some(header) = headers.get(USER_AGENT) {
        url.query_pairs_mut().append_pair(
            "ua",
            header
                .to_str()
                .map_err(|err| Error::new(ErrorKind::Other, err))?,
        );
    }
    if let Some(header) = headers.get(ACCEPT_LANGUAGE) {
        url.query_pairs_mut().append_pair(
            "lang",
            header
                .to_str()
                .map_err(|err| Error::new(ErrorKind::Other, err))?,
        );
    }

    let uri = url
        .into_string()
        .parse()
        .map_err(|err| Error::new(ErrorKind::Other, err))?;
    println!("Sending tracking request: {}", uri);
    let result = client
        .get(uri)
        .await
        .map_err(|err| Error::new(ErrorKind::Other, err));
    if let Ok(response) = result {
        let bytes = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let s = std::str::from_utf8(&bytes).unwrap();
        println!("Tracker responded:\n\n{}\n", s);
    } else {
        println!("Tracking error: {:?}", result);
        return result.map(|_| ());
    }
    Ok(())
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

async fn resolve(_addr: SocketAddr, req: Request<Body>) -> Result<Response<Body>, Error> {
    let path = req.uri().path().to_owned();
    // let uri = req.uri().clone();
    // let headers = req.headers().clone();
    if let response @ Ok(_) = resolve_redirect(&req) {
        response
    } else if let response @ Ok(_) = resolve_static(req).await {
        response
    } else {
        resolve_proxy(&path).await
    }
    // if let Ok(response) = &response {
    //     let status = response.status();
    //     if status.is_success() || status.is_redirection() {
    //         println!("Tracking url {}", uri);
    //         tokio::spawn(track(addr, uri, headers));
    //     } else {
    //         println!("Did not track, status was {}", response.status());
    //     }
    // }
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
