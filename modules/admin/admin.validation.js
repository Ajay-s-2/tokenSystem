const { body, param, query } = require("express-validator");
const { APPROVAL_STATUS } = require("../../shared/utils/constants");

const amountValidationMessage = "Subscription amount must be a non-negative number";
const ratePerHospitalValidationMessage = "Subscription amount must be Rs 500 or more, in Rs 500 steps";

const amountValidator = body("amount")
  .customSanitizer((value) => {
    if (typeof value === "string") {
      return value.trim();
    }
    return value;
  })
  .custom((value) => {
    if (value === "" || value === null || value === undefined) {
      throw new Error(amountValidationMessage);
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      throw new Error(amountValidationMessage);
    }

    return true;
  })
  .customSanitizer((value) => Number(value));

const ratePerHospitalValidator = body("ratePerHospital")
  .customSanitizer((value) => {
    if (typeof value === "string") {
      return value.trim();
    }
    return value;
  })
  .custom((value) => {
    if (value === "" || value === null || value === undefined) {
      throw new Error(ratePerHospitalValidationMessage);
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < 500 || numericValue % 500 !== 0) {
      throw new Error(ratePerHospitalValidationMessage);
    }

    return true;
  })
  .customSanitizer((value) => Number(value));

const listValidation = [
  query("status")
    .optional()
    .isIn(Object.values(APPROVAL_STATUS))
    .withMessage("Status must be pending, approved or rejected"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sort").optional().isString().withMessage("Sort must be a string"),
];

const statusUpdateValidation = [
  param("id").isMongoId().withMessage("Valid resource id is required"),
  body("status")
    .trim()
    .isIn(Object.values(APPROVAL_STATUS))
    .withMessage("Status must be pending, approved or rejected"),
];

const entityIdValidation = [
  param("id").isMongoId().withMessage("Valid resource id is required"),
];

const disallowEmailUpdate = body("email").optional().custom(() => {
  throw new Error("Use the email change endpoint to update email");
});

const updateDoctorValidation = [
  ...entityIdValidation,
  disallowEmailUpdate,
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("gender").optional().trim().notEmpty().withMessage("Gender cannot be empty"),
  body("dob").optional().isISO8601().withMessage("Valid date of birth is required"),
  body("blood_group").optional().trim().notEmpty().withMessage("Blood group cannot be empty"),
  body("bloodGroup").optional().trim().notEmpty().withMessage("Blood group cannot be empty"),
  body("phone").optional().trim().notEmpty().withMessage("Phone cannot be empty"),
  body("department").optional().trim().notEmpty().withMessage("Department cannot be empty"),
  body("specialization")
    .optional()
    .trim()
    .isString()
    .withMessage("Specialization must be a string"),
  body("medicalRegistrationId")
    .optional()
    .trim()
    .isString()
    .withMessage("Medical registration ID must be a string"),
];

const updateHospitalValidation = [
  ...entityIdValidation,
  disallowEmailUpdate,
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("location").optional().trim().notEmpty().withMessage("Location cannot be empty"),
  body("phone").optional().trim().notEmpty().withMessage("Phone cannot be empty"),
  body("departments")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Departments must be a non-empty array"),
  body("departments.*")
    .optional()
    .isString()
    .withMessage("Department name must be a string"),
];

const emailChangeRequestValidation = [
  ...entityIdValidation,
  body("email").trim().isEmail().withMessage("Valid email is required"),
];

const emailChangeVerifyValidation = [
  ...entityIdValidation,
  body("otp")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("OTP must be a 6-digit code"),
];

const defaultSubscriptionValidation = [
  amountValidator,
];

const hospitalSubscriptionValidation = [
  body("hospitalId").isMongoId().withMessage("Valid hospital id is required"),
  amountValidator,
];

const doctorSubscriptionUpdateValidation = [
  param("doctorId").isMongoId().withMessage("Valid doctor id is required"),
  ratePerHospitalValidator,
];

module.exports = {
  entityIdValidation,
  listValidation,
  statusUpdateValidation,
  updateDoctorValidation,
  updateHospitalValidation,
  emailChangeRequestValidation,
  emailChangeVerifyValidation,
  defaultSubscriptionValidation,
  hospitalSubscriptionValidation,
  doctorSubscriptionUpdateValidation,
};
