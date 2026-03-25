const express = require("express");
const authController = require("./auth.controller");

const router = express.Router();

// Register flow
router.post("/register", authController.register);
router.post("/verify-register-otp", authController.verifyRegisterOtp);

// Login flow
router.post("/login", authController.login);
router.post("/verify-login-otp", authController.verifyLoginOtp);

module.exports = router;
