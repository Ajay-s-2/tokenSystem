const { body, param, query } = require("express-validator");
const { APPROVAL_STATUS } = require("../../shared/utils/constants");

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
  body("amount")
    .toFloat()
    .isFloat({ min: 0 })
    .withMessage("Subscription amount must be a non-negative number"),
];

const hospitalSubscriptionValidation = [
  body("hospitalId").isMongoId().withMessage("Valid hospital id is required"),
  body("amount")
    .toFloat()
    .isFloat({ min: 0 })
    .withMessage("Subscription amount must be a non-negative number"),
];

module.exports = {
  listValidation,
  statusUpdateValidation,
  defaultSubscriptionValidation,
  hospitalSubscriptionValidation,
};
