const departmentService = require("../department/department.service");
const doctorService = require("../doctor/doctor.service");
const hospitalService = require("../hospital/hospital.service");
const userRepository = require("./user.repository");
const { ROLES } = require("../../shared/utils/constants");
const { getApprovalStatusFromLoginStatus } = require("../../shared/utils/status.util");
const { createHttpError } = require("../../shared/utils/error.util");

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
  getMe: async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw createHttpError(404, "User not found");
    }

    let profile = null;

    if (user.role === ROLES.DOCTOR) {
      try {
        profile = await doctorService.getDoctorById(user._id);
      } catch {
        profile = null;
      }
    } else if (user.role === ROLES.HOSPITAL) {
      try {
        profile = await hospitalService.getHospitalById(user._id);
      } catch {
        profile = null;
      }
    }

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        loginStatus: user.loginStatus,
        approvalStatus: getApprovalStatusFromLoginStatus(user.loginStatus),
        onboardingStatus: user.onboardingStatus,
        isEmailVerified: user.isEmailVerified,
        departmentId: user.departmentId,
        departmentName: user.departmentName,
      },
      profile,
    };
  },
};
