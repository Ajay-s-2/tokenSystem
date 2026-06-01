const express = require("express");
const authController = require("./auth.controller");
const validationMiddleware = require("../../middleware/validation.middleware");
const authValidation = require("./auth.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const {
  authLimiter,
  loginLimiter,
  otpLimiter,
  refreshLimiter,
} = require("../../middleware/rateLimiter.middleware");

const router = express.Router();

router.get("/csrf-token", authController.getCsrfToken);

router.post("/register", authLimiter, authValidation.registerValidation, validationMiddleware, authController.register);
router.post(
  "/verify-register-otp",
  otpLimiter,
  authValidation.otpValidation,
  validationMiddleware,
  authController.verifyRegisterOtp
);
router.post(
  "/resend-register-otp",
  otpLimiter,
  authValidation.resendOtpValidation,
  validationMiddleware,
  authController.resendRegisterOtp
);
router.post("/login", loginLimiter, authValidation.loginValidation, validationMiddleware, authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.post("/logout-all", authMiddleware, authController.logoutAll);

module.exports = router;
