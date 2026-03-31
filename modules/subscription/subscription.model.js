const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["default"],
      default: "default",
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, default: "INR" },
    interval: { type: String, trim: true, default: "month" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);
