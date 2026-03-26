const departmentService = require("./department.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const createDepartment = async (req, res) => {
  try {
    const department = await departmentService.createDepartment(req.body, req.user.id);

    return sendSuccess(
      res,
      "Department created",
      {
        id: department._id,
        name: department.departmentName,
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getDepartments();
    return sendSuccess(res, "Departments fetched successfully", departments);
  } catch (error) {
    return sendError(res, error.message || "Internal server error", error.statusCode || 500);
  }
};

const updateDepartment = async (req, res) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body);

    return sendSuccess(res, "Department updated", {
      id: department._id,
      name: department.departmentName,
    });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const department = await departmentService.deleteDepartment(req.params.id);

    return sendSuccess(res, "Department deleted", {
      id: department._id,
      name: department.departmentName,
    });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
};
