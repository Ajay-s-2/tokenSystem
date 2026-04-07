const mongoose = require("mongoose");

const HospitalDoctorDepartmentAssignmentSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
  },
  { timestamps: true, collection: "hospital_doctor_department_assignments" }
);

HospitalDoctorDepartmentAssignmentSchema.index(
  { hospitalId: 1, doctorId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "HospitalDoctorDepartmentAssignment",
  HospitalDoctorDepartmentAssignmentSchema
);
