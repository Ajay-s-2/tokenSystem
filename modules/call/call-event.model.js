const mongoose = require("mongoose");

const CallEventSchema = new mongoose.Schema(
  {
    callSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CallSession",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["CALL_CREATED", "CALL_ACKNOWLEDGED", "CALL_ENDED"],
      required: true,
      trim: true,
      index: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      trim: true,
      default: null,
    },
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
      required: true,
      trim: true,
    },
    callStatus: {
      type: String,
      enum: ["ACTIVE", "ACKNOWLEDGED", "COMPLETED", "CANCELLED", "MISSED"],
      required: true,
      trim: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

CallEventSchema.index({ hospitalId: 1, createdAt: -1 });
CallEventSchema.index({ doctorUserId: 1, createdAt: -1 });
CallEventSchema.index({ callSessionId: 1, createdAt: 1 });

module.exports = mongoose.model("CallEvent", CallEventSchema);
