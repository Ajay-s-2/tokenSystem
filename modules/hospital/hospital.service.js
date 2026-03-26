const mongoose = require("mongoose");
const Hospital = require("./hospital.model");
const Department = require("../department/department.model");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const mapHospital = (hospital) => ({
  id: hospital._id,
  name: hospital.name,
  departmentId: hospital.departmentId?._id || null,
  departmentName: hospital.departmentId?.departmentName || null,
});

const getHospitalById = async (hospitalId) => {
  if (!mongoose.isValidObjectId(hospitalId)) {
    throw createError("Invalid hospital id", 400);
  }

  const hospital = await Hospital.findById(hospitalId)
    .populate("departmentId", "departmentName")
    .lean();

  if (!hospital) {
    throw createError("Hospital user not found", 404);
  }

  return mapHospital(hospital);
};

const updateHospitalDepartment = async (hospitalId, departmentId) => {
  if (!mongoose.isValidObjectId(hospitalId)) {
    throw createError("Invalid hospital id", 400);
  }

  if (!departmentId) {
    throw createError("Department ID is required", 400);
  }

  if (!mongoose.isValidObjectId(departmentId)) {
    throw createError("Invalid department id", 400);
  }

  const department = await Department.findById(departmentId).lean();
  if (!department) {
    throw createError("Department not found", 404);
  }

  const hospital = await Hospital.findByIdAndUpdate(
    hospitalId,
    { departmentId: department._id },
    { new: true }
  )
    .populate("departmentId", "departmentName")
    .lean();

  if (!hospital) {
    throw createError("Hospital user not found", 404);
  }

  return mapHospital(hospital);
};

module.exports = {
  getHospitalById,
  updateHospitalDepartment,
};
