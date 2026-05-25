const crypto = require("crypto");
const { CSRF_COOKIE_NAME, getCsrfCookieOptions } = require("../shared/utils/cookie.util");
const { sendError } = require("../shared/utils/response.util");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = ["/api/logs"];

const ensureCsrfCookie = (req, res) => {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (existing) {
    return existing;
  }

  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  req.cookies[CSRF_COOKIE_NAME] = token;
  return token;
};

const csrfTokenMiddleware = (req, res, next) => {
  req.csrfToken = () => ensureCsrfCookie(req, res);
  ensureCsrfCookie(req, res);
  return next();
};

const csrfProtectionMiddleware = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (CSRF_EXEMPT_PATHS.some((path) => (req.originalUrl || req.path || "").startsWith(path))) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || String(cookieToken) !== String(headerToken)) {
    return sendError(res, "Invalid CSRF token", 403, null, "CSRF_INVALID");
  }

  return next();
};

module.exports = {
  csrfTokenMiddleware,
  csrfProtectionMiddleware,
};
