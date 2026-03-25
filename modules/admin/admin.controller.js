const adminService = require("./admin.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const approveUser = async (req, res) => {
  try {
    const user = await adminService.approveUser(req.params.id);
    return sendSuccess(res, "User approved", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const rejectUser = async (req, res) => {
  try {
    const user = await adminService.rejectUser(req.params.id);
    return sendSuccess(res, "User rejected", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const onboardUser = async (req, res) => {
  try {
    const user = await adminService.onboardUser(req.params.id);
    return sendSuccess(res, "User onboarded", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await adminService.deleteUser(req.params.id);
    return sendSuccess(res, "User deleted", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  approveUser,
  rejectUser,
  onboardUser,
  deleteUser,
};
