const { body } = require("express-validator");
const { ROLES } = require("../../shared/utils/constants");

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
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
    .isLength({ min: 4, max: 10 })
    .withMessage("OTP format is invalid"),
];

module.exports = {
  registerValidation,
  loginValidation,
  otpValidation,
};
