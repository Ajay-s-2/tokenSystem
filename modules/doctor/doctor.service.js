const Doctor = require("./doctor.model");
const User = require("../user/user.model");
const Hospital = require("../hospital/hospital.model");
const DoctorSubscription = require("../doctor-subscription/doctor-subscription.model");
const { ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");
const { getApprovalStatusFromLoginStatus } = require("../../shared/utils/status.util");

const resolveDoctorByIdentifier = async (identifier) => {
  let doctor = await Doctor.findById(identifier)
    .populate("selectedHospitals", "name email location")
    .populate("approvedHospitals", "name email location")
    .populate("rejectedHospitals", "name email location");

  if (!doctor) {
    doctor = await Doctor.findOne({ userId: identifier })
      .populate("selectedHospitals", "name email location")
      .populate("approvedHospitals", "name email location")
      .populate("rejectedHospitals", "name email location");
  }

  return doctor;
};

const mapDoctor = (doctor) => ({
  id: doctor._id,
  userId: doctor.userId,
  name: doctor.name,
  gender: doctor.gender,
  dob: doctor.dob,
  blood_group: doctor.bloodGroup,
  medical_registration_id: doctor.medicalRegistrationId || null,
  phone: doctor.phone,
  email: doctor.email,
  department: doctor.department,
  specialization: doctor.specialization || null,
  status: doctor.status,
  selected_hospitals: (doctor.selectedHospitals || []).map((hospital) => ({
    id: hospital._id,
    name: hospital.name,
    email: hospital.email,
    location: hospital.location,
  })),
  approved_hospitals: (doctor.approvedHospitals || []).map((hospital) => ({
    id: hospital._id,
    name: hospital.name,
    email: hospital.email,
    location: hospital.location,
  })),
  rejected_hospitals: (doctor.rejectedHospitals || []).map((hospital) => ({
    id: hospital._id,
    name: hospital.name,
    email: hospital.email,
    location: hospital.location,
  })),
  createdAt: doctor.createdAt,
  updatedAt: doctor.updatedAt,
});

const mapApprovedDoctorForHospital = (doctor) => ({
  id: doctor._id,
  userId: doctor.userId,
  name: doctor.name,
  email: doctor.email,
  phone: doctor.phone,
  department: doctor.department,
  status: doctor.status,
  isApproved: true,
  createdAt: doctor.createdAt,
});

const DOCTOR_SUBSCRIPTION_STEP = 500;

const mapDoctorSubscriptionSummary = ({ doctor, subscription }) => {
  const approvedCount = Array.isArray(doctor.approvedHospitals) ? doctor.approvedHospitals.length : 0;
  const pendingCount = Array.isArray(doctor.selectedHospitals) ? doctor.selectedHospitals.length : 0;
  const rejectedCount = Array.isArray(doctor.rejectedHospitals) ? doctor.rejectedHospitals.length : 0;
  const ratePerHospital = subscription?.ratePerHospital ?? DOCTOR_SUBSCRIPTION_STEP;
  const hospitalLimit = Math.max(1, Math.floor(ratePerHospital / DOCTOR_SUBSCRIPTION_STEP));
  const usedHospitalSlots = approvedCount + pendingCount;
  const remainingHospitalSlots = Math.max(0, hospitalLimit - usedHospitalSlots);

  return {
    doctorId: doctor._id,
    userId: doctor.userId,
    fullName: doctor.name,
    ratePerHospital,
    hospitalLimit,
    usedHospitalSlots,
    remainingHospitalSlots,
    approvedHospitalCount: approvedCount,
    pendingHospitalCount: pendingCount,
    rejectedHospitalCount: rejectedCount,
    currentTotal: approvedCount * ratePerHospital,
    projectedTotal: (approvedCount + pendingCount) * ratePerHospital,
  };
};

const createDoctorProfile = async (payload, authUser) => {
  const user = await User.findOne({ _id: authUser.id, role: ROLES.DOCTOR });
  if (!user) {
    throw createHttpError(404, "Doctor auth user not found");
  }

  const existingDoctor = await Doctor.findOne({ userId: user._id });
  if (existingDoctor) {
    throw createHttpError(409, "Doctor profile already exists");
  }

  const doctor = await Doctor.create({
    userId: user._id,
    name: payload.name,
    gender: payload.gender,
    dob: payload.dob,
    bloodGroup: payload.blood_group,
    medicalRegistrationId: payload.medicalRegistrationId || null,
    phone: payload.phone,
    email: user.email,
    department: payload.department,
    specialization: payload.specialization || null,
    status: getApprovalStatusFromLoginStatus(user.loginStatus),
    selectedHospitals: [],
    approvedHospitals: [],
    rejectedHospitals: [],
  });

  user.name = payload.name;
  user.gender = payload.gender;
  user.onboardingStatus = ONBOARDING_STATUS.ONBOARDED;
  await user.save();

  return resolveDoctorByIdentifier(doctor._id);
};

const getDoctorById = async (doctorId) => {
  const doctor = await resolveDoctorByIdentifier(doctorId);

  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  return mapDoctor(doctor);
};

const getDoctorSubscriptionSummary = async ({ doctorId, requesterId, requesterRole }) => {
  const doctor = await resolveDoctorByIdentifier(doctorId);

  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  const isDoctorSelf =
    requesterRole === ROLES.DOCTOR && String(doctor.userId) === String(requesterId);
  const isAdmin =
    requesterRole === ROLES.ADMIN || requesterRole === ROLES.SUPER_ADMIN;

  if (!isDoctorSelf && !isAdmin) {
    throw createHttpError(403, "You can only view your own doctor subscription");
  }

  const subscription = await DoctorSubscription.findOne({ doctorId: doctor._id }).lean();
  return mapDoctorSubscriptionSummary({ doctor, subscription });
};

const listApprovedDoctorsForHospitalUser = async (authUser) => {
  if (!authUser?.id || authUser.role !== ROLES.HOSPITAL) {
    throw createHttpError(403, "Only hospital users can fetch approved doctors");
  }

  const hospital = await Hospital.findOne({ userId: authUser.id });
  if (!hospital) {
    throw createHttpError(404, "Hospital profile not found for the current user");
  }

  const doctors = await Doctor.find({ approvedHospitals: hospital._id }).sort({ name: 1 }).lean();
  return doctors.map(mapApprovedDoctorForHospital);
};

const selectHospital = async ({ doctorId, hospitalId, requesterId, requesterRole }) => {
  if (requesterRole !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can select hospitals");
  }

  const doctor = await Doctor.findOne({ $or: [{ _id: doctorId }, { userId: doctorId }] });
  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  if (String(doctor.userId) !== String(requesterId)) {
    throw createHttpError(403, "You can only update your own doctor profile");
  }

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw createHttpError(404, "Hospital not found");
  }

  if (hospital.status !== "approved") {
    throw createHttpError(400, "Only approved hospitals can be selected");
  }

  const alreadyApproved = doctor.approvedHospitals.some(
    (approvedHospitalId) => String(approvedHospitalId) === String(hospital._id)
  );
  if (alreadyApproved) {
    throw createHttpError(409, "Hospital is already approved for this doctor");
  }

  const alreadySelected = doctor.selectedHospitals.some(
    (selectedHospitalId) => String(selectedHospitalId) === String(hospital._id)
  );
  if (alreadySelected) {
    throw createHttpError(409, "Hospital already selected");
  }

  const subscription = await DoctorSubscription.findOne({ doctorId: doctor._id }).lean();
  const hospitalLimit = Math.max(
    1,
    Math.floor((subscription?.ratePerHospital ?? DOCTOR_SUBSCRIPTION_STEP) / DOCTOR_SUBSCRIPTION_STEP)
  );
  const activeHospitalCount =
    (Array.isArray(doctor.approvedHospitals) ? doctor.approvedHospitals.length : 0) +
    (Array.isArray(doctor.selectedHospitals) ? doctor.selectedHospitals.length : 0);

  if (activeHospitalCount >= hospitalLimit) {
    throw createHttpError(400, `Hospital limit reached. Your plan allows ${hospitalLimit} hospital selections.`);
  }

  doctor.rejectedHospitals = doctor.rejectedHospitals.filter(
    (rejectedHospitalId) => String(rejectedHospitalId) !== String(hospital._id)
  );
  doctor.selectedHospitals.push(hospital._id);
  await doctor.save();

  return getDoctorById(doctor._id);
};

const removeHospitalSelection = async ({ doctorId, hospitalId, requesterId, requesterRole }) => {
  if (requesterRole !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can manage hospital selections");
  }

  const doctor = await Doctor.findOne({ $or: [{ _id: doctorId }, { userId: doctorId }] });
  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  if (String(doctor.userId) !== String(requesterId)) {
    throw createHttpError(403, "You can only update your own doctor profile");
  }

  const hasSelection =
    doctor.selectedHospitals.some((selectedHospitalId) => String(selectedHospitalId) === String(hospitalId)) ||
    doctor.approvedHospitals.some((approvedHospitalId) => String(approvedHospitalId) === String(hospitalId)) ||
    doctor.rejectedHospitals.some((rejectedHospitalId) => String(rejectedHospitalId) === String(hospitalId));

  if (!hasSelection) {
    throw createHttpError(404, "Hospital selection not found");
  }

  doctor.selectedHospitals = doctor.selectedHospitals.filter(
    (selectedHospitalId) => String(selectedHospitalId) !== String(hospitalId)
  );
  doctor.approvedHospitals = doctor.approvedHospitals.filter(
    (approvedHospitalId) => String(approvedHospitalId) !== String(hospitalId)
  );
  doctor.rejectedHospitals = doctor.rejectedHospitals.filter(
    (rejectedHospitalId) => String(rejectedHospitalId) !== String(hospitalId)
  );

  await doctor.save();
  return getDoctorById(doctor._id);
};

const getPendingDoctorsForHospital = async (hospitalId) => {
  const doctors = await Doctor.find({
    selectedHospitals: hospitalId,
    approvedHospitals: { $nin: [hospitalId] },
    rejectedHospitals: { $nin: [hospitalId] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return doctors.map((doctor) => ({
    id: doctor._id,
    userId: doctor.userId,
    name: doctor.name,
    email: doctor.email,
    phone: doctor.phone,
    department: doctor.department,
    status: doctor.status,
    createdAt: doctor.createdAt,
  }));
};

const getRejectedDoctorsForHospital = async (hospitalId) => {
  const doctors = await Doctor.find({ rejectedHospitals: hospitalId })
    .sort({ createdAt: -1 })
    .lean();

  return doctors.map((doctor) => ({
    id: doctor._id,
    userId: doctor.userId,
    name: doctor.name,
    email: doctor.email,
    phone: doctor.phone,
    department: doctor.department,
    status: doctor.status,
    createdAt: doctor.createdAt,
  }));
};

const moveDoctorHospitalApproval = async ({ hospitalId, doctorId, approve }) => {
  const doctor = await Doctor.findOne({ $or: [{ _id: doctorId }, { userId: doctorId }] });
  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  const hasSelectedHospital = doctor.selectedHospitals.some(
    (selectedHospitalId) => String(selectedHospitalId) === String(hospitalId)
  );
  const hasApprovedHospital = doctor.approvedHospitals.some(
    (approvedHospitalId) => String(approvedHospitalId) === String(hospitalId)
  );
  const hasRejectedHospital = doctor.rejectedHospitals.some(
    (rejectedHospitalId) => String(rejectedHospitalId) === String(hospitalId)
  );

  if (!hasSelectedHospital && !hasApprovedHospital && !hasRejectedHospital) {
    throw createHttpError(400, "Doctor has not selected this hospital");
  }

  doctor.selectedHospitals = doctor.selectedHospitals.filter(
    (selectedHospitalId) => String(selectedHospitalId) !== String(hospitalId)
  );
  doctor.approvedHospitals = doctor.approvedHospitals.filter(
    (approvedHospitalId) => String(approvedHospitalId) !== String(hospitalId)
  );
  doctor.rejectedHospitals = doctor.rejectedHospitals.filter(
    (rejectedHospitalId) => String(rejectedHospitalId) !== String(hospitalId)
  );

  if (approve) {
    if (!hasApprovedHospital || hasRejectedHospital || hasSelectedHospital) {
      doctor.approvedHospitals.push(hospitalId);
    }
  } else {
    doctor.rejectedHospitals.push(hospitalId);
  }

  await doctor.save();
  return getDoctorById(doctor._id);
};

const syncDoctorStatus = async (userId, status) => {
  const doctor = await Doctor.findOneAndUpdate(
    { userId },
    { status },
    { returnDocument: "after" }
  );
  return doctor;
};

module.exports = {
  createDoctorProfile,
  getDoctorById,
  getDoctorSubscriptionSummary,
  listApprovedDoctorsForHospitalUser,
  removeHospitalSelection,
  selectHospital,
  getPendingDoctorsForHospital,
  getRejectedDoctorsForHospital,
  moveDoctorHospitalApproval,
  syncDoctorStatus,
  resolveDoctorByIdentifier,
  mapApprovedDoctorForHospital,
};
