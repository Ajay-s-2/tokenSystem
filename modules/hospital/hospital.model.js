const mongoose = require("mongoose");

const HospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hospital", HospitalSchema);
