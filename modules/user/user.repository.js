const User = require("./user.model");
const {
  ROLES,
  LOGIN_STATUS,
  ONBOARDING_STATUS,
} = require("../../shared/utils/constants");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const createUser = async (payload) => User.create(payload);

const findByEmail = async (email) => User.findOne({ email: normalizeEmail(email) });

const findById = async (id) => User.findById(id);

const findOne = async (query) => User.findOne(query);

const updateById = async (id, payload) =>
  User.findByIdAndUpdate(id, payload, { returnDocument: "after" });

const deleteById = async (id) => User.findByIdAndDelete(id);

const incrementTokenVersion = async (id) =>
  User.findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } }, { returnDocument: "after" });

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
  findOne,
  updateById,
  deleteById,
  incrementTokenVersion,
  countByDepartmentId,
  updateManyByDepartmentId,
  findApprovedDoctorByDepartmentId,
};
