const mongoose = require("mongoose");
const CallMessageTemplate = require("./call-message-template.model");
const CallSession = require("./call-session.model");
const CallEvent = require("./call-event.model");
const Doctor = require("../doctor/doctor.model");
const Hospital = require("../hospital/hospital.model");
const { ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");
const { parsePagination, buildSort } = require("../../shared/utils/query.util");

const ACTIVE_SESSION_STATUSES = ["ACTIVE", "ACKNOWLEDGED"];
const DEFAULT_CALL_MESSAGES = Object.freeze([
  { id: "call-next-patient", label: "Call Next Patient", priority: "routine", source: "predefined" },
  { id: "need-break", label: "I Need a Break", priority: "routine", source: "predefined" },
  { id: "need-nurse-support", label: "I Need Support (Nurse)", priority: "priority", source: "predefined" },
]);
const CALL_FINAL_STATUS_MAP = Object.freeze({
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  missed: "MISSED",
});

const isPaginationRequested = (query = {}) => query.page !== undefined || query.limit !== undefined;

const ensureMongoIdLike = (value, fieldName) => {
  const normalized = String(value || "").trim();
  if (!mongoose.isValidObjectId(normalized)) {
    throw createHttpError(400, `${fieldName} must be a valid mongo id`);
  }
  return normalized;
};

const getDayRange = (dateInput) => {
  const raw = String(dateInput || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createHttpError(400, "date must be in YYYY-MM-DD format");
  }

  const start = new Date(`${raw}T00:00:00.000Z`);
  const end = new Date(`${raw}T23:59:59.999Z`);
  return { start, end };
};

const getDefaultMessages = () => DEFAULT_CALL_MESSAGES.map((message) => ({ ...message }));

const getFinalStatusFromSession = (session) => {
  if (session.status === "COMPLETED") return "completed";
  if (session.status === "CANCELLED") return "cancelled";
  if (session.status === "MISSED") return "missed";
  return "completed";
};

const mapMessageTemplate = (template) => {
  const source = typeof template.toObject === "function" ? template.toObject() : template;
  return {
    id: String(source._id),
    label: source.label,
    priority: source.priority || "routine",
    source: "custom",
  };
};

const mapHospitalTarget = (hospital) => {
  const source = typeof hospital.toObject === "function" ? hospital.toObject() : hospital;
  return {
    id: String(source.userId || source._id),
    hospitalProfileId: String(source._id),
    name: source.name,
    city: source.location,
  };
};

const mapActiveCall = (session) => {
  const source = typeof session.toObject === "function" ? session.toObject() : session;
  return {
    id: String(source._id),
    doctorId: String(source.doctorUserId),
    doctorName: source.doctorName,
    department: source.department,
    hospitalId: String(source.hospitalUserId),
    hospitalProfileId: String(source.hospitalId),
    hospitalName: source.hospitalName,
    messageId: source.messageId,
    messageLabel: source.messageLabel,
    priority: source.priority,
    startedAt: new Date(source.startedAt).getTime(),
    status: "active",
    doctorProfileId: String(source.doctorId),
    hospitalUserId: String(source.hospitalUserId),
  };
};

const mapCallLog = (session) => {
  const source = typeof session.toObject === "function" ? session.toObject() : session;
  const endedAt = source.endedAt ? new Date(source.endedAt).getTime() : Date.now();
  const startedAt = new Date(source.startedAt).getTime();

  return {
    id: String(source._id),
    doctorId: String(source.doctorUserId),
    doctorName: source.doctorName,
    department: source.department,
    hospitalId: String(source.hospitalUserId),
    hospitalProfileId: String(source.hospitalId),
    hospitalName: source.hospitalName,
    messageId: source.messageId,
    messageLabel: source.messageLabel,
    priority: source.priority,
    startedAt,
    endedAt,
    endedBy: source.endedBy === "hospital" ? "hospital" : "doctor",
    finalStatus: getFinalStatusFromSession(source),
    durationMs: source.durationMs || Math.max(0, endedAt - startedAt),
    doctorProfileId: String(source.doctorId),
    hospitalUserId: String(source.hospitalUserId),
  };
};

const mapCallEvent = (event) => {
  const source = typeof event.toObject === "function" ? event.toObject() : event;
  return {
    id: String(source._id),
    callSessionId: String(source.callSessionId),
    eventType: source.eventType,
    actorUserId: source.actorUserId ? String(source.actorUserId) : null,
    actorRole: source.actorRole || null,
    doctorId: String(source.doctorUserId),
    doctorName: source.doctorName,
    department: source.department,
    hospitalId: String(source.hospitalUserId),
    hospitalProfileId: String(source.hospitalId),
    hospitalName: source.hospitalName,
    messageId: source.messageId,
    messageLabel: source.messageLabel,
    priority: source.priority,
    callStatus: source.callStatus,
    createdAt: new Date(source.createdAt).getTime(),
    metadata: source.metadata || null,
  };
};

const resolveDoctorForUser = async (userId) => {
  const doctor = await Doctor.findOne({ userId }).lean();
  if (!doctor) {
    throw createHttpError(404, "Doctor profile not found for the current user");
  }
  return doctor;
};

const resolveHospitalForUser = async (userId) => {
  const hospital = await Hospital.findOne({ userId }).lean();
  if (!hospital) {
    throw createHttpError(404, "Hospital profile not found for the current user");
  }
  return hospital;
};

const resolveAccessibleHospitalForDoctor = async ({ doctor, hospitalRef }) => {
  const normalizedHospitalRef = ensureMongoIdLike(hospitalRef, "hospitalId");
  const hospital = await Hospital.findOne({
    $or: [{ _id: normalizedHospitalRef }, { userId: normalizedHospitalRef }],
  }).lean();

  if (!hospital) {
    throw createHttpError(404, "Target hospital not found");
  }

  const approvedHospitalIds = new Set((doctor.approvedHospitals || []).map((id) => String(id)));
  if (!approvedHospitalIds.has(String(hospital._id))) {
    throw createHttpError(403, "Doctor is not approved for the selected hospital");
  }

  return hospital;
};

const resolveDoctorManagedTemplates = async (doctorUserId) => {
  const templates = await CallMessageTemplate.find({
    doctorUserId,
    isActive: true,
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  return templates;
};

const normalizeMessageSelection = async ({ doctorUserId, messageId, messageLabel, priority }) => {
  const customTemplates = await resolveDoctorManagedTemplates(doctorUserId);

  if (messageId) {
    const customMatch = customTemplates.find((template) => String(template._id) === String(messageId));
    if (customMatch) {
      return {
        id: String(customMatch._id),
        label: customMatch.label,
        priority: customMatch.priority || "routine",
      };
    }

    const defaultMatch = DEFAULT_CALL_MESSAGES.find((message) => message.id === String(messageId));
    if (defaultMatch) {
      return {
        id: defaultMatch.id,
        label: defaultMatch.label,
        priority: defaultMatch.priority,
      };
    }
  }

  if (messageLabel) {
    const normalizedLabel = String(messageLabel).trim().toLowerCase();
    const customMatch = customTemplates.find((template) => template.label.trim().toLowerCase() === normalizedLabel);
    if (customMatch) {
      return {
        id: String(customMatch._id),
        label: customMatch.label,
        priority: customMatch.priority || "routine",
      };
    }

    const defaultMatch = DEFAULT_CALL_MESSAGES.find((message) => message.label.trim().toLowerCase() === normalizedLabel);
    if (defaultMatch) {
      return {
        id: defaultMatch.id,
        label: defaultMatch.label,
        priority: defaultMatch.priority,
      };
    }
  }

  if (!messageLabel) {
    throw createHttpError(404, "Selected call message was not found");
  }

  return {
    id: String(messageId || "manual-message").trim(),
    label: String(messageLabel).trim(),
    priority: String(priority || "routine").trim(),
  };
};

const createCallEvent = async ({ session, eventType, actorUserId, actorRole, metadata = null }) => {
  const source = typeof session.toObject === "function" ? session.toObject() : session;

  const event = await CallEvent.create({
    callSessionId: source._id,
    eventType,
    actorUserId: actorUserId || null,
    actorRole: actorRole || null,
    doctorUserId: source.doctorUserId,
    doctorId: source.doctorId,
    doctorName: source.doctorName,
    department: source.department,
    hospitalUserId: source.hospitalUserId,
    hospitalId: source.hospitalId,
    hospitalName: source.hospitalName,
    messageId: source.messageId,
    messageLabel: source.messageLabel,
    priority: source.priority,
    callStatus: source.status,
    metadata,
  });

  return event;
};

const getCallScopeFilter = async (authUser) => {
  if (!authUser?.id || !authUser?.role) {
    throw createHttpError(401, "Unauthorized");
  }

  if (authUser.role === ROLES.DOCTOR) {
    return { doctorUserId: authUser.id };
  }

  if (authUser.role === ROLES.HOSPITAL) {
    const hospital = await resolveHospitalForUser(authUser.id);
    return { hospitalId: hospital._id };
  }

  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(authUser.role)) {
    return {};
  }

  throw createHttpError(403, "Only doctors, hospitals, admins, and super admins can access call data");
};

const applyCallListFilters = (filters, query = {}, timestampField = "startedAt") => {
  if (query.doctorId) {
    filters.doctorUserId = ensureMongoIdLike(query.doctorId, "doctorId");
  }

  if (query.hospitalId) {
    filters.hospitalId = ensureMongoIdLike(query.hospitalId, "hospitalId");
  }

  if (query.finalStatus) {
    filters.status = CALL_FINAL_STATUS_MAP[String(query.finalStatus).trim()];
  }

  if (query.date) {
    const { start, end } = getDayRange(query.date);
    filters[timestampField] = { $gte: start, $lte: end };
  }

  if (query.search) {
    const searchRegex = new RegExp(String(query.search).trim(), "i");
    filters.$or = [
      { doctorName: searchRegex },
      { department: searchRegex },
      { hospitalName: searchRegex },
      { messageLabel: searchRegex },
    ];
  }
};

const applyEventFilters = (filters, query = {}) => {
  if (query.eventType) {
    filters.eventType = String(query.eventType).trim();
  }

  if (query.date) {
    const { start, end } = getDayRange(query.date);
    filters.createdAt = { $gte: start, $lte: end };
  }

  if (query.search) {
    const searchRegex = new RegExp(String(query.search).trim(), "i");
    filters.$or = [
      { doctorName: searchRegex },
      { department: searchRegex },
      { hospitalName: searchRegex },
      { messageLabel: searchRegex },
      { eventType: searchRegex },
    ];
  }
};

const getBootstrapData = async (authUser) => {
  const scopeFilter = await getCallScopeFilter(authUser);
  const [activeSessions, recentLogs] = await Promise.all([
    CallSession.find({
      ...scopeFilter,
      status: { $in: ACTIVE_SESSION_STATUSES },
    })
      .sort({ startedAt: -1 })
      .lean(),
    CallSession.find({
      ...scopeFilter,
      status: { $nin: ACTIVE_SESSION_STATUSES },
    })
      .sort({ endedAt: -1, startedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  let targets = [];
  let messages = [];

  if (authUser.role === ROLES.DOCTOR) {
    targets = await listHospitalTargets(authUser);
    messages = await listMessageTemplates(authUser);
  }

  return {
    targets,
    messages,
    activeCalls: activeSessions.map(mapActiveCall),
    callLogs: recentLogs.map(mapCallLog),
  };
};

const listHospitalTargets = async (authUser) => {
  if (authUser.role !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can list hospital call targets");
  }

  const doctor = await resolveDoctorForUser(authUser.id);
  const approvedHospitalIds = (doctor.approvedHospitals || []).map((id) => String(id));
  if (!approvedHospitalIds.length) {
    return [];
  }

  const hospitals = await Hospital.find({
    _id: { $in: approvedHospitalIds },
  })
    .sort({ name: 1 })
    .lean();

  return hospitals.map(mapHospitalTarget);
};

const listMessageTemplates = async (authUser) => {
  if (authUser.role !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can manage call message templates");
  }

  const templates = await resolveDoctorManagedTemplates(authUser.id);
  if (!templates.length) {
    return getDefaultMessages();
  }

  return templates.map(mapMessageTemplate);
};

const createMessageTemplate = async (payload, authUser) => {
  if (authUser.role !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can manage call message templates");
  }

  const doctor = await resolveDoctorForUser(authUser.id);
  const currentTemplates = await resolveDoctorManagedTemplates(authUser.id);

  const lastTemplate = await CallMessageTemplate.findOne({
    doctorUserId: authUser.id,
  })
    .sort({ sortOrder: -1, createdAt: -1 })
    .select("sortOrder")
    .lean();

  const nextSortOrder =
    lastTemplate && Number.isFinite(Number(lastTemplate.sortOrder))
      ? Number(lastTemplate.sortOrder) + 1
      : 0;

  const nextTemplate = await CallMessageTemplate.create({
    doctorUserId: authUser.id,
    doctorId: doctor._id,
    label: String(payload.label || "").trim(),
    sortOrder: nextSortOrder,
  });

  return mapMessageTemplate(nextTemplate);
};

const updateMessageTemplate = async (templateId, payload, authUser) => {
  if (authUser.role !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can manage call message templates");
  }

  ensureMongoIdLike(templateId, "templateId");

  const template = await CallMessageTemplate.findOne({
    _id: templateId,
    doctorUserId: authUser.id,
    isActive: true,
  });

  if (!template) {
    throw createHttpError(404, "Call message template not found");
  }

  template.label = String(payload.label || template.label).trim();
  await template.save();

  return mapMessageTemplate(template);
};

const deleteMessageTemplate = async (templateId, authUser) => {
  if (authUser.role !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can manage call message templates");
  }

  ensureMongoIdLike(templateId, "templateId");

  const template = await CallMessageTemplate.findOne({
    _id: templateId,
    doctorUserId: authUser.id,
    isActive: true,
  });

  if (!template) {
    throw createHttpError(404, "Call message template not found");
  }

  template.isActive = false;
  await template.save();

  return {
    id: String(template._id),
  };
};

const listActiveCalls = async (query, authUser) => {
  const filters = await getCallScopeFilter(authUser);
  filters.status = { $in: ACTIVE_SESSION_STATUSES };
  applyCallListFilters(filters, query, "startedAt");

  const sessions = await CallSession.find(filters).sort({ startedAt: -1 }).lean();
  return sessions.map(mapActiveCall);
};

const listCallLogs = async (query, authUser) => {
  const filters = await getCallScopeFilter(authUser);
  filters.status = { $nin: ACTIVE_SESSION_STATUSES };
  applyCallListFilters(filters, query, "endedAt");

  const sort = buildSort(query.sort, ["startedAt", "endedAt", "doctorName", "hospitalName"], {
    endedAt: -1,
    startedAt: -1,
  });
  const sessionQuery = CallSession.find(filters).sort(sort);

  if (isPaginationRequested(query)) {
    const { page, limit, skip } = parsePagination(query);
    const [sessions, totalRecords] = await Promise.all([
      sessionQuery.skip(skip).limit(limit).lean(),
      CallSession.countDocuments(filters),
    ]);

    return {
      items: sessions.map(mapCallLog),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
      },
    };
  }

  const sessions = await sessionQuery.lean();
  return sessions.map(mapCallLog);
};

const listCallEvents = async (query, authUser) => {
  const filters = await getCallScopeFilter(authUser);
  applyEventFilters(filters, query);

  const sort = buildSort(query.sort, ["createdAt", "eventType", "doctorName", "hospitalName"], {
    createdAt: -1,
  });
  const eventQuery = CallEvent.find(filters).sort(sort);

  if (isPaginationRequested(query)) {
    const { page, limit, skip } = parsePagination(query);
    const [events, totalRecords] = await Promise.all([
      eventQuery.skip(skip).limit(limit).lean(),
      CallEvent.countDocuments(filters),
    ]);

    return {
      items: events.map(mapCallEvent),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
      },
    };
  }

  const events = await eventQuery.lean();
  return events.map(mapCallEvent);
};

const createCall = async (payload, authUser) => {
  if (authUser.role !== ROLES.DOCTOR) {
    throw createHttpError(403, "Only doctors can start operational calls");
  }

  const doctor = await resolveDoctorForUser(authUser.id);
  const hospital = await resolveAccessibleHospitalForDoctor({
    doctor,
    hospitalRef: payload.hospitalId,
  });
  const selectedMessage = await normalizeMessageSelection({
    doctorUserId: authUser.id,
    messageId: payload.messageId,
    messageLabel: payload.messageLabel,
    priority: payload.priority,
  });

  const existingActiveCall = await CallSession.findOne({
    doctorUserId: authUser.id,
    hospitalId: hospital._id,
    messageId: selectedMessage.id,
    status: { $in: ACTIVE_SESSION_STATUSES },
  });

  if (existingActiveCall) {
    throw createHttpError(409, "This operational call is already active for the selected hospital");
  }

  let session;
  try {
    session = await CallSession.create({
      doctorUserId: authUser.id,
      doctorId: doctor._id,
      doctorName: doctor.name,
      department: doctor.department,
      hospitalUserId: hospital.userId,
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      messageId: selectedMessage.id,
      messageLabel: selectedMessage.label,
      priority: selectedMessage.priority,
      status: "ACTIVE",
      startedAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw createHttpError(409, "This operational call is already active for the selected hospital");
    }
    throw error;
  }

  const event = await createCallEvent({
    session,
    eventType: "CALL_CREATED",
    actorUserId: authUser.id,
    actorRole: authUser.role,
    metadata: {
      action: "call_created",
    },
  });

  return {
    call: mapActiveCall(session),
    event: mapCallEvent(event),
  };
};

const acknowledgeCall = async (callId, authUser) => {
  if (![ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(authUser.role)) {
    throw createHttpError(403, "Only hospital, admin, or super admin users can acknowledge calls");
  }

  ensureMongoIdLike(callId, "callId");
  const scopeFilter = await getCallScopeFilter(authUser);
  const session = await CallSession.findOne({
    _id: callId,
    ...scopeFilter,
  });

  if (!session) {
    throw createHttpError(404, "Call session not found");
  }

  if (!ACTIVE_SESSION_STATUSES.includes(session.status)) {
    throw createHttpError(409, "Only active calls can be acknowledged");
  }

  if (session.status !== "ACKNOWLEDGED") {
    session.status = "ACKNOWLEDGED";
    session.acknowledgedAt = new Date();
    await session.save();
  }

  const event = await createCallEvent({
    session,
    eventType: "CALL_ACKNOWLEDGED",
    actorUserId: authUser.id,
    actorRole: authUser.role,
    metadata: {
      action: "call_acknowledged",
    },
  });

  return {
    call: mapActiveCall(session),
    event: mapCallEvent(event),
  };
};

const endCall = async (callId, payload, authUser) => {
  if (![ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(authUser.role)) {
    throw createHttpError(403, "Only doctors, hospitals, admins, and super admins can end calls");
  }

  ensureMongoIdLike(callId, "callId");
  const scopeFilter = await getCallScopeFilter(authUser);
  const session = await CallSession.findOne({
    _id: callId,
    ...scopeFilter,
  });

  if (!session) {
    throw createHttpError(404, "Call session not found");
  }

  if (!ACTIVE_SESSION_STATUSES.includes(session.status)) {
    throw createHttpError(409, "Call is already closed");
  }

  const finalStatusInput = String(payload?.finalStatus || "completed").trim();
  const nextStatus = CALL_FINAL_STATUS_MAP[finalStatusInput];
  if (!nextStatus) {
    throw createHttpError(400, "finalStatus must be one of completed, cancelled, missed");
  }

  const endedBy =
    authUser.role === ROLES.HOSPITAL
      ? "hospital"
      : authUser.role === ROLES.DOCTOR
        ? "doctor"
        : String(payload?.endedBy || "system").trim();

  const endedAt = new Date();
  session.status = nextStatus;
  session.endedAt = endedAt;
  session.endedBy = endedBy;
  session.durationMs = Math.max(0, endedAt.getTime() - new Date(session.startedAt).getTime());
  await session.save();

  const event = await createCallEvent({
    session,
    eventType: "CALL_ENDED",
    actorUserId: authUser.id,
    actorRole: authUser.role,
    metadata: {
      action: "call_ended",
      finalStatus: finalStatusInput,
      endedBy,
    },
  });

  return {
    call: mapCallLog(session),
    event: mapCallEvent(event),
  };
};

module.exports = {
  getBootstrapData,
  listHospitalTargets,
  listMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  listActiveCalls,
  listCallLogs,
  listCallEvents,
  createCall,
  acknowledgeCall,
  endCall,
};
