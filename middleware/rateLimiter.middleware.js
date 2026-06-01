const rateLimit = require("express-rate-limit");
const { sendError } = require("../shared/utils/response.util");
const { getConfig } = require("../config/env");

const ipKeyGenerator = rateLimit.ipKeyGenerator || ((ip) => ip);

const buildRateLimitHandler = (errorCode) => (req, res) =>
  sendError(res, "Too many requests. Please try again later.", 429, null, errorCode);

const buildLimiter = ({ windowMs, limit, errorCode, skipSuccessfulRequests = false, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    handler: buildRateLimitHandler(errorCode),
  });

const config = getConfig();

const globalApiLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: config.globalRateLimitPerMinute,
  errorCode: "RATE_LIMITED",
});

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimitPer15Minutes,
  errorCode: "AUTH_RATE_LIMITED",
});

const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimitPer15Minutes,
  errorCode: "LOGIN_RATE_LIMITED",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return `${ipKeyGenerator(req.ip)}:${email || "unknown"}`;
  },
});

const otpLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: config.otpRateLimitPer15Minutes,
  errorCode: "OTP_RATE_LIMITED",
});

const refreshLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: config.refreshRateLimitPer15Minutes,
  errorCode: "REFRESH_RATE_LIMITED",
});

const logLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: config.logRateLimitPerMinute,
  errorCode: "LOG_RATE_LIMITED",
});

module.exports = {
  globalApiLimiter,
  authLimiter,
  loginLimiter,
  otpLimiter,
  refreshLimiter,
  logLimiter,
};
