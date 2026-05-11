const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const WEAK_SECRET_VALUES = new Set([
  "changeme",
  "change_me",
  "replace_with_strong_secret",
  "ChangeThisJwtSecretForDevelopment123!",
]);

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getConfig = () => ({
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  port: toInt(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 10),
  enableApiDocs:
    process.env.ENABLE_API_DOCS === "true" ||
    (!IS_PRODUCTION && process.env.ENABLE_API_DOCS !== "false"),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "100kb",
  urlEncodedBodyLimit: process.env.URL_ENCODED_BODY_LIMIT || "100kb",
  logDevOtp: !IS_PRODUCTION && process.env.DEV_LOG_OTP !== "false",
});

const getConfigIssues = () => {
  const issues = [];

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      issues.push(`${key} is required`);
    }
  }

  const jwtSecret = process.env.JWT_SECRET || "";
  if (jwtSecret && (jwtSecret.length < 32 || WEAK_SECRET_VALUES.has(jwtSecret))) {
    issues.push("JWT_SECRET must be a strong random value of at least 32 characters");
  }

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
