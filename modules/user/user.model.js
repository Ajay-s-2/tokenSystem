const mongoose = require("mongoose");
const { ROLES, LOGIN_STATUS, ONBOARDING_STATUS } = require("../../shared/utils/constants");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    gender: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
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
    isEmailVerified: { type: Boolean, default: false },
    otpSecret: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
