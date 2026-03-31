const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema(
  {
    departmentId: { type: String, required: true, unique: true, trim: true },
    departmentName: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", DepartmentSchema);
