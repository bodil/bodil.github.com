extern crate dotenv;
extern crate env_logger;
extern crate futures;
extern crate hyper;
extern crate hyper_staticfile;
#[macro_use]
extern crate log;

use std::env;
use std::io::{Error, ErrorKind};
use std::path::Path;

use futures::future::{self, Future};
use hyper::service::service_fn;
use hyper::{
    header::{HeaderValue, HOST, LOCATION},
    Body, Client, Request, Response, Server,
};
use hyper_staticfile as stat;

const PROXY_BASE: &str = "http://github.bodil.lol";
const STATIC_FILE_PATH: &str = "./web/app";

fn main() {
    dotenv::dotenv().ok();
    env_logger::init();

    match main_process() {
        Err(err) => error!("{:?}", err),
        _ => trace!("Process exited without incident."),
    }
}

fn resolve_static(req: Request<Body>) -> impl Future<Item = Response<Body>, Error = Error> {
    stat::resolve(Path::new(STATIC_FILE_PATH), &req).and_then(
        move |stat_result| match stat_result {
            result @ stat::ResolveResult::Found(_, _) => {
                future::ok(stat::ResponseBuilder::new().build(&req, result).unwrap())
            }
            _ => future::err(Error::new(ErrorKind::Other, "file not found")),
        },
    )
}

fn resolve_proxy(path: &str) -> impl Future<Item = Response<Body>, Error = Error> {
    let url = format!("{}{}", PROXY_BASE, path)
        .parse()
        .unwrap_or_default();
    let client = Client::new();
    client
        .get(url)
        .map_err(|err| Error::new(ErrorKind::Other, err))
}

fn resolve_redirect(req: &Request<Body>) -> impl Future<Item = Response<Body>, Error = Error> {
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
        future::ok(
            Response::builder()
                .status(301)
                .header(LOCATION, redirect.as_str())
                .body(Body::empty())
                .unwrap(),
        )
    } else {
        future::err(Error::new(ErrorKind::Other, "no redirect"))
    }
}

fn resolve(req: Request<Body>) -> impl Future<Item = Response<Body>, Error = Error> {
    let path = req.uri().path().to_owned();
    resolve_redirect(&req).or_else(|_| resolve_static(req).or_else(move |_| resolve_proxy(&path)))
}

fn main_process() -> Result<(), Error> {
    let port = env::var("PORT")
        .expect("No PORT environment variable set.")
        .parse()
        .expect("Unable to parse value of PORT environment variable.");
    let addr = ([0, 0, 0, 0], port).into();
    let server = Server::bind(&addr)
        .serve(|| service_fn(resolve))
        .map_err(|e| error!("Server error: {}", e));
    info!(
        "Serving path {}",
        Path::new(STATIC_FILE_PATH)
            .canonicalize()
            .unwrap()
            .display()
    );
    info!("Proxying to {}", PROXY_BASE);
    info!("Listening on port {}", port);
    hyper::rt::run(server);
    Ok(())
}
