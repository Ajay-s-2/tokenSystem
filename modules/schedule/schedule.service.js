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
  formatCreatedAt,
} = require("./schedule.utils");

const CONSULTATION_TIME_OPTIONS = [15, 30];
const OVERLAP_ERROR_MESSAGE = "Schedule time overlaps with existing schedule";
const TOKEN_STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "inprogress",
  COMPLETED: "COMPLETED",
});

const TOKEN_STATUS_RESPONSE = Object.freeze({
  CALLING: "CALLING",
});

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
    status:
      source.status === TOKEN_STATUS.IN_PROGRESS
        ? TOKEN_STATUS_RESPONSE.CALLING
        : source.status || TOKEN_STATUS.NOT_STARTED,
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
  const normalizedDoctorId = String(doctorId || "").trim();
  if (!mongoose.isValidObjectId(normalizedDoctorId)) {
    throw createHttpError(400, "Invalid doctor id");
  }

  const doctor = await Doctor.findOne({
    $or: [{ _id: normalizedDoctorId }, { userId: normalizedDoctorId }],
    approvedHospitals: hospitalId,
  });

  if (!doctor) {
    throw createHttpError(404, "Doctor is not approved for this hospital");
  }

  return doctor;
};

const getScheduleForHospital = async ({ scheduleId, hospitalId }) => {
  if (!mongoose.isValidObjectId(scheduleId)) {
    throw createHttpError(400, "Invalid schedule id");
  }

  const schedule = await DoctorSchedule.findOne({
    _id: scheduleId,
    hospitalId,
  });

  if (!schedule) {
    throw createHttpError(404, "Doctor schedule not found");
  }

  return schedule;
};

const hasAssignedTokens = async (schedule) => {
  if (!schedule) return false;

  const hasBookedSlot = (schedule.slots || []).some(
    (slot) => slot.isBooked || slot.patientTokenId != null
  );

  if (hasBookedSlot) {
    return true;
  }

  return Boolean(
    await PatientToken.exists({
      scheduleId: schedule._id,
    })
  );
};

const normalizeTokenStatus = (value) => {
  const normalizedValue = String(value || "").trim();

  if (normalizedValue === TOKEN_STATUS.NOT_STARTED) {
    return TOKEN_STATUS.NOT_STARTED;
  }

  if (normalizedValue === TOKEN_STATUS.COMPLETED) {
    return TOKEN_STATUS.COMPLETED;
  }

  if (
    normalizedValue === TOKEN_STATUS_RESPONSE.CALLING ||
    normalizedValue.toLowerCase() === TOKEN_STATUS.IN_PROGRESS
  ) {
    return TOKEN_STATUS.IN_PROGRESS;
  }

  throw createHttpError(400, "status must be one of NOT_STARTED, inprogress, COMPLETED");
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
      isApproved: true,
    })),
    consultationTimeOptions: CONSULTATION_TIME_OPTIONS,
  };
};

const findOverlappingSchedule = async ({
  hospitalId,
  doctorId,
  date,
  startTime,
  endTime,
  excludeScheduleId,
}) => {
  const filters = {
    hospitalId,
    doctorId,
    date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeScheduleId) {
    filters._id = { $ne: excludeScheduleId };
  }

  return DoctorSchedule.findOne(filters).lean();
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
    filters.$or = [{ doctorId: query.doctorId }, { doctorUserId: query.doctorId }];
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

  const overlappingSchedule = await findOverlappingSchedule({
    hospitalId: hospital._id,
    doctorId: doctor._id,
    date,
    startTime,
    endTime,
  });

  if (overlappingSchedule) {
    throw createHttpError(400, OVERLAP_ERROR_MESSAGE);
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
      throw createHttpError(400, OVERLAP_ERROR_MESSAGE);
    }
    throw error;
  }

  return mapSchedule(createdSchedule);
};

const updateSchedule = async (scheduleId, payload, authUser) => {
  const hospital = await getHospitalForRequester(authUser);
  const schedule = await getScheduleForHospital({
    scheduleId,
    hospitalId: hospital._id,
  });

  if (await hasAssignedTokens(schedule)) {
    throw createHttpError(
      409,
      "Cannot update a schedule that already has patient tokens assigned"
    );
  }

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

  const overlappingSchedule = await findOverlappingSchedule({
    hospitalId: hospital._id,
    doctorId: doctor._id,
    date,
    startTime,
    endTime,
    excludeScheduleId: schedule._id,
  });

  if (overlappingSchedule) {
    throw createHttpError(400, OVERLAP_ERROR_MESSAGE);
  }

  schedule.doctorId = doctor._id;
  schedule.doctorUserId = doctor.userId;
  schedule.doctorName = doctor.name;
  schedule.department = department;
  schedule.date = date;
  schedule.startTime = startTime;
  schedule.endTime = endTime;
  schedule.consultationTime = consultationTime;
  schedule.slots = slots;

  try {
    await schedule.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw createHttpError(400, OVERLAP_ERROR_MESSAGE);
    }
    throw error;
  }

  return mapSchedule(schedule);
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
    filters.$or = [{ doctorId: query.doctorId }, { doctorUserId: query.doctorId }];
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
    const doctor = await getApprovedDoctorForHospital({ hospitalId: hospital._id, doctorId });
    scheduleFilters.doctorId = doctor._id;
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
        status: TOKEN_STATUS.NOT_STARTED,
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

const deleteSchedule = async (scheduleId, authUser) => {
  const hospital = await getHospitalForRequester(authUser);
  const schedule = await getScheduleForHospital({
    scheduleId,
    hospitalId: hospital._id,
  });

  if (await hasAssignedTokens(schedule)) {
    throw createHttpError(
      409,
      "Cannot delete a schedule that already has patient tokens assigned"
    );
  }

  await DoctorSchedule.deleteOne({ _id: schedule._id });

  return {
    id: String(schedule._id),
  };
};

const updateTokenStatus = async (tokenId, statusValue, authUser) => {
  const hospital = await getHospitalForRequester(authUser);

  if (!mongoose.isValidObjectId(tokenId)) {
    throw createHttpError(400, "Invalid token id");
  }

  const nextStatus = normalizeTokenStatus(statusValue);
  const token = await PatientToken.findOne({
    _id: tokenId,
    hospitalId: hospital._id,
  });

  if (!token) {
    throw createHttpError(404, "Patient token not found");
  }

  token.status = nextStatus;
  await token.save();

  return mapToken(token);
};

module.exports = {
  getBootstrapData,
  listSchedules,
  getScheduleSummary,
  createSchedule,
  updateSchedule,
  listTokens,
  assignToken,
  deleteSchedule,
  updateTokenStatus,
};
