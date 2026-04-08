const doctorService = require("./doctor.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const createDoctor = async (req, res) => {
  try {
    const doctor = await doctorService.createDoctorProfile(req.body, req.user);
    return sendSuccess(res, "Doctor profile created successfully", doctor, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const listDoctors = async (req, res) => {
  try {
    const doctors = await doctorService.listApprovedDoctorsForHospitalUser(req.user);
    return sendSuccess(res, "Approved doctors fetched successfully", doctors);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const getDoctorById = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);
    return sendSuccess(res, "Doctor fetched successfully", doctor);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const getDoctorSubscriptionSummary = async (req, res) => {
  try {
    const summary = await doctorService.getDoctorSubscriptionSummary({
      doctorId: req.params.id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Doctor subscription summary fetched successfully", summary);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const selectHospital = async (req, res) => {
  try {
    const doctor = await doctorService.selectHospital({
      doctorId: req.params.id,
      hospitalId: req.body.hospitalId,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Hospital selected successfully", doctor);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const removeHospitalSelection = async (req, res) => {
  try {
    const doctor = await doctorService.removeHospitalSelection({
      doctorId: req.params.id,
      hospitalId: req.params.hospitalId,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });

    return sendSuccess(res, "Hospital selection removed successfully", doctor);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

module.exports = {
  createDoctor,
  listDoctors,
  getDoctorById,
  getDoctorSubscriptionSummary,
  removeHospitalSelection,
  selectHospital,
};
