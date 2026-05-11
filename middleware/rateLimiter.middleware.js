const rateLimit = require("express-rate-limit");
const { sendError } = require("../shared/utils/response.util");

const buildRateLimitHandler = (errorCode) => (req, res) =>
  sendError(
    res,
    "Too many requests. Please try again later.",
    429,
    null,
    errorCode
  );

const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE || 300),
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler("RATE_LIMITED"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_PER_15_MINUTES || 25),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: buildRateLimitHandler("AUTH_RATE_LIMITED"),
});

const logLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.LOG_RATE_LIMIT_PER_MINUTE || 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildRateLimitHandler("LOG_RATE_LIMITED"),
});

module.exports = {
  globalApiLimiter,
  authLimiter,
  logLimiter,
};
