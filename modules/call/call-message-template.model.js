const mongoose = require("mongoose");

const CallMessageTemplateSchema = new mongoose.Schema(
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
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

CallMessageTemplateSchema.index({ doctorUserId: 1, sortOrder: 1 });

module.exports = mongoose.model("CallMessageTemplate", CallMessageTemplateSchema);
