const mongoose = require("mongoose");
const {
  ROLES,
  LOGIN_STATUS,
  ONBOARDING_STATUS,
} = require("../../shared/utils/constants");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, default: null },
    gender: { type: String, trim: true, default: null },
    specialization: { type: String, trim: true, default: null },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    departmentId: { type: String, trim: true, default: null },
    departmentName: { type: String, trim: true, default: null },
    loginStatus: {
      type: String,
      enum: Object.values(LOGIN_STATUS),
      default: LOGIN_STATUS.PENDING,
    },
    onboardingStatus: {
      type: String,
      enum: Object.values(ONBOARDING_STATUS),
      default: ONBOARDING_STATUS.NOT_ONBOARDED,
    },
    tokenVersion: { type: Number, default: 0, min: 0 },
    isEmailVerified: { type: Boolean, default: false },
    otpSecret: { type: String, default: null },
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0, min: 0 },
    otpLastSentAt: { type: Date, default: null },
    pendingEmail: { type: String, default: null, lowercase: true, trim: true },
    emailChangeOtpSecret: { type: String, default: null },
    emailChangeOtpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, loginStatus: 1, createdAt: -1 });
UserSchema.index({ departmentId: 1, role: 1, loginStatus: 1 });

module.exports = mongoose.model("User", UserSchema);
