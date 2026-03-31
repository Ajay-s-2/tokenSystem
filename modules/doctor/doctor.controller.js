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

const getDoctorById = async (req, res) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);
    return sendSuccess(res, "Doctor fetched successfully", doctor);
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

module.exports = {
  createDoctor,
  getDoctorById,
  selectHospital,
};
