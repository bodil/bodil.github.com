import * as path from "path";
import * as express from "express";
import * as morgan from "morgan";

const app = express();
const proxy = require("http-proxy").createProxyServer({
  target: "http://github.bodil.lol",
  changeOrigin: true
});

app.use(morgan("combined"));

app.use(express.static(path.resolve(__dirname, "..", "app")));

app.all("/*", (req, res) => {
  proxy.web(req, res);
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 1337;
app.listen(port, () => console.log(`Listening on port ${port}`));
