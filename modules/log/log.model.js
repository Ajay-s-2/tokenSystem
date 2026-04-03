const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["info", "success", "warn", "error"],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    origin: {
      type: String,
      enum: ["frontend", "backend", "system"],
      default: "frontend",
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    userRole: {
      type: String,
      default: null,
      index: true,
    },
    requestMethod: {
      type: String,
      trim: true,
      default: null,
    },
    requestPath: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    statusCode: {
      type: Number,
      default: null,
      min: 100,
      max: 599,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

LogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Log", LogSchema);
