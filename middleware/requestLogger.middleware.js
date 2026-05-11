const { logger } = require("../shared/utils/logger.util");

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info(
      {
        req: {
          method: req.method,
          path: req.originalUrl || req.url,
          ip: req.ip,
          userAgent: req.get("user-agent"),
          userId: req.user?.id || null,
          userRole: req.user?.role || null,
        },
        res: {
          statusCode: res.statusCode,
        },
        durationMs: Date.now() - startedAt,
      },
      "HTTP request completed"
    );
  });

  next();
};

module.exports = requestLogger;
