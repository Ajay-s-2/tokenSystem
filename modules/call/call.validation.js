const { body, param, query } = require("express-validator");

const CALL_FINAL_STATUSES = ["completed", "cancelled", "missed"];
const CALL_EVENT_TYPES = ["CALL_CREATED", "CALL_ACKNOWLEDGED", "CALL_ENDED"];

const listCommonValidation = [
  query("doctorId").optional().isMongoId().withMessage("doctorId must be a valid mongo id"),
  query("hospitalId").optional().isMongoId().withMessage("hospitalId must be a valid mongo id"),
  query("search").optional().isString().withMessage("search must be a string"),
  query("date")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("date must be in YYYY-MM-DD format"),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
  query("sort").optional().isString().withMessage("sort must be a string"),
];

const createMessageTemplateValidation = [
  body("label")
    .trim()
    .notEmpty()
    .withMessage("label is required")
    .bail()
    .isLength({ max: 120 })
    .withMessage("label must be at most 120 characters"),
];

const updateMessageTemplateValidation = [
  param("templateId").isMongoId().withMessage("templateId must be a valid mongo id"),
  ...createMessageTemplateValidation,
];

const deleteMessageTemplateValidation = [
  param("templateId").isMongoId().withMessage("templateId must be a valid mongo id"),
];

const CALL_PRIORITIES = ["routine", "priority", "critical"];

const createCallValidation = [
  body("hospitalId").isMongoId().withMessage("hospitalId must be a valid mongo id"),
  body("messageId")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("messageId must be between 1 and 120 characters"),
  body("messageLabel")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("messageLabel must be between 1 and 120 characters"),
  body("priority")
    .optional()
    .trim()
    .isIn(CALL_PRIORITIES)
    .withMessage("priority must be one of routine, priority, critical"),
];

const acknowledgeCallValidation = [
  param("callId").isMongoId().withMessage("callId must be a valid mongo id"),
];

const endCallValidation = [
  param("callId").isMongoId().withMessage("callId must be a valid mongo id"),
  body("finalStatus")
    .optional()
    .trim()
    .isIn(CALL_FINAL_STATUSES)
    .withMessage("finalStatus must be one of completed, cancelled, missed"),
  body("endedBy")
    .optional()
    .trim()
    .isIn(["doctor", "hospital", "system"])
    .withMessage("endedBy must be one of doctor, hospital, system"),
];

const listCallLogsValidation = [
  ...listCommonValidation,
  query("finalStatus")
    .optional()
    .trim()
    .isIn(CALL_FINAL_STATUSES)
    .withMessage("finalStatus must be one of completed, cancelled, missed"),
];

const listCallEventsValidation = [
  ...listCommonValidation,
  query("eventType")
    .optional()
    .trim()
    .isIn(CALL_EVENT_TYPES)
    .withMessage("eventType must be one of CALL_CREATED, CALL_ACKNOWLEDGED, CALL_ENDED"),
];

module.exports = {
  createMessageTemplateValidation,
  updateMessageTemplateValidation,
  deleteMessageTemplateValidation,
  createCallValidation,
  acknowledgeCallValidation,
  endCallValidation,
  listCallLogsValidation,
  listCallEventsValidation,
  listCommonValidation,
};
