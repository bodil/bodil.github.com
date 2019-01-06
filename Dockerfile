FROM rust:1.31.1
WORKDIR /app
COPY . .
RUN cargo build --release
RUN curl -sL https://github.com/getzola/zola/releases/download/v0.5.0/zola-v0.5.0-x86_64-unknown-linux-gnu.tar.gz | tar zx
RUN ./zola build
RUN rm zola
CMD ["cargo", "run", "--release"]
