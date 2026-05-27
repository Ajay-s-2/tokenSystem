const { body, param, query } = require("express-validator");

const LOG_TYPES = ["info", "success", "warn", "error"];
const LOG_ORIGINS = ["frontend", "backend", "system"];
const MAX_LOG_MESSAGE_LENGTH = 1000;
const MAX_LOG_SOURCE_LENGTH = 120;
const MAX_LOG_DATA_BYTES = 10000;

const truncate = (maxLength) => (value) => {
  if (value === undefined || value === null) return value;
  const text = String(value).trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const createLogValidation = [
  body("type")
    .trim()
    .toLowerCase()
    .isIn(LOG_TYPES)
    .withMessage("type must be one of info, success, warn, error"),
  body("message")
    .customSanitizer(truncate(MAX_LOG_MESSAGE_LENGTH))
    .notEmpty()
    .withMessage("message is required"),
  body("source")
    .optional({ nullable: true })
    .customSanitizer(truncate(MAX_LOG_SOURCE_LENGTH))
    .isString()
    .withMessage("source must be a string")
    .bail()
    .isLength({ max: MAX_LOG_SOURCE_LENGTH })
    .withMessage("source must be at most 120 characters"),
  body("origin")
    .optional()
    .trim()
    .toLowerCase()
    .isIn(LOG_ORIGINS)
    .withMessage("origin must be one of frontend, backend, system"),
  body("data")
    .optional({ nullable: true })
    .custom((value) => {
      try {
        // Only validate if data is present
        if (!value) return true;
        
        // Ensure data is serializable and not too large
        const serialized = JSON.stringify(value);
        return Buffer.byteLength(serialized, "utf8") <= MAX_LOG_DATA_BYTES;
      } catch (error) {
        // Reject non-serializable data with clear error
        throw new Error("data must be JSON-serializable");
      }
    })
    .withMessage("data must be JSON-serializable and under 10000 bytes"),
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
