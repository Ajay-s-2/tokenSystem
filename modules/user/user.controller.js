const userService = require("./user.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");
const { getRequestLanguage } = require("../../shared/utils/localization.util");

const updateMyDepartment = async (req, res) => {
  try {
    const data = await userService.updateMyDepartment(req.user.id, req.body.departmentId);
    return sendSuccess(res, "Department updated", data);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  updateMyDepartment,
  getMe: async (req, res) => {
    try {
      const data = await userService.getMe(req.user.id, getRequestLanguage(req));
      return sendSuccess(res, "User profile fetched", data);
    } catch (error) {
      return sendError(res, error.message, error.statusCode || 400);
    }
  },
};
