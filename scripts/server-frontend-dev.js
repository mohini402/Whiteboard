const devServerConfig = {
    hot: true,
    proxy: {
        // proxies for the backend
        "/api":{target: "https://whiteboard-z61y.onrender.com:3000",
        changeOrigin:true
    },
        "/uploads":{target: "https://whiteboard-z61y.onrender.com:3000",
        changeOrigin:true,
    },
        "/ws-api": {
            target: "wss://whiteboard-z61y.onrender.com:3000",
            ws: true,
        },
    },
};

function startFrontendDevServer(port) {
    // require here to prevent prod dependency to webpack
    const webpack = require("webpack");
    const WebpackDevServer = require("webpack-dev-server");
    const config = require("../config/webpack.dev");

    new WebpackDevServer(webpack(config), devServerConfig).start(port, (err) => {
        if (err) {
            console.log(err);
        }

        console.log("Listening on port " + port);
    });
}

module.exports = startFrontendDevServer;
