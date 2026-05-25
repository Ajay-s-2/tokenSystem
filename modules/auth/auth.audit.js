const logService = require("../log/log.service");

const captureAuthAudit = async ({
  type = "info",
  message,
  req = null,
  user = null,
  data = null,
  statusCode = null,
}) => {
  try {
    await logService.createLog(
      {
        type,
        message,
        source: "auth",
        origin: "backend",
        data,
      },
      {
        userId: user?._id || user?.id || req?.user?.id || null,
        userRole: user?.role || req?.user?.role || null,
        requestMethod: req?.method || null,
        requestPath: req?.originalUrl || req?.path || null,
        statusCode,
        ipAddress: req?.ip || null,
        userAgent: req?.get ? req.get("user-agent") : null,
      }
    );
  } catch {
    return null;
  }

  return null;
};

module.exports = {
  captureAuthAudit,
};
