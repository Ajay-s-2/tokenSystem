const { body, param, query } = require("express-validator");
const { APPROVAL_STATUS } = require("../../shared/utils/constants");

const amountValidationMessage = "Subscription amount must be a non-negative number";
const ratePerHospitalValidationMessage = "Rate per hospital must be a non-negative number";

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
    if (Number.isNaN(numericValue) || numericValue < 0) {
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
  listValidation,
  statusUpdateValidation,
  defaultSubscriptionValidation,
  hospitalSubscriptionValidation,
  doctorSubscriptionUpdateValidation,
};
