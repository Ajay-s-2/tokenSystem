const User = require("../user/user.model");
const Doctor = require("../doctor/doctor.model");
const Hospital = require("../hospital/hospital.model");
const subscriptionService = require("../subscription/subscription.service");
const userRepository = require("../user/user.repository");
const { LOGIN_STATUS, ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");
const {
  getLoginStatusFromApprovalStatus,
  getApprovalStatusFromLoginStatus,
} = require("../../shared/utils/status.util");
const { parsePagination, buildSort } = require("../../shared/utils/query.util");

const ADMIN_LIST_SORT_FIELDS = ["createdAt", "updatedAt", "name", "email", "loginStatus"];

const normalizeAdminSort = (sort) =>
  String(sort || "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .map((field) => (field === "status" ? "loginStatus" : field === "-status" ? "-loginStatus" : field))
    .join(",");

const mapAdminEntity = (user, profile = null) => ({
  id: profile?._id || user._id,
  userId: user._id,
  profileId: profile?._id || null,
  name: profile?.name || user.name,
  email: user.email,
  role: user.role,
  status: profile?.status || getApprovalStatusFromLoginStatus(user.loginStatus),
  phone: profile?.phone || null,
  department: profile?.department || null,
  location: profile?.location || null,
  departments: profile?.departments || [],
  subscription_amount: profile?.subscriptionAmount ?? null,
  createdAt: profile?.createdAt || user.createdAt,
  updatedAt: profile?.updatedAt || user.updatedAt,
});

const listEntitiesByRole = async ({ role, profileModel, query }) => {
  const filters = { role };
  const loginStatus = getLoginStatusFromApprovalStatus(query.status);

  if (query.status) {
    filters.loginStatus = loginStatus;
  }

  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(normalizeAdminSort(query.sort), ADMIN_LIST_SORT_FIELDS, {
    createdAt: -1,
  });

  const [users, total] = await Promise.all([
    User.find(filters).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filters),
  ]);

  const userIds = users.map((user) => user._id);
  const profiles = await profileModel.find({ userId: { $in: userIds } }).lean();
  const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));

  return {
    items: users.map((user) => mapAdminEntity(user, profileMap.get(String(user._id)))),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const resolveEntityAndProfile = async ({ id, role, profileModel }) => {
  let profile = await profileModel.findById(id);
  let user = null;

  if (profile) {
    user = await User.findOne({ _id: profile.userId, role });
  } else {
    user = await User.findOne({ _id: id, role });
    if (user) {
      profile = await profileModel.findOne({ userId: user._id });
    }
  }

  if (!user) {
    throw createHttpError(404, `${role.charAt(0).toUpperCase() + role.slice(1)} not found`);
  }

  return { user, profile };
};

const updateEntityStatus = async ({ id, status, role, profileModel }) => {
  const loginStatus = getLoginStatusFromApprovalStatus(status);
  if (!loginStatus) {
    throw createHttpError(400, "Invalid status value");
  }

  const { user, profile } = await resolveEntityAndProfile({ id, role, profileModel });

  user.loginStatus = loginStatus;
  await user.save();

  if (profile) {
    profile.status = status;
    await profile.save();
  }

  return mapAdminEntity(user.toObject(), profile ? profile.toObject() : null);
};

const approveUser = async (userId) => {
  const user = await userRepository.updateById(userId, {
    loginStatus: LOGIN_STATUS.APPROVED,
  });
  if (!user) throw createHttpError(404, "User not found");

  if (user.role === ROLES.DOCTOR) {
    await Doctor.updateOne({ userId: user._id }, { status: "approved" });
  }

  if (user.role === ROLES.HOSPITAL) {
    await Hospital.updateOne({ userId: user._id }, { status: "approved" });
  }

  return user;
};

const rejectUser = async (userId) => {
  const user = await userRepository.updateById(userId, {
    loginStatus: LOGIN_STATUS.REJECTED,
  });
  if (!user) throw createHttpError(404, "User not found");

  if (user.role === ROLES.DOCTOR) {
    await Doctor.updateOne({ userId: user._id }, { status: "rejected" });
  }

  if (user.role === ROLES.HOSPITAL) {
    await Hospital.updateOne({ userId: user._id }, { status: "rejected" });
  }

  return user;
};

const onboardUser = async (userId) => {
  const user = await userRepository.updateById(userId, {
    onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
  });
  if (!user) throw createHttpError(404, "User not found");
  return user;
};

const deleteUser = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw createHttpError(404, "User not found");

  await Promise.all([
    userRepository.deleteById(userId),
    Doctor.deleteOne({ userId }),
    Hospital.deleteOne({ userId }),
  ]);

  return user;
};

const getDoctors = async (query) =>
  listEntitiesByRole({
    role: ROLES.DOCTOR,
    profileModel: Doctor,
    query,
  });

const getHospitals = async (query) =>
  listEntitiesByRole({
    role: ROLES.HOSPITAL,
    profileModel: Hospital,
    query,
  });

const updateDoctorStatus = async (id, status) =>
  updateEntityStatus({
    id,
    status,
    role: ROLES.DOCTOR,
    profileModel: Doctor,
  });

const updateHospitalStatus = async (id, status) =>
  updateEntityStatus({
    id,
    status,
    role: ROLES.HOSPITAL,
    profileModel: Hospital,
  });

const setDefaultSubscription = async (amount) =>
  subscriptionService.setDefaultSubscription(Number(amount));

const setHospitalSubscription = async ({ hospitalId, amount }) =>
  subscriptionService.setHospitalSubscription({
    hospitalId,
    amount: Number(amount),
  });

module.exports = {
  approveUser,
  rejectUser,
  onboardUser,
  deleteUser,
  getDoctors,
  getHospitals,
  updateDoctorStatus,
  updateHospitalStatus,
  setDefaultSubscription,
  setHospitalSubscription,
};
