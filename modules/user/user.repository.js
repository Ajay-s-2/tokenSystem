const User = require("./user.model");
const {
  ROLES,
  LOGIN_STATUS,
  ONBOARDING_STATUS,
} = require("../../shared/utils/constants");

const createUser = async (payload) => User.create(payload);

const findByEmail = async (email) => User.findOne({ email: email.toLowerCase() });

const findById = async (id) => User.findById(id);

const updateById = async (id, payload) =>
  User.findByIdAndUpdate(id, payload, { new: true });

const deleteById = async (id) => User.findByIdAndDelete(id);

const countByDepartmentId = async (departmentId) => User.countDocuments({ departmentId });

const updateManyByDepartmentId = async (departmentId, payload) =>
  User.updateMany({ departmentId }, payload);

const findApprovedDoctorByDepartmentId = async (departmentId) =>
  User.findOne({
    role: ROLES.DOCTOR,
    departmentId,
    loginStatus: LOGIN_STATUS.APPROVED,
    onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
    isEmailVerified: true,
  }).sort({ createdAt: 1 });

module.exports = {
  createUser,
  findByEmail,
  findById,
  updateById,
  deleteById,
  countByDepartmentId,
  updateManyByDepartmentId,
  findApprovedDoctorByDepartmentId,
};
