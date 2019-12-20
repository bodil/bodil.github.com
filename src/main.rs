#![forbid(rust_2018_idioms)]
#![deny(nonstandard_style)]

use std::env;
use std::io::{Error, ErrorKind};
use std::path::Path;

use hyper::{
    header::{HeaderValue, HOST, LOCATION},
    service::{make_service_fn, service_fn},
    Body, Client, Request, Response, Server,
};
use hyper_staticfile as stat;
use log::{error, info, trace};

const PROXY_BASE: &str = "http://github.bodil.lol";
const STATIC_FILE_PATH: &str = "./public";

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

async fn resolve(req: Request<Body>) -> Result<Response<Body>, Error> {
    let path = req.uri().path().to_owned();
    if let response @ Ok(_) = resolve_redirect(&req) {
        return response;
    }
    if let response @ Ok(_) = resolve_static(req).await {
        return response;
    }
    resolve_proxy(&path).await
}

async fn main_process() -> Result<(), hyper::Error> {
    let port = env::var("PORT")
        .expect("No PORT environment variable set.")
        .parse()
        .expect("Unable to parse value of PORT environment variable.");
    let addr = ([0, 0, 0, 0], port).into();
    let server = Server::bind(&addr).serve(make_service_fn(|_| async {
        Ok::<_, Error>(service_fn(resolve))
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
