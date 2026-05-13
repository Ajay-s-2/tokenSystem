const mongoose = require("mongoose");

const CallSessionSchema = new mongoose.Schema(
  {
    doctorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hospitalUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    messageId: {
      type: String,
      required: true,
      trim: true,
    },
    messageLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    priority: {
      type: String,
      enum: ["routine", "priority", "critical"],
      default: "routine",
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ACKNOWLEDGED", "COMPLETED", "CANCELLED", "MISSED"],
      default: "ACTIVE",
      trim: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
      index: true,
    },
    endedBy: {
      type: String,
      enum: ["doctor", "hospital", "system", null],
      default: null,
      trim: true,
    },
    durationMs: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

CallSessionSchema.index({ doctorUserId: 1, status: 1 });
CallSessionSchema.index({ hospitalId: 1, status: 1, startedAt: -1 });
CallSessionSchema.index({ doctorUserId: 1, startedAt: -1 });

module.exports = mongoose.model("CallSession", CallSessionSchema);
