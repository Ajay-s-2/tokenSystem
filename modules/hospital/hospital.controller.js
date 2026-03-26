const hospitalService = require("./hospital.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const getHospitalById = async (req, res) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    return sendSuccess(res, "Hospital user fetched successfully", hospital);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message || "Internal server error", statusCode);
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
    return sendError(res, error.message || "Internal server error", statusCode);
  }
};

module.exports = {
  getHospitalById,
  updateHospitalDepartment,
};
