const mongoose = require("mongoose");
const Hospital = require("./hospital.model");
const Department = require("../department/department.model");
const doctorService = require("../doctor/doctor.service");
const subscriptionService = require("../subscription/subscription.service");
const User = require("../user/user.model");
const { ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");
const { getApprovalStatusFromLoginStatus } = require("../../shared/utils/status.util");

const resolveHospitalByIdentifier = async (identifier) => {
  let hospital = await Hospital.findById(identifier).populate("departmentId", "departmentName");

  if (!hospital && mongoose.isValidObjectId(identifier)) {
    hospital = await Hospital.findOne({ userId: identifier }).populate(
      "departmentId",
      "departmentName"
    );
  }

  return hospital;
};

const mapHospital = (hospital) => ({
  id: hospital._id,
  userId: hospital.userId,
  name: hospital.name,
  location: hospital.location,
  phone: hospital.phone,
  email: hospital.email,
  departments: hospital.departments || [],
  status: hospital.status,
  subscription_amount: hospital.subscriptionAmount,
  departmentId: hospital.departmentId?._id || null,
  departmentName: hospital.departmentId?.departmentName || null,
  createdAt: hospital.createdAt,
  updatedAt: hospital.updatedAt,
});

const getHospitalById = async (hospitalId) => {
  if (!mongoose.isValidObjectId(hospitalId)) {
    throw createHttpError(400, "Invalid hospital id");
  }

  const hospital = await resolveHospitalByIdentifier(hospitalId);

  if (!hospital) {
    throw createHttpError(404, "Hospital not found");
  }

  return mapHospital(hospital);
};

const createHospitalProfile = async (payload, authUser) => {
  const user = await User.findOne({ _id: authUser.id, role: ROLES.HOSPITAL });
  if (!user) {
    throw createHttpError(404, "Hospital auth user not found");
  }

  const existingHospital = await Hospital.findOne({ userId: user._id });
  if (existingHospital) {
    throw createHttpError(409, "Hospital profile already exists");
  }

  const hospital = await Hospital.create({
    userId: user._id,
    name: payload.name,
    location: payload.location,
    phone: payload.phone,
    email: user.email,
    departments: payload.departments,
    status: getApprovalStatusFromLoginStatus(user.loginStatus),
  });

  user.name = payload.name;
  user.onboardingStatus = ONBOARDING_STATUS.ONBOARDED;
  await user.save();

  return getHospitalById(hospital._id);
};

const updateHospitalDepartment = async (hospitalId, departmentId) => {
  if (!mongoose.isValidObjectId(hospitalId)) {
    throw createHttpError(400, "Invalid hospital id");
  }

  if (!departmentId) {
    throw createHttpError(400, "Department ID is required");
  }

  if (!mongoose.isValidObjectId(departmentId)) {
    throw createHttpError(400, "Invalid department id");
  }

  const department = await Department.findById(departmentId).lean();
  if (!department) {
    throw createHttpError(404, "Department not found");
  }

  const hospital = await Hospital.findByIdAndUpdate(
    hospitalId,
    {
      $set: { departmentId: department._id },
      $addToSet: { departments: department.departmentName },
    },
    { new: true }
  )
    .populate("departmentId", "departmentName")
    .lean();

  if (!hospital) {
    throw createHttpError(404, "Hospital not found");
  }

  return mapHospital(hospital);
};

const validateHospitalOwnership = async ({ hospitalId, requesterId, requesterRole }) => {
  const hospital = await resolveHospitalByIdentifier(hospitalId);
  if (!hospital) {
    throw createHttpError(404, "Hospital not found");
  }

  if (requesterRole !== ROLES.HOSPITAL || String(hospital.userId) !== String(requesterId)) {
    throw createHttpError(403, "You can only manage your own hospital profile");
  }

  return hospital;
};

const getPendingDoctors = async ({ hospitalId, requesterId, requesterRole }) => {
  const hospital = await validateHospitalOwnership({ hospitalId, requesterId, requesterRole });
  const pendingDoctors = await doctorService.getPendingDoctorsForHospital(hospital._id);

  return {
    hospital: mapHospital(hospital),
    doctors: pendingDoctors,
  };
};

const approveDoctor = async ({ hospitalId, doctorId, requesterId, requesterRole }) => {
  const hospital = await validateHospitalOwnership({ hospitalId, requesterId, requesterRole });
  return doctorService.moveDoctorHospitalApproval({
    hospitalId: hospital._id,
    doctorId,
    approve: true,
  });
};

const rejectDoctor = async ({ hospitalId, doctorId, requesterId, requesterRole }) => {
  const hospital = await validateHospitalOwnership({ hospitalId, requesterId, requesterRole });
  return doctorService.moveDoctorHospitalApproval({
    hospitalId: hospital._id,
    doctorId,
    approve: false,
  });
};

const getSubscription = async ({ hospitalId, requesterId, requesterRole }) =>
  subscriptionService.getHospitalSubscription({
    hospitalId,
    requesterId,
    requesterRole,
  });

const syncHospitalStatus = async (userId, status) =>
  Hospital.findOneAndUpdate({ userId }, { status }, { new: true });

module.exports = {
  createHospitalProfile,
  getHospitalById,
  updateHospitalDepartment,
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
  getSubscription,
  syncHospitalStatus,
  resolveHospitalByIdentifier,
};
