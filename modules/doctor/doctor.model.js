const mongoose = require("mongoose");
const { APPROVAL_STATUS } = require("../../shared/utils/constants");

const DoctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    bloodGroup: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    department: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },
    selectedHospitals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
      },
    ],
    approvedHospitals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", DoctorSchema);
