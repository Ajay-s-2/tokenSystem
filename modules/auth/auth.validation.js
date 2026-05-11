const { body } = require("express-validator");
const { ROLES } = require("../../shared/utils/constants");

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isLength({ max: 120 })
    .withMessage("Name must be at most 120 characters"),
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required"),
  body("role")
    .isIn([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.COMMON_USER, ROLES.ADMIN])
    .withMessage("Invalid role selected for registration"),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const otpValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .matches(/^\d{6}$/)
    .withMessage("OTP must be a 6-digit code"),
];

const resendOtpValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
];

module.exports = {
  registerValidation,
  loginValidation,
  otpValidation,
  resendOtpValidation,
};
