const { validationResult } = require("express-validator");
const { sendError } = require("../shared/utils/response.util");

const validationMiddleware = (req, res, next) => {
  const validation = validationResult(req);

  if (validation.isEmpty()) {
    return next();
  }

  const errors = validation.array().map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  return sendError(res, "Validation failed", 422, errors);
};

module.exports = validationMiddleware;
