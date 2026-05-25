const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];
const WEAK_SECRET_VALUES = new Set([
  "changeme",
  "change_me",
  "replace_with_strong_secret",
  "ChangeThisJwtSecretForDevelopment123!",
  "ChangeThisRefreshSecretForDevelopment123!",
]);

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return String(value).trim().toLowerCase() === "true";
};

const toDuration = (value, fallback) => {
  const normalized = String(value || fallback).trim();
  return normalized || fallback;
};

const getConfig = () => ({
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  port: toInt(process.env.PORT, 8000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiresIn: toDuration(process.env.JWT_ACCESS_EXPIRES_IN, "15m"),
  refreshTokenExpiresIn: toDuration(process.env.JWT_REFRESH_EXPIRES_IN, "7d"),
  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),
  enableApiDocs:
    toBoolean(process.env.ENABLE_API_DOCS) ||
    (!IS_PRODUCTION && process.env.ENABLE_API_DOCS !== "false"),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "100kb",
  urlEncodedBodyLimit: process.env.URL_ENCODED_BODY_LIMIT || "100kb",
  logDevOtp: !IS_PRODUCTION && process.env.DEV_LOG_OTP !== "false",
  logHttpRequests: IS_PRODUCTION || process.env.DEV_LOG_HTTP_REQUESTS === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || "",
  accessTokenCookieMaxAgeMs: toInt(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE_MS, 15 * 60 * 1000),
  refreshTokenCookieMaxAgeMs: toInt(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
  csrfCookieMaxAgeMs: toInt(process.env.CSRF_COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
  otpExpiryMinutes: toInt(process.env.OTP_EXPIRY_MINUTES, 5),
  otpMaxAttempts: toInt(process.env.OTP_MAX_ATTEMPTS, 5),
  otpResendCooldownSeconds: toInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60),
  authRateLimitPer15Minutes: toInt(process.env.AUTH_RATE_LIMIT_PER_15_MINUTES, 25),
  loginRateLimitPer15Minutes: toInt(process.env.LOGIN_RATE_LIMIT_PER_15_MINUTES, 10),
  otpRateLimitPer15Minutes: toInt(process.env.OTP_RATE_LIMIT_PER_15_MINUTES, 10),
  refreshRateLimitPer15Minutes: toInt(process.env.REFRESH_RATE_LIMIT_PER_15_MINUTES, 30),
  globalRateLimitPerMinute: toInt(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE, 300),
  logRateLimitPerMinute: toInt(process.env.LOG_RATE_LIMIT_PER_MINUTE, 60),
});

const validateSecret = (name, value, issues) => {
  const secret = String(value || "");
  if (!secret) {
    issues.push(`${name} is required`);
    return;
  }

  if (secret.length < 32 || WEAK_SECRET_VALUES.has(secret)) {
    issues.push(`${name} must be a strong random value of at least 32 characters`);
  }
};

const getConfigIssues = () => {
  const issues = [];

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      issues.push(`${key} is required`);
    }
  }

  validateSecret("JWT_SECRET", process.env.JWT_SECRET, issues);
  validateSecret("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET, issues);

  if (IS_PRODUCTION) {
    if (!process.env.CORS_ORIGIN) {
      issues.push("CORS_ORIGIN must be configured in production");
    }

    if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(",").some((origin) => origin.trim() === "*")) {
      issues.push("CORS_ORIGIN cannot include * when credentials are enabled");
    }

    if (!process.env.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD === "ChangeMe123!") {
      issues.push("SUPER_ADMIN_PASSWORD must be changed in production");
    }
  }

  return issues;
};

const validateStartupConfig = ({ logger } = {}) => {
  const issues = getConfigIssues();
  if (!issues.length) return;

  if (IS_PRODUCTION) {
    throw new Error(`Invalid production configuration: ${issues.join("; ")}`);
  }

  if (logger?.warn) {
    logger.warn({ issues }, "Development configuration warnings");
    return;
  }

  console.warn("Development configuration warnings:", issues);
};

module.exports = {
  getConfig,
  getConfigIssues,
  validateStartupConfig,
};
