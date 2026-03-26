const User = require("./user.model");

const createUser = async (payload) => User.create(payload);

const findByEmail = async (email) => User.findOne({ email: email.toLowerCase() });

const findById = async (id) => User.findById(id);

const updateById = async (id, payload) =>
  User.findByIdAndUpdate(id, payload, { new: true });

const deleteById = async (id) => User.findByIdAndDelete(id);

const countByDepartmentId = async (departmentId) => User.countDocuments({ departmentId });

const updateManyByDepartmentId = async (departmentId, payload) =>
  User.updateMany({ departmentId }, payload);

module.exports = {
  createUser,
  findByEmail,
  findById,
  updateById,
  deleteById,
  countByDepartmentId,
  updateManyByDepartmentId,
};
