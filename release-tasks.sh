#!/bin/sh
curl -sL https://github.com/getzola/zola/releases/download/v0.5.0/zola-v0.5.0-x86_64-unknown-linux-gnu.tar.gz | tar zx
./zola build
rm zola
