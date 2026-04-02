const mongoose = require("mongoose");

const PatientTokenSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorSchedule",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    doctorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true, index: true },
    date: { type: String, required: true, trim: true, index: true },
    time: { type: String, required: true, trim: true },
    tokenNumber: { type: Number, required: true, min: 1 },
    patientName: { type: String, required: true, trim: true },
    dob: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, trim: true },
    aadhaar: { type: String, trim: true, default: "" },
    contact: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

PatientTokenSchema.index({ scheduleId: 1, time: 1 }, { unique: true });

module.exports = mongoose.model("PatientToken", PatientTokenSchema);
