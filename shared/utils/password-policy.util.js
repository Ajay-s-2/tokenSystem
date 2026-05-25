const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialCharacter: true,
});

const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";

const hasUppercase = (value) => /[A-Z]/.test(value);
const hasLowercase = (value) => /[a-z]/.test(value);
const hasNumber = (value) => /\d/.test(value);
const hasSpecialCharacter = (value) => /[^A-Za-z0-9]/.test(value);

const isPasswordStrong = (password) => {
  const value = String(password || "");
  return (
    value.length >= PASSWORD_POLICY.minLength &&
    (!PASSWORD_POLICY.requireUppercase || hasUppercase(value)) &&
    (!PASSWORD_POLICY.requireLowercase || hasLowercase(value)) &&
    (!PASSWORD_POLICY.requireNumber || hasNumber(value)) &&
    (!PASSWORD_POLICY.requireSpecialCharacter || hasSpecialCharacter(value))
  );
};

module.exports = {
  PASSWORD_POLICY,
  PASSWORD_POLICY_MESSAGE,
  isPasswordStrong,
};
