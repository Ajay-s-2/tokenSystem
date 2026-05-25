const { body } = require("express-validator");
const { ROLES } = require("../../shared/utils/constants");
const { PASSWORD_POLICY_MESSAGE, isPasswordStrong } = require("../../shared/utils/password-policy.util");

const GENDERS = ["male", "female", "other"];
const MEDICAL_REGISTRATION_REGEX = /^[A-Za-z0-9/-]{6,40}$/;
const PHONE_REGEX = /^\d{10}$/;

const isPastDate = (value) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
};

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .custom((value) => isPasswordStrong(value))
    .withMessage(PASSWORD_POLICY_MESSAGE),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords must match"),
  body("role")
    .isIn([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.COMMON_USER, ROLES.ADMIN])
    .withMessage("Invalid role selected for registration"),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .matches(PHONE_REGEX)
    .withMessage("Phone must be a valid 10-digit number"),
  body("gender")
    .optional({ values: "falsy" })
    .trim()
    .toLowerCase()
    .isIn(GENDERS)
    .withMessage("Gender must be one of male, female, or other"),
  body("dob")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Date of birth must be a valid date")
    .bail()
    .custom((value) => isPastDate(value))
    .withMessage("Date of birth must be in the past"),
  body("departmentId")
    .optional({ values: "falsy" })
    .trim()
    .isMongoId()
    .withMessage("Department id must be a valid identifier"),
  body("medicalRegistrationId")
    .optional({ values: "falsy" })
    .trim()
    .matches(MEDICAL_REGISTRATION_REGEX)
    .withMessage("Medical registration id is invalid"),
  body("adminAccessCode")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 6, max: 64 })
    .withMessage("Admin access code is invalid"),
  body().custom((value, { req }) => {
    const role = req.body.role;

    if (role === ROLES.DOCTOR) {
      if (!req.body.phone || !PHONE_REGEX.test(req.body.phone)) {
        throw new Error("Doctor registration requires a valid phone number");
      }
      if (!req.body.gender || !GENDERS.includes(String(req.body.gender).toLowerCase())) {
        throw new Error("Doctor registration requires a valid gender");
      }
      if (!req.body.dob || !isPastDate(req.body.dob)) {
        throw new Error("Doctor registration requires a valid date of birth");
      }
      if (!req.body.departmentId) {
        throw new Error("Doctor registration requires departmentId");
      }
      if (!req.body.medicalRegistrationId || !MEDICAL_REGISTRATION_REGEX.test(req.body.medicalRegistrationId)) {
        throw new Error("Doctor registration requires a valid medical registration id");
      }
      if (!req.body.blood_group || String(req.body.blood_group).trim().length < 2) {
        throw new Error("Doctor registration requires blood group");
      }
    }

    if (role === ROLES.HOSPITAL) {
      if (!req.body.phone || !PHONE_REGEX.test(req.body.phone)) {
        throw new Error("Hospital registration requires a valid phone number");
      }
      if (!req.body.location || String(req.body.location).trim().length < 3) {
        throw new Error("Hospital registration requires location");
      }
      if (!req.body.departmentId) {
        throw new Error("Hospital registration requires departmentId");
      }
    }

    if (role === ROLES.ADMIN) {
      if (!req.body.adminAccessCode || String(req.body.adminAccessCode).trim().length < 6) {
        throw new Error("Admin registration requires a valid admin access code");
      }
    }

    return true;
  }),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const otpValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("otp")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("OTP must be a 6-digit code"),
];

const resendOtpValidation = [body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail()];

module.exports = {
  registerValidation,
  loginValidation,
  otpValidation,
  resendOtpValidation,
};
