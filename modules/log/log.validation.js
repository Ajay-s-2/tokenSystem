const { body, param, query } = require("express-validator");

const LOG_TYPES = ["info", "success", "warn", "error"];
const LOG_ORIGINS = ["frontend", "backend", "system"];

const createLogValidation = [
  body("type")
    .trim()
    .isIn(LOG_TYPES)
    .withMessage("type must be one of info, success, warn, error"),
  body("message").trim().notEmpty().withMessage("message is required"),
  body("message").isLength({ max: 1000 }).withMessage("message must be at most 1000 characters"),
  body("source")
    .optional({ nullable: true })
    .isString()
    .withMessage("source must be a string")
    .bail()
    .isLength({ max: 120 })
    .withMessage("source must be at most 120 characters"),
  body("origin")
    .optional()
    .trim()
    .isIn(LOG_ORIGINS)
    .withMessage("origin must be one of frontend, backend, system"),
  body("data")
    .optional({ nullable: true })
    .custom((value) => {
      try {
        return JSON.stringify(value).length <= 10000;
      } catch {
        return false;
      }
    })
    .withMessage("data payload is too large"),
];

const listLogsValidation = [
  query("type")
    .optional()
    .trim()
    .isIn(LOG_TYPES)
    .withMessage("type must be one of info, success, warn, error"),
  query("origin")
    .optional()
    .trim()
    .isIn(LOG_ORIGINS)
    .withMessage("origin must be one of frontend, backend, system"),
  query("source").optional().isString().withMessage("source must be a string"),
  query("search").optional().isString().withMessage("search must be a string"),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("sort").optional().isString().withMessage("sort must be a string"),
];

const deleteLogValidation = [
  param("id").isMongoId().withMessage("Valid log id is required"),
];

module.exports = {
  createLogValidation,
  listLogsValidation,
  deleteLogValidation,
};
