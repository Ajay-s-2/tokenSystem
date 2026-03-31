const departmentService = require("../department/department.service");
const userRepository = require("./user.repository");

const updateMyDepartment = async (userId, departmentId) => {
  if (!departmentId) {
    throw new Error("Department ID is required");
  }

  const department = await departmentService.validateDepartment(departmentId);
  const user = await userRepository.updateById(userId, {
    departmentId: department.departmentId,
    departmentName: department.departmentName,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user._id,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
  };
};

module.exports = {
  updateMyDepartment,
};
