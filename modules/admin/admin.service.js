const User = require("../user/user.model");
const Doctor = require("../doctor/doctor.model");
const Hospital = require("../hospital/hospital.model");
const subscriptionService = require("../subscription/subscription.service");
const DoctorSubscription = require("../doctor-subscription/doctor-subscription.model");
const userRepository = require("../user/user.repository");
const { LOGIN_STATUS, ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");
const otpService = require("../../shared/services/otp.service");
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
  gender: profile?.gender || user.gender || null,
  department: profile?.department || null,
  specialization: profile?.specialization || user.specialization || null,
  medicalRegistrationId: profile?.medicalRegistrationId || null,
  bloodGroup: profile?.bloodGroup || null,
  location: profile?.location || null,
  departments: profile?.departments || [],
  subscription_amount: profile?.subscriptionAmount ?? null,
  createdAt: profile?.createdAt || user.createdAt,
  updatedAt: profile?.updatedAt || user.updatedAt,
});

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const sanitizeString = (value) => {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed === "" ? undefined : trimmed;
};

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

const updateDoctorProfile = async (id, payload) => {
  const { user, profile } = await resolveEntityAndProfile({
    id,
    role: ROLES.DOCTOR,
    profileModel: Doctor,
  });

  if (!profile) {
    throw createHttpError(404, "Doctor profile not found");
  }

  const updates = {};
  const userUpdates = {};

  const name = sanitizeString(payload.name);
  if (name) {
    updates.name = name;
    userUpdates.name = name;
  }

  const gender = sanitizeString(payload.gender);
  if (gender) {
    updates.gender = gender;
    userUpdates.gender = gender;
  }

  if (payload.dob) {
    updates.dob = payload.dob;
  }

  const bloodGroup = sanitizeString(payload.blood_group || payload.bloodGroup);
  if (bloodGroup) {
    updates.bloodGroup = bloodGroup;
  }

  const phone = sanitizeString(payload.phone);
  if (phone) {
    updates.phone = phone;
  }

  const department = sanitizeString(payload.department);
  if (department) {
    updates.department = department;
    userUpdates.departmentName = department;
  }

  if (payload.specialization !== undefined) {
    const specialization = sanitizeString(payload.specialization);
    updates.specialization = specialization || null;
    userUpdates.specialization = specialization || null;
  }

  if (payload.medicalRegistrationId !== undefined) {
    const registrationId = sanitizeString(payload.medicalRegistrationId);
    updates.medicalRegistrationId = registrationId || null;
  }

  if (Object.keys(updates).length === 0) {
    throw createHttpError(400, "No valid fields provided to update");
  }

  await Doctor.updateOne({ _id: profile._id }, { $set: updates });
  if (Object.keys(userUpdates).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: userUpdates });
  }

  const refreshedUser = await User.findById(user._id).lean();
  const refreshedProfile = await Doctor.findById(profile._id).lean();

  return mapAdminEntity(refreshedUser, refreshedProfile);
};

const updateHospitalProfile = async (id, payload) => {
  const { user, profile } = await resolveEntityAndProfile({
    id,
    role: ROLES.HOSPITAL,
    profileModel: Hospital,
  });

  if (!profile) {
    throw createHttpError(404, "Hospital profile not found");
  }

  const updates = {};
  const userUpdates = {};

  const name = sanitizeString(payload.name);
  if (name) {
    updates.name = name;
    userUpdates.name = name;
  }

  const location = sanitizeString(payload.location);
  if (location) {
    updates.location = location;
  }

  const phone = sanitizeString(payload.phone);
  if (phone) {
    updates.phone = phone;
  }

  if (payload.departments !== undefined) {
    updates.departments = Array.isArray(payload.departments)
      ? payload.departments.filter((dept) => sanitizeString(dept)).map((dept) => dept.trim())
      : [];
  }

  if (Object.keys(updates).length === 0) {
    throw createHttpError(400, "No valid fields provided to update");
  }

  await Hospital.updateOne({ _id: profile._id }, { $set: updates });
  if (Object.keys(userUpdates).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: userUpdates });
  }

  const refreshedUser = await User.findById(user._id).lean();
  const refreshedProfile = await Hospital.findById(profile._id).lean();

  return mapAdminEntity(refreshedUser, refreshedProfile);
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

const deleteDoctor = async (id) => {
  const { user } = await resolveEntityAndProfile({
    id,
    role: ROLES.DOCTOR,
    profileModel: Doctor,
  });

  return deleteUser(user._id);
};

const deleteHospital = async (id) => {
  const { user } = await resolveEntityAndProfile({
    id,
    role: ROLES.HOSPITAL,
    profileModel: Hospital,
  });

  return deleteUser(user._id);
};

const requestUserEmailChange = async (userId, newEmail) => {
  const normalizedEmail = normalizeEmail(newEmail);
  if (!normalizedEmail) {
    throw createHttpError(400, "Email is required");
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  if (normalizeEmail(user.email) === normalizedEmail) {
    throw createHttpError(400, "New email must be different from the current email");
  }

  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser && String(existingUser._id) !== String(user._id)) {
    throw createHttpError(409, "Email already in use");
  }

  const { token, secret, expiresAt } = otpService.generateOtp();

  await userRepository.updateById(user._id, {
    pendingEmail: normalizedEmail,
    emailChangeOtpSecret: secret,
    emailChangeOtpExpiresAt: expiresAt,
  });

  console.log("Email Change OTP:", token);

  return { message: "OTP sent. Please verify to update the email." };
};

const verifyUserEmailChange = async (userId, otp) => {
  if (!otp) {
    throw createHttpError(400, "OTP is required");
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  if (!user.pendingEmail) {
    throw createHttpError(400, "No pending email change request found");
  }

  const { valid, reason } = otpService.verifyOtp(
    otp,
    user.emailChangeOtpSecret,
    user.emailChangeOtpExpiresAt
  );
  if (!valid) {
    throw createHttpError(400, reason || "Invalid OTP");
  }

  const existingUser = await userRepository.findByEmail(user.pendingEmail);
  if (existingUser && String(existingUser._id) !== String(user._id)) {
    throw createHttpError(409, "Email already in use");
  }

  const updatedUser = await userRepository.updateById(user._id, {
    email: user.pendingEmail,
    pendingEmail: null,
    emailChangeOtpSecret: null,
    emailChangeOtpExpiresAt: null,
    isEmailVerified: true,
  });

  if (updatedUser?.role === ROLES.DOCTOR) {
    await Doctor.updateOne({ userId: updatedUser._id }, { $set: { email: updatedUser.email } });
  }

  if (updatedUser?.role === ROLES.HOSPITAL) {
    await Hospital.updateOne({ userId: updatedUser._id }, { $set: { email: updatedUser.email } });
  }

  return {
    id: updatedUser._id,
    email: updatedUser.email,
  };
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

const getDefaultSubscription = async () => subscriptionService.getDefaultSubscription();

const setHospitalSubscription = async ({ hospitalId, amount }) =>
  subscriptionService.setHospitalSubscription({
    hospitalId,
    amount: Number(amount),
  });

const DOCTOR_SUBSCRIPTION_STEP = 500;

const mapDoctorSubscriptionRecord = ({ doctor, subscription }) => ({
  id: doctor._id,
  fullName: doctor.name,
  hospitalCount: Array.isArray(doctor.approvedHospitals) ? doctor.approvedHospitals.length : 0,
  ratePerHospital: subscription?.ratePerHospital ?? DOCTOR_SUBSCRIPTION_STEP,
});

const getDoctorSubscriptions = async () => {
  const doctors = await Doctor.find().sort({ name: 1 }).lean();
  const doctorIds = doctors.map((doctor) => doctor._id);
  const subscriptions = await DoctorSubscription.find({ doctorId: { $in: doctorIds } }).lean();
  const subscriptionMap = new Map(
    subscriptions.map((subscription) => [String(subscription.doctorId), subscription])
  );

  return {
    items: doctors.map((doctor) =>
      mapDoctorSubscriptionRecord({
        doctor,
        subscription: subscriptionMap.get(String(doctor._id)),
      })
    ),
  };
};

const updateDoctorSubscription = async (doctorId, ratePerHospital) => {
  const numericRate = Number(ratePerHospital);
  if (Number.isNaN(numericRate) || numericRate < DOCTOR_SUBSCRIPTION_STEP || numericRate % DOCTOR_SUBSCRIPTION_STEP !== 0) {
    throw createHttpError(400, "Subscription amount must be Rs 500 or more, in Rs 500 steps");
  }

  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  const subscription = await DoctorSubscription.findOneAndUpdate(
    { doctorId: doctor._id },
    { $set: { ratePerHospital: numericRate } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return mapDoctorSubscriptionRecord({ doctor, subscription });
};

module.exports = {
  approveUser,
  rejectUser,
  onboardUser,
  deleteUser,
  deleteDoctor,
  deleteHospital,
  getDoctors,
  getHospitals,
  updateDoctorProfile,
  updateHospitalProfile,
  requestUserEmailChange,
  verifyUserEmailChange,
  updateDoctorStatus,
  updateHospitalStatus,
  setDefaultSubscription,
  getDefaultSubscription,
  setHospitalSubscription,
  getDoctorSubscriptions,
  updateDoctorSubscription,
};
