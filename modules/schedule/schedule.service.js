const mongoose = require("mongoose");
const DoctorSchedule = require("./schedule.model");
const PatientToken = require("./patient-token.model");
const Doctor = require("../doctor/doctor.model");
const Hospital = require("../hospital/hospital.model");
const Department = require("../department/department.model");
const { ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");
const {
  normalizeDate,
  isValidDateString,
  getTodayDateString,
  generateTimeSlots,
  hasTimeOverlap,
  formatCreatedAt,
} = require("./schedule.utils");

const CONSULTATION_TIME_OPTIONS = [15, 30];

const mapSchedule = (schedule) => {
  const source = typeof schedule.toObject === "function" ? schedule.toObject() : schedule;
  const slots = Array.isArray(source.slots)
    ? source.slots.map((slot) => ({
        time: slot.time,
        isBooked: Boolean(slot.isBooked),
      }))
    : [];
  const bookedSlots = slots.filter((slot) => slot.isBooked).length;

  return {
    id: String(source._id),
    hospitalId: String(source.hospitalId),
    doctorId: String(source.doctorId),
    doctorUserId: String(source.doctorUserId),
    doctorName: source.doctorName,
    department: source.department,
    date: source.date,
    startTime: source.startTime,
    endTime: source.endTime,
    consultationTime: source.consultationTime,
    slots,
    totalSlots: slots.length,
    bookedSlots,
    availableSlots: slots.length - bookedSlots,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const mapToken = (token) => {
  const source = typeof token.toObject === "function" ? token.toObject() : token;

  return {
    id: String(source._id),
    scheduleId: String(source.scheduleId),
    hospitalId: String(source.hospitalId),
    doctorId: String(source.doctorId),
    doctorUserId: String(source.doctorUserId),
    tokenNumber: source.tokenNumber,
    patientName: source.patientName,
    dob: source.dob,
    bloodGroup: source.bloodGroup,
    aadhaar: source.aadhaar || "",
    contact: source.contact,
    department: source.department,
    doctorName: source.doctorName,
    date: source.date,
    time: source.time,
    createdAt: source.createdAt,
    createdAtDisplay: formatCreatedAt(source.createdAt),
  };
};

const getHospitalForRequester = async (authUser) => {
  if (!authUser?.id || authUser.role !== ROLES.HOSPITAL) {
    throw createHttpError(403, "Only hospital users can manage doctor schedules");
  }

  const hospital = await Hospital.findOne({ userId: authUser.id });
  if (!hospital) {
    throw createHttpError(404, "Hospital profile not found for the current user");
  }

  return hospital;
};

const getApprovedDoctorForHospital = async ({ hospitalId, doctorId }) => {
  if (!mongoose.isValidObjectId(doctorId)) {
    throw createHttpError(400, "Invalid doctor id");
  }

  const doctor = await Doctor.findOne({
    _id: doctorId,
    approvedHospitals: hospitalId,
  });

  if (!doctor) {
    throw createHttpError(404, "Doctor is not approved for this hospital");
  }

  return doctor;
};

const ensureValidScheduleDate = (date) => {
  const normalizedDate = normalizeDate(date);
  if (!isValidDateString(normalizedDate)) {
    throw createHttpError(400, "Date must be in YYYY-MM-DD format");
  }

  if (normalizedDate < getTodayDateString()) {
    throw createHttpError(400, "Past dates cannot be scheduled");
  }

  return normalizedDate;
};

const getBootstrapData = async (authUser) => {
  const hospital = await getHospitalForRequester(authUser);

  const [approvedDoctors, departments] = await Promise.all([
    Doctor.find({ approvedHospitals: hospital._id })
      .sort({ name: 1 })
      .lean(),
    Department.find({}, { departmentName: 1 }).sort({ departmentName: 1 }).lean(),
  ]);

  const departmentSet = new Set([
    ...(hospital.departments || []),
    ...approvedDoctors.map((doctor) => doctor.department).filter(Boolean),
    ...departments.map((department) => department.departmentName).filter(Boolean),
  ]);

  return {
    hospital: {
      id: String(hospital._id),
      userId: String(hospital.userId),
      name: hospital.name,
      departments: hospital.departments || [],
      status: hospital.status,
    },
    departments: [...departmentSet].sort((left, right) => left.localeCompare(right)),
    doctors: approvedDoctors.map((doctor) => ({
      id: String(doctor._id),
      userId: String(doctor.userId),
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      department: doctor.department,
      status: doctor.status,
    })),
    consultationTimeOptions: CONSULTATION_TIME_OPTIONS,
  };
};

const listSchedules = async (query, authUser) => {
  const hospital = await getHospitalForRequester(authUser);
  const filters = { hospitalId: hospital._id };

  if (query.date) {
    if (!isValidDateString(query.date)) {
      throw createHttpError(400, "date must be in YYYY-MM-DD format");
    }
    filters.date = query.date;
  }

  if (query.department) {
    filters.department = String(query.department).trim();
  }

  if (query.doctorId) {
    if (!mongoose.isValidObjectId(query.doctorId)) {
      throw createHttpError(400, "doctorId must be a valid mongo id");
    }
    filters.doctorId = query.doctorId;
  }

  const schedules = await DoctorSchedule.find(filters).sort({
    date: -1,
    startTime: 1,
    createdAt: -1,
  });

  return schedules.map(mapSchedule);
};

const getScheduleSummary = async (query, authUser) => {
  const hospital = await getHospitalForRequester(authUser);
  const date = query.date ? normalizeDate(query.date) : getTodayDateString();

  if (!isValidDateString(date)) {
    throw createHttpError(400, "date must be in YYYY-MM-DD format");
  }

  const schedules = await DoctorSchedule.find({
    hospitalId: hospital._id,
    date,
  }).lean();

  const totalSchedules = schedules.length;
  const totalSlots = schedules.reduce((sum, schedule) => sum + (schedule.slots || []).length, 0);
  const availableSlots = schedules.reduce(
    (sum, schedule) =>
      sum + (schedule.slots || []).filter((slot) => !slot.isBooked).length,
    0
  );

  return {
    date,
    totalSchedules,
    totalSlots,
    bookedSlots: totalSlots - availableSlots,
    availableSlots,
  };
};

const createSchedule = async (payload, authUser) => {
  const hospital = await getHospitalForRequester(authUser);
  const doctor = await getApprovedDoctorForHospital({
    hospitalId: hospital._id,
    doctorId: payload.doctorId,
  });

  const date = ensureValidScheduleDate(payload.date);
  const department = String(payload.department || "").trim();
  const startTime = String(payload.startTime || "").trim();
  const endTime = String(payload.endTime || "").trim();
  const consultationTime = Number(payload.consultationTime);

  if (doctor.department !== department) {
    throw createHttpError(400, "Selected doctor does not belong to this department");
  }

  const slots = generateTimeSlots(startTime, endTime, consultationTime);
  if (slots.length === 0) {
    throw createHttpError(
      400,
      "Choose a valid time range and consultation time that creates at least one slot"
    );
  }

  const existingSchedules = await DoctorSchedule.find({
    hospitalId: hospital._id,
    doctorId: doctor._id,
    date,
  }).lean();

  const hasOverlap = existingSchedules.some((schedule) =>
    hasTimeOverlap(startTime, endTime, schedule.startTime, schedule.endTime)
  );

  if (hasOverlap) {
    throw createHttpError(409, "This doctor already has an overlapping schedule on the selected date");
  }

  let createdSchedule;

  try {
    createdSchedule = await DoctorSchedule.create({
      hospitalId: hospital._id,
      doctorId: doctor._id,
      doctorUserId: doctor.userId,
      doctorName: doctor.name,
      department,
      date,
      startTime,
      endTime,
      consultationTime,
      slots,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw createHttpError(409, "An identical schedule already exists for this doctor");
    }
    throw error;
  }

  return mapSchedule(createdSchedule);
};

const listTokens = async (query, authUser) => {
  const hospital = await getHospitalForRequester(authUser);
  const filters = { hospitalId: hospital._id };

  if (query.date) {
    if (!isValidDateString(query.date)) {
      throw createHttpError(400, "date must be in YYYY-MM-DD format");
    }
    filters.date = query.date;
  }

  if (query.department) {
    filters.department = String(query.department).trim();
  }

  if (query.doctorId) {
    if (!mongoose.isValidObjectId(query.doctorId)) {
      throw createHttpError(400, "doctorId must be a valid mongo id");
    }
    filters.doctorId = query.doctorId;
  }

  const tokens = await PatientToken.find(filters).sort({ createdAt: -1 });
  return tokens.map(mapToken);
};

const assignToken = async (payload, authUser) => {
  const hospital = await getHospitalForRequester(authUser);
  const date = payload.date ? normalizeDate(payload.date) : getTodayDateString();

  if (!isValidDateString(date)) {
    throw createHttpError(400, "date must be in YYYY-MM-DD format");
  }

  const department = String(payload.department || "").trim();
  const doctorId = payload.doctorId ? String(payload.doctorId).trim() : "";
  const scheduleFilters = {
    hospitalId: hospital._id,
    department,
    date,
  };

  if (doctorId) {
    if (!mongoose.isValidObjectId(doctorId)) {
      throw createHttpError(400, "doctorId must be a valid mongo id");
    }
    await getApprovedDoctorForHospital({ hospitalId: hospital._id, doctorId });
    scheduleFilters.doctorId = doctorId;
  }

  const schedules = await DoctorSchedule.find(scheduleFilters).sort({
    startTime: 1,
    createdAt: 1,
  });

  for (const schedule of schedules) {
    const slotIndex = schedule.slots.findIndex((slot) => !slot.isBooked);
    if (slotIndex === -1) continue;

    const bookedSchedule = await DoctorSchedule.findOneAndUpdate(
      {
        _id: schedule._id,
        [`slots.${slotIndex}.isBooked`]: false,
      },
      {
        $set: {
          [`slots.${slotIndex}.isBooked`]: true,
        },
      },
      { new: true }
    );

    if (!bookedSchedule) {
      continue;
    }

    const bookedSlot = bookedSchedule.slots[slotIndex];
    let token;

    try {
      token = await PatientToken.create({
        hospitalId: hospital._id,
        scheduleId: bookedSchedule._id,
        doctorId: bookedSchedule.doctorId,
        doctorUserId: bookedSchedule.doctorUserId,
        doctorName: bookedSchedule.doctorName,
        department: bookedSchedule.department,
        date: bookedSchedule.date,
        time: bookedSlot.time,
        tokenNumber: slotIndex + 1,
        patientName: String(payload.patientName || "").trim(),
        dob: String(payload.dob || "").trim(),
        bloodGroup: String(payload.bloodGroup || "").trim(),
        aadhaar: String(payload.aadhaar || "").trim(),
        contact: String(payload.contact || "").trim(),
      });
    } catch (error) {
      await DoctorSchedule.updateOne(
        { _id: bookedSchedule._id },
        {
          $set: {
            [`slots.${slotIndex}.isBooked`]: false,
            [`slots.${slotIndex}.patientTokenId`]: null,
          },
        }
      );

      if (error?.code === 11000) {
        continue;
      }

      throw error;
    }

    await DoctorSchedule.updateOne(
      { _id: bookedSchedule._id },
      {
        $set: {
          [`slots.${slotIndex}.patientTokenId`]: token._id,
        },
      }
    );

    const refreshedSchedule = await DoctorSchedule.findById(bookedSchedule._id);

    return {
      assignment: {
        tokenNumber: token.tokenNumber,
        doctorName: token.doctorName,
        department: token.department,
        date: token.date,
        time: token.time,
      },
      token: mapToken(token),
      schedule: mapSchedule(refreshedSchedule),
    };
  }

  throw createHttpError(404, `No availability found in ${department} for ${date}`);
};

module.exports = {
  getBootstrapData,
  listSchedules,
  getScheduleSummary,
  createSchedule,
  listTokens,
  assignToken,
};
