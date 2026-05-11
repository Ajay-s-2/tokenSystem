const { sendError } = require("../shared/utils/response.util");
const logService = require("../modules/log/log.service");
const { logger } = require("../shared/utils/logger.util");

// Central error handler so unexpected errors return clean JSON
const errorMiddleware = (err, req, res, next) => {
  if (!err) return next();

  const isProduction = process.env.NODE_ENV === "production";
  const status = err.statusCode || err.status || 500;
  const errorCode =
    err.errorCode ||
    (err.type === "entity.too.large" ? "PAYLOAD_TOO_LARGE" : "INTERNAL_ERROR");
  const message =
    isProduction && status >= 500
      ? "Internal server error"
      : err.message || "Internal server error";

  logger.error(
    {
      err: {
        message: err.message,
        stack: isProduction ? undefined : err.stack,
        statusCode: status,
        errorCode,
      },
      req: {
        method: req.method,
        path: req.originalUrl || req.path,
        userId: req.user?.id || null,
        userRole: req.user?.role || null,
      },
    },
    "Unhandled request error"
  );

  void logService.captureErrorLog(err, req);

  return sendError(res, message, status, err.errors || null, errorCode);
};

module.exports = errorMiddleware;
