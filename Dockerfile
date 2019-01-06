FROM rust:1.31.1
WORKDIR /app
RUN curl -sL https://github.com/getzola/zola/releases/download/v0.5.0/zola-v0.5.0-x86_64-unknown-linux-gnu.tar.gz | tar zx
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
