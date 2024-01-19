require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const emailExistence = require("email-existence");
const ejs = require("ejs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
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
app.set("view engine", "ejs");

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAILPASS,
    },
    port: 587,
    secure: false,
});

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

app.get("/otp", function (req, res) {
    res.render("otp");
});

app.post("/register", async function (req, res) {
    try {
        const emailValid = req.body.username;

        // Check if the email exists
        const result = await new Promise((resolve, reject) => {
            emailExistence.check(emailValid, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        if (!result) {
            console.error("Invalid email address or email does not exist:", emailValid);
            return res.status(404).render("register", {
                errorMessage: "Email does not exist. Please enter valid email",
            });
        }

        const userExists = await Whiteboard.exists({ email: emailValid });

        if (userExists) {
            console.error("User with this email already exists:", emailValid);
            return res.status(409).render("register", {
                errorMessage: "User with this email already exists",
            });
        }

        const otp = generateOTP(6);
        sendOTP(emailValid, otp);

        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            if (err) {
                console.error("Error hashing password:", err);
                return res.status(500).redirect("register");
            }
            return res.render("otp", { emailValid, hashedPassword: hash, storedOTP: otp });
        });
    } catch (error) {
        console.error("Error checking email existence:", error);
        return res
            .status(500)
            .render("register", { errorMessage: "Email does not exist. Please enter valid email" });
    }
});

app.post("/otp", function (req, res) {
    const enteredOTP = req.body.otp;
    const emailValid = req.body.email;
    const hashedPassword = req.body.hash;
    const storedOTP = req.body.storedOTP; // Extract stored OTP from request

    // Perform OTP verification
    const isOTPValid = verifyOTP(enteredOTP, storedOTP);

    if (isOTPValid) {
        // Continue with user registration
        const newUser = new Whiteboard({
            email: emailValid,
            password: hashedPassword,
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
    } else {
        // Invalid OTP
        return res.status(401).render("register", { invalidOtp: "Invalid OTP try again...." });
    }
});

// Example OTP verification function
function verifyOTP(enteredOTP, storedOTP) {
    return enteredOTP === storedOTP;
}

function generateOTP(length) {
    const chars = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += chars[Math.floor(Math.random() * chars.length)];
    }
    return otp;
}

function sendOTP(email, otp) {
    // Configure the email options
    const mailOptions = {
        from: process.env.EMAIL, // Replace with your email
        to: email,
        subject: "Verification Code for Registration",
        text: `Your verification code is: ${otp}. Use this code to complete your registration.`,
    };

    // Send the email
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error("Error sending OTP email:", error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
}

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
                        res.status(401).render("login", { userError: "Incorrect password" });
                    }
                });
            } else {
                console.log("User not found");
                res.render("home", { userError: "User not found. Register then try again..." });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
});

app.listen(3001, function () {
    console.log("Server started on port 3001");
});
