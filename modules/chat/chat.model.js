const mongoose = require("mongoose");

const CHAT_SENDER_ROLES = ["doctor", "hospital"];
const CHAT_MESSAGE_TYPES = ["quick", "manual"];

const ChatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    doctorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hospitalUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: CHAT_SENDER_ROLES,
      required: true,
    },
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: CHAT_MESSAGE_TYPES,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ doctorId: 1, hospitalId: 1, createdAt: -1 });
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = {
  ChatMessage: mongoose.model("ChatMessage", ChatMessageSchema),
  CHAT_SENDER_ROLES,
  CHAT_MESSAGE_TYPES,
};
