//@ts-check

"use strict";

const { DefinePlugin } = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");
const dotenv = require("dotenv");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/
const extensionConfig = (argv, bundle) => {
  const PRODUCTION = argv.mode === "production";
  const DEVELOPMENT = !PRODUCTION;

  return {
    target: "node", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    mode: PRODUCTION ? "production" : "development",

    entry: {
      // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
      extension: "./src/extension.ts",
    },
    output: {
      // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
      path: bundle.outputPath,
      filename: "[name].js",
      libraryTarget: "commonjs2",
    },
    externals: {
      vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
      // modules added here also need to be added in the .vscodeignore file
    },
    resolve: {
      // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
      extensions: [".ts", ".js", ".json"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
            },
          ],
        },
      ],
    },
    devtool: "nosources-source-map",
    infrastructureLogging: {
      level: "log", // enables logging required for problem matchers
    },
    optimization: {
      innerGraph: true,
      usedExports: true,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            mangle: PRODUCTION,
            compress: {
              drop_console: PRODUCTION,
              drop_debugger: PRODUCTION,
            },
          },
        }),
      ],
    },
    plugins: [
      new DefinePlugin({
        DEVELOPMENT: JSON.stringify(DEVELOPMENT),
        CONNECTION_STRING: JSON.stringify(bundle.connectionString),
      }),
    ],
  };
};

const webConfig = (argv, bundle) => {
  const extensionCfg = extensionConfig(argv, bundle);
  return {
    ...extensionCfg,
    ...{
      target: "webworker", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
      mode: argv.mode ?? "development",
      entry: {
        // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
        web: "./src/extension.ts",
      },
      output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: bundle.outputPath,
        filename: "[name].js",
        libraryTarget: "commonjs2",
      },
    },
  };
};

const smokeTestConfig = (argv, bundle) => {
  const config = webConfig(argv, bundle);
  return {
    ...config,
    entry: {
      smoke: "./src/test/smoke.ts",
    },
    output: {
      ...config.output,
      filename: "smoke.js",
    },
  };
};

module.exports = (env, argv) => {
  const smoke = env?.smoke === true || env?.smoke === "true";
  const outputPath = smoke
    ? path.resolve(__dirname, "out/smoke-extension/dist")
    : path.resolve(__dirname, "dist");
  // スモーク用バンドルは開発者の .env を読み込まず、認証情報を埋め込まない。
  const connectionString = smoke
    ? ""
    : (dotenv.config().parsed ?? {}).connection_string;
  const bundle = { outputPath, connectionString };
  const configs = [extensionConfig(argv, bundle), webConfig(argv, bundle)];
  if (smoke) {
    configs.push(smokeTestConfig(argv, bundle));
  }
  return configs;
};
