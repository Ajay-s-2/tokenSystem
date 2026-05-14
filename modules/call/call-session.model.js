const mongoose = require("mongoose");
const { logger } = require("../../shared/utils/logger.util");

const ACTIVE_CALL_STATUSES = ["ACTIVE", "ACKNOWLEDGED"];
const LEGACY_DOCTOR_ACTIVE_INDEX = "doctorUserId_1_status_1";
const ACTIVE_CALL_DUPLICATE_GUARD_INDEX = "doctorUserId_1_hospitalId_1_messageId_1_status_1";

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

CallSessionSchema.index(
  { doctorUserId: 1, hospitalId: 1, messageId: 1, status: 1 },
  {
    name: ACTIVE_CALL_DUPLICATE_GUARD_INDEX,
    unique: true,
    partialFilterExpression: {
      status: { $in: ACTIVE_CALL_STATUSES },
    },
  }
);
CallSessionSchema.index({ hospitalId: 1, status: 1, startedAt: -1 });
CallSessionSchema.index({ doctorUserId: 1, startedAt: -1 });

const CallSession = mongoose.model("CallSession", CallSessionSchema);

async function ensureCallSessionIndexes() {
  const indexes = await CallSession.collection.indexes();
  const legacyIndex = indexes.find((index) => index.name === LEGACY_DOCTOR_ACTIVE_INDEX && index.unique);

  if (legacyIndex) {
    await CallSession.collection.dropIndex(LEGACY_DOCTOR_ACTIVE_INDEX);
    logger.info({ index: LEGACY_DOCTOR_ACTIVE_INDEX }, "Dropped legacy call-session unique index");
  }

  const duplicateGuardIndex = indexes.find((index) => index.name === ACTIVE_CALL_DUPLICATE_GUARD_INDEX);
  if (!duplicateGuardIndex) {
    await CallSession.collection.createIndex(
      { doctorUserId: 1, hospitalId: 1, messageId: 1, status: 1 },
      {
        name: ACTIVE_CALL_DUPLICATE_GUARD_INDEX,
        unique: true,
        partialFilterExpression: {
          status: { $in: ACTIVE_CALL_STATUSES },
        },
      }
    );
    logger.info({ index: ACTIVE_CALL_DUPLICATE_GUARD_INDEX }, "Created active-call duplicate guard index");
  }
}

module.exports = CallSession;
module.exports.ensureCallSessionIndexes = ensureCallSessionIndexes;
