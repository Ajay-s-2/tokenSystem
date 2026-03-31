const hospitalService = require("./hospital.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const createHospital = async (req, res) => {
  try {
    const hospital = await hospitalService.createHospitalProfile(req.body, req.user);
    return sendSuccess(res, "Hospital profile created successfully", hospital, 201);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const getHospitalById = async (req, res) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    return sendSuccess(res, "Hospital fetched successfully", hospital);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message || "Internal server error", statusCode, error.errors || null);
  }
};

const listHospitals = async (req, res) => {
  try {
    const data = await hospitalService.listHospitals(req.query);
    return sendSuccess(res, "Hospitals fetched successfully", data);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message || "Internal server error", statusCode, error.errors || null);
  }
};

const updateHospitalDepartment = async (req, res) => {
  try {
    const hospital = await hospitalService.updateHospitalDepartment(
      req.params.id,
      req.body.departmentId
    );

    return sendSuccess(res, "Hospital department updated successfully", hospital);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message || "Internal server error", statusCode, error.errors || null);
  }
};

const getPendingDoctors = async (req, res) => {
  try {
    const data = await hospitalService.getPendingDoctors({
      hospitalId: req.params.id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Pending doctors fetched successfully", data);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const getApprovedDoctors = async (req, res) => {
  try {
    const data = await hospitalService.getApprovedDoctors({
      hospitalId: req.params.id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Approved doctors fetched successfully", data);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const approveDoctor = async (req, res) => {
  try {
    const doctor = await hospitalService.approveDoctor({
      hospitalId: req.params.id,
      doctorId: req.body.doctorId,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Doctor approved successfully", doctor);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const rejectDoctor = async (req, res) => {
  try {
    const doctor = await hospitalService.rejectDoctor({
      hospitalId: req.params.id,
      doctorId: req.body.doctorId,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Doctor rejected successfully", doctor);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

const getSubscription = async (req, res) => {
  try {
    const subscription = await hospitalService.getSubscription({
      hospitalId: req.params.id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Subscription fetched successfully", subscription);
  } catch (error) {
    return sendError(
      res,
      error.message || "Internal server error",
      error.statusCode || 500,
      error.errors || null
    );
  }
};

module.exports = {
  listHospitals,
  createHospital,
  getHospitalById,
  updateHospitalDepartment,
  getPendingDoctors,
  getApprovedDoctors,
  approveDoctor,
  rejectDoctor,
  getSubscription,
};
