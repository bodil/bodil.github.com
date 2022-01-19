FROM rust:latest
WORKDIR /app
RUN curl -sL https://github.com/getzola/zola/releases/download/v0.15.2/zola-v0.15.2-x86_64-unknown-linux-gnu.tar.gz | tar zx
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml
COPY ./src ./src
RUN cargo build --release
COPY ./config.toml ./config.toml
COPY ./templates ./templates
COPY ./sass ./sass
COPY ./static ./static
COPY ./content ./content
RUN ./zola build
RUN rm zola
CMD ["cargo", "run", "--release"]
