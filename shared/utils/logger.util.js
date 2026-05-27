const pino = require("pino");

const SENSITIVE_KEYS = new Set([
  "password",
  "confirmPassword",
  "token",
  "authorization",
  "jwt",
  "jwtSecret",
  "secret",
  "otp",
  "otpSecret",
  "emailChangeOtpSecret",
  "aadhaar",
  "patientName",
  "contact",
  "dob",
  "bloodGroup",
]);

const isProduction = process.env.NODE_ENV === "production";

const redactValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        SENSITIVE_KEYS.has(key) ? "[REDACTED]" : redactValue(entryValue),
      ])
    );
  }

  return value;
};

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "*.password",
      "*.confirmPassword",
      "*.token",
      "*.otp",
      "*.secret",
      "*.otpSecret",
      "*.emailChangeOtpSecret",
      "*.aadhaar",
      "*.patientName",
      "*.contact",
      "*.dob",
      "*.bloodGroup",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: process.env.SERVICE_NAME || "hospital-token-backend",
    env: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = {
  logger,
  redactValue,
};
