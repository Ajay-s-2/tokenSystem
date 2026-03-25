const OTPAuth = require("otpauth");
const crypto = require("crypto");
const { OTP_EXPIRY_MINUTES } = require("../utils/constants");

const buildSecret = (secretValue) => {
  if (!secretValue) return null;
  if (secretValue instanceof OTPAuth.Secret) return secretValue;

  if (OTPAuth.Secret.fromBase32) return OTPAuth.Secret.fromBase32(secretValue);
  if (OTPAuth.Secret.fromHex) return OTPAuth.Secret.fromHex(secretValue);

  return new OTPAuth.Secret({ base32: secretValue });
};

const generateOtp = () => {
  // OTPAuth v9 does not provide Secret.generate(), so generate random bytes manually
  const randomBytes = crypto.randomBytes(20); // 160-bit secret
  const secret = OTPAuth.Secret.fromHex(randomBytes.toString("hex"));

  const totp = new OTPAuth.TOTP({
    issuer: "HospitalToken",
    label: "Auth",
    algorithm: "SHA1",
    digits: 6,
    period: OTP_EXPIRY_MINUTES * 60,
    secret,
  });

  const token = totp.generate();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  return {
    token,
    secret: secret.base32,
    expiresAt,
  };
};

const verifyOtp = (token, secretValue, expiresAt) => {
  if (!secretValue) {
    return { valid: false, reason: "OTP not generated" };
  }

  if (expiresAt && Date.now() > new Date(expiresAt).getTime()) {
    return { valid: false, reason: "OTP expired" };
  }

  const secret = buildSecret(secretValue);
  if (!secret) {
    return { valid: false, reason: "OTP secret missing" };
  }

  const totp = new OTPAuth.TOTP({
    issuer: "HospitalToken",
    label: "Auth",
    algorithm: "SHA1",
    digits: 6,
    period: OTP_EXPIRY_MINUTES * 60,
    secret,
  });

  const delta = totp.validate({ token, window: 0 });
  return { valid: delta !== null };
};

module.exports = { generateOtp, verifyOtp };
