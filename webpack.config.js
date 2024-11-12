const { merge } = require("webpack-merge");
const singleSpaDefaults = require("webpack-config-single-spa");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
module.exports = (webpackConfigEnv, argv) => {
  const orgName = "mhcp";
  const defaultConfig = singleSpaDefaults({
    orgName,
    projectName: "root-config",
    webpackConfigEnv,
    argv,
    disableHtmlGeneration: true,
  });

  return merge(defaultConfig, {
    // modify the webpack config however you'd like to by adding to this object
    optimization: {
      minimize: false,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: "home",
        library: { type: "var" },
        filename: "remoteEntry.js",
        remotes: {
          mhcp_prg: "mhcp_prg",
          mhcp_header: "mhcp_header",
          //mhcp_login: "mhcp_login",
          mhcp_seg: "mhcp_seg",
          mhcp_adm: "mhcp_adm",
          mhcp_pac: "mhcp_pac",
          mhcp_apr: "mhcp_apr",
        },
        exposes: {},
        shared: [],
      }),
      new HtmlWebpackPlugin({
        favicon: "src/favicon.ico",
        inject: false,
        template: "src/index.ejs",
        templateParameters: {
          isLocal: webpackConfigEnv && webpackConfigEnv.isLocal,
          orgName,
        },
      }),
    ],
  });
};
