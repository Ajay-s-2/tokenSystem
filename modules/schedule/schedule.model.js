const mongoose = require("mongoose");

const ScheduleSlotSchema = new mongoose.Schema(
  {
    time: { type: String, required: true, trim: true },
    isBooked: { type: Boolean, default: false },
    patientTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientToken",
      default: null,
    },
  },
  { _id: false }
);

const DoctorScheduleSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
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
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    consultationTime: { type: Number, required: true, min: 1 },
    slots: {
      type: [ScheduleSlotSchema],
      default: [],
    },
  },
  { timestamps: true }
);

DoctorScheduleSchema.index(
  { hospitalId: 1, doctorId: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

module.exports = mongoose.model("DoctorSchedule", DoctorScheduleSchema);
