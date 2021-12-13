import path from "path";
import { Configuration, SourceMapDevToolPlugin } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";

const config: Configuration = {
    mode: "development",
    entry: "./src/index.jsx",
    output: {
        path: path.resolve(__dirname, "build"),
        filename: "[name].bundle.js",
    },
    devtool: false,  // Defined through a plugin
    devServer: {
        historyApiFallback: true,
        port: 3000,
    },

    resolve: {
        extensions: [".tsx", ".ts", ".jsx", ".js"],
        modules: ["node_modules"],
    },
    module: {
        rules: [
            {
                test: /\.[tj]sx?$/i,
                include: [
                    path.resolve("src"),
                    path.resolve("node_modules", "matrix-js-sdk"),
                ],
                loader: "babel-loader",
            },
            {
                test: /\.s[ca]ss$/i,
                use: ["style-loader", "css-loader", "sass-loader"],
            },
            {
                test: /\.svg$/i,
                use: [
                    {
                        loader: "babel-loader"
                    },
                    {
                        loader: "react-svg-loader",
                        options: {
                            jsx: true, // true owutputs JSX tags
                            svgo: {
                                plugins: [
                                    {removeViewBox: false},  // Necessary for scaling
                                ]
                            }
                        }
                    }
                ]
            }
        ],
    },
    plugins: [
        new SourceMapDevToolPlugin({}),
        new HtmlWebpackPlugin({template: '/public/index.html'}),
    ]
}

export default config;
