const ROLES = Object.freeze({
  DOCTOR: "doctor",
  HOSPITAL_STAFF: "hospital_staff",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
});

const LOGIN_STATUS = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
});

const ONBOARDING_STATUS = Object.freeze({
  NOT_ONBOARDED: "NOT_ONBOARDED",
  ONBOARDED: "ONBOARDED",
});

const OTP_EXPIRY_MINUTES = 5;

module.exports = {
  ROLES,
  LOGIN_STATUS,
  ONBOARDING_STATUS,
  OTP_EXPIRY_MINUTES,
};
