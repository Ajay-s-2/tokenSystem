const ROLES = Object.freeze({
  DOCTOR: "doctor",
  HOSPITAL: "hospital",
  COMMON_USER: "common_user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
});

const LOGIN_STATUS = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
});

const APPROVAL_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const ONBOARDING_STATUS = Object.freeze({
  NOT_ONBOARDED: "NOT_ONBOARDED",
  ONBOARDED: "ONBOARDED",
});

const OTP_EXPIRY_MINUTES = 5;
const DEFAULT_SUBSCRIPTION_AMOUNT = 500;

module.exports = {
  ROLES,
  LOGIN_STATUS,
  APPROVAL_STATUS,
  ONBOARDING_STATUS,
  OTP_EXPIRY_MINUTES,
  DEFAULT_SUBSCRIPTION_AMOUNT,
};
