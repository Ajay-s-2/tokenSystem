const express = require("express");
const authController = require("./auth.controller");
const validationMiddleware = require("../../middleware/validation.middleware");
const authValidation = require("./auth.validation");

const router = express.Router();

// Register flow
router.post("/register", authValidation.registerValidation, validationMiddleware, authController.register);
router.post(
  "/verify-register-otp",
  authValidation.otpValidation,
  validationMiddleware,
  authController.verifyRegisterOtp
);
router.post(
  "/resend-register-otp",
  authValidation.resendOtpValidation,
  validationMiddleware,
  authController.resendRegisterOtp
);

// Login flow
router.post("/login", authValidation.loginValidation, validationMiddleware, authController.login);

module.exports = router;
