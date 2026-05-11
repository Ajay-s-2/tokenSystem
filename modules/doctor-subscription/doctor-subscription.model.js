const mongoose = require("mongoose");

const DoctorSubscriptionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
    },
    ratePerHospital: { type: Number, required: true, min: 500, default: 500 },
  },
  { timestamps: true, collection: "doctor_subscriptions" }
);

module.exports = mongoose.model("DoctorSubscription", DoctorSubscriptionSchema);
