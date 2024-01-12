require ('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const emailExistence=require("email-existence");
const ejs = require("ejs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

const { getArgs } = require("../..//utils");
const startFrontendDevServer = require("../../server-frontend-dev");
const startBackendServer = require("../../server-backend");

const SERVER_MODES = {
    PRODUCTION: 1,
    DEVELOPMENT: 2,
};

const args = getArgs();

if (typeof args.mode === "undefined") {
    // default to production mode
    args.mode = "production";
}

if (args.mode !== "production" && args.mode !== "development") {
    throw new Error("--mode can only be 'development' or 'production'");
}

const server_mode = args.mode === "production" ? SERVER_MODES.PRODUCTION : SERVER_MODES.DEVELOPMENT;

app.use(express.static("public"));

// Set the views directory to the correct path
const viewsPath = path.join(
    __dirname,
    "scripts",
    "Authentication",
    "Authentication-starting",
    "views"
);

app.set("views", "./scripts/Authentication/Authentication-starting/views");
//console.log("Views directory:", viewsPath); // Add this line for debugging

app.set("view engine", "ejs");

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

mongoose
    .connect(
        `mongodb+srv://mohiniagarwal1408:${process.env.PASSWORD}@cluster0.xu5sddz.mongodb.net/whiteboardDB`
    )
    .then(() => {
        console.log("connected");
    });

const whiteboardSchema = {
    email: String,
    password: String,
};

const Whiteboard = new mongoose.model("Whiteboard", whiteboardSchema);

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", async function (req, res) {
    const emailValid = req.body.username;

    // Check if the email exists
    emailExistence.check(emailValid, async function (error, result) {
        if (error || !result) {
            console.error("Invalid email address or email does not exist:", emailValid);
            return res.status(404).redirect("register");
        }

        // Email exists, proceed with user registration
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            if (err) {
                console.error("Error hashing password:", err);
                return res.status(500).redirect("register");
            }

            const newUser = new Whiteboard({
                email: req.body.username,
                password: hash,
            });

            newUser
                .save()
                .then(function () {
                    if (server_mode === SERVER_MODES.DEVELOPMENT) {
                        console.info("Starting server in development mode.");
                        startFrontendDevServer(8080);
                        startBackendServer(3000);
                        return res.redirect("http://localhost:8080");
                    } else {
                        console.info("Starting server in production mode.");
                        startBackendServer(process.env.PORT || 8080);
                        return res.redirect("http://localhost:8080");
                    }
                })
                .catch(function (err) {
                    console.log("Error saving user:", err);
                    return res.status(500).redirect("register");
                });
        });
    });
});



app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    Whiteboard.findOne({ email: username })
        .then(function (foundUser) {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function (err, result) {
                    // result == true
                    if (result === true) {
                        if (server_mode === SERVER_MODES.DEVELOPMENT) {
                            console.info("Starting server in development mode.");
                            startFrontendDevServer(8080);
                            startBackendServer(3000);

                            res.redirect("http://localhost:8080");
                        } else {
                            console.info("Starting server in production mode.");
                            startBackendServer(process.env.PORT || 8080);

                            res.redirect("http://localhost:8080");
                        }
                    } else {
                        console.log("Incorrect password");
                        res.status(401).render("login", { error: "Incorrect password" });

                        //res.redirect("/login");
                    }
                });
            } else {
                console.log("User not found");
                res.redirect("/");
            }
        })
        .catch(function (err) {
            console.log(err);
        });
});

app.listen(3001, function () {
    console.log("Server started on port 3001");
});
