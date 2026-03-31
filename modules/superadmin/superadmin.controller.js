const superAdminService = require("./superadmin.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const createAdmin = async (req, res) => {
  try {
    const admin = await superAdminService.createAdmin(req.body);
    return sendSuccess(res, "Admin created", { id: admin._id }, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const admin = await superAdminService.deleteAdmin(req.params.id);
    return sendSuccess(res, "Admin deleted", { id: admin._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  createAdmin,
  deleteAdmin,
};
