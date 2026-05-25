const crypto = require("crypto");
const { getConfig } = require("../../config/env");
const { constantTimeEquals, sha256 } = require("../utils/crypto.util");

const generateOtpCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

const generateOtp = () => {
  const config = getConfig();
  const token = generateOtpCode();
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

  return {
    token,
    hash: sha256(token),
    expiresAt,
  };
};

const verifyOtp = (token, otpHash, expiresAt, attempts = 0) => {
  const config = getConfig();

  if (!otpHash) {
    return { valid: false, reason: "OTP not generated" };
  }

  if (attempts >= config.otpMaxAttempts) {
    return { valid: false, reason: "Too many invalid OTP attempts" };
  }

  if (!expiresAt || Date.now() > new Date(expiresAt).getTime()) {
    return { valid: false, reason: "OTP expired" };
  }

  const incomingHash = sha256(token);
  if (!constantTimeEquals(incomingHash, otpHash)) {
    return { valid: false, reason: "Invalid OTP" };
  }

  return { valid: true };
};

module.exports = {
  generateOtp,
  verifyOtp,
};
