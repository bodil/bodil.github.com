var prod = process.env["NODE_ENV"] === "production";

module.exports = {
  debug: !prod,
  devtool: "source-map",
  entry: "./src",
  output: {
    path: __dirname + "/app",
    pathinfo: true,
    filename: "app.js"
  },
  devServer: {
    port: 1337,
    contentBase: "app",
    stats: "errors-only"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: "babel",
        query: {
          presets: prod ? ["babili"] : ["es2015"]
        }
      },
      {
        test: /\.css$/,
        loader: "style-loader!css-loader!postcss-loader"
      },
      {
        test: /\.glsl$/,
        loader: "webpack-glsl"
      }
    ]
  },
  postcss: function() {
    return [require("postcss-cssnext")];
  }
};
