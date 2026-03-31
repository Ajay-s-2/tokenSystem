const userService = require("./user.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

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
};
