const { body, param, query } = require("express-validator");

const doctorIdBody = body("doctorId")
  .isMongoId()
  .withMessage("Valid doctor id is required");

const hospitalIdBody = body("hospitalId")
  .isMongoId()
  .withMessage("Valid hospital id is required");

const doctorIdQuery = query("doctorId")
  .isMongoId()
  .withMessage("Valid doctor id is required");

const hospitalIdQuery = query("hospitalId")
  .isMongoId()
  .withMessage("Valid hospital id is required");

const conversationIdOptional = (target) =>
  target
    .optional()
    .isString()
    .withMessage("conversationId must be a string")
    .bail()
    .trim();

const createMessageValidation = [
  doctorIdBody,
  hospitalIdBody,
  body("message").trim().notEmpty().withMessage("message is required"),
  body("type")
    .isIn(["quick", "manual"])
    .withMessage("type must be quick or manual"),
  conversationIdOptional(body("conversationId")),
];

const listMessagesValidation = [
  doctorIdQuery,
  hospitalIdQuery,
  conversationIdOptional(query("conversationId")),
  query("status")
    .optional()
    .isIn(["read", "unread"])
    .withMessage("status must be read or unread"),
  query("search").optional().isString().withMessage("search must be a string"),
  query("sort").optional().isString().withMessage("sort must be a string"),
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1 }).withMessage("limit must be a positive integer"),
];

const updateMessageValidation = [
  param("id").isMongoId().withMessage("Valid message id is required"),
  body("message").trim().notEmpty().withMessage("message is required"),
];

const deleteMessageValidation = [
  param("id").isMongoId().withMessage("Valid message id is required"),
];

const markConversationReadValidation = [
  doctorIdBody,
  hospitalIdBody,
  conversationIdOptional(body("conversationId")),
];

const clearConversationValidation = [
  doctorIdBody,
  hospitalIdBody,
  conversationIdOptional(body("conversationId")),
];

module.exports = {
  createMessageValidation,
  listMessagesValidation,
  updateMessageValidation,
  deleteMessageValidation,
  markConversationReadValidation,
  clearConversationValidation,
};
