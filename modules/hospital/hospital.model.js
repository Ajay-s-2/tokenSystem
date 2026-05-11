const mongoose = require("mongoose");
const { APPROVAL_STATUS } = require("../../shared/utils/constants");

const HospitalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    departments: [{ type: String, trim: true }],
    translations: {
      name: { type: mongoose.Schema.Types.Mixed, default: null },
      location: { type: mongoose.Schema.Types.Mixed, default: null },
      departments: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },
    subscriptionAmount: { type: Number, min: 0, default: null },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
  },
  { timestamps: true }
);

HospitalSchema.index({ status: 1, createdAt: -1 });
HospitalSchema.index({ departmentId: 1 });
HospitalSchema.index({ name: 1 });

module.exports = mongoose.model("Hospital", HospitalSchema);
