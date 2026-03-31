const { sendError } = require("../shared/utils/response.util");

// Central error handler so unexpected errors return clean JSON
const errorMiddleware = (err, req, res, next) => {
  if (!err) return next();

  console.error("Unhandled error:", err);

  const status = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return sendError(res, message, status);
};

module.exports = errorMiddleware;
