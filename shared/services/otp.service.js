const OTPAuth = require("otpauth");
const { OTP_EXPIRY_MINUTES } = require("../utils/constants");

const buildSecret = (secretValue) => {
  if (!secretValue) return null;
  if (secretValue instanceof OTPAuth.Secret) return secretValue;

  if (OTPAuth.Secret.fromB32) return OTPAuth.Secret.fromB32(secretValue);
  if (OTPAuth.Secret.fromBase32) return OTPAuth.Secret.fromBase32(secretValue);
  if (OTPAuth.Secret.fromString) return OTPAuth.Secret.fromString(secretValue);

  return new OTPAuth.Secret({ base32: secretValue });
};

const generateOtp = () => {
  const secret = OTPAuth.Secret.generate();

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
