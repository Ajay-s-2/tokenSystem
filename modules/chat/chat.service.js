const mongoose = require("mongoose");
const { ChatMessage, CHAT_MESSAGE_TYPES } = require("./chat.model");
const Doctor = require("../doctor/doctor.model");
const Hospital = require("../hospital/hospital.model");
const { createHttpError } = require("../../shared/utils/error.util");
const { parsePagination, buildSort } = require("../../shared/utils/query.util");
const { ROLES } = require("../../shared/utils/constants");

const CHAT_SORT_FIELDS = ["createdAt", "updatedAt", "isRead"];

const normalizeText = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const normalizeChatIdentity = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const getConversationId = (left, right) => [left, right].sort().join("::");

const getSharedConversationId = (leftRole, leftName, rightRole, rightName) =>
  getConversationId(
    `${leftRole}:${normalizeChatIdentity(leftName)}`,
    `${rightRole}:${normalizeChatIdentity(rightName)}`
  );

const resolveDoctorByIdentifier = async (identifier) => {
  if (!identifier) return null;
  if (mongoose.isValidObjectId(identifier)) {
    const doctor = await Doctor.findById(identifier);
    if (doctor) return doctor;
  }

  return Doctor.findOne({ userId: identifier });
};

const resolveHospitalByIdentifier = async (identifier) => {
  if (!identifier) return null;
  if (mongoose.isValidObjectId(identifier)) {
    const hospital = await Hospital.findById(identifier);
    if (hospital) return hospital;
  }

  return Hospital.findOne({ userId: identifier });
};

const ensureRequesterAccess = ({ doctor, hospital, requesterId, requesterRole }) => {
  if (!requesterId || !requesterRole) {
    throw createHttpError(401, "Unauthorized");
  }

  if (requesterRole === ROLES.DOCTOR) {
    if (String(doctor.userId) !== String(requesterId)) {
      throw createHttpError(403, "You can only access your own doctor chat");
    }
    return "doctor";
  }

  if (requesterRole === ROLES.HOSPITAL) {
    if (String(hospital.userId) !== String(requesterId)) {
      throw createHttpError(403, "You can only access your own hospital chat");
    }
    return "hospital";
  }

  throw createHttpError(403, "Only doctors and hospitals can access chat");
};

const ensureApprovedConnection = (doctor, hospital) => {
  const approvedHospitals = Array.isArray(doctor.approvedHospitals)
    ? doctor.approvedHospitals
    : [];

  const isApproved = approvedHospitals.some(
    (approvedHospital) => String(approvedHospital) === String(hospital._id)
  );

  if (!isApproved) {
    throw createHttpError(403, "Doctor and hospital must be approved to chat");
  }
};

const resolveParticipants = async ({ doctorId, hospitalId }) => {
  const doctor = await resolveDoctorByIdentifier(doctorId);
  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  const hospital = await resolveHospitalByIdentifier(hospitalId);
  if (!hospital) {
    throw createHttpError(404, "Hospital not found");
  }

  ensureApprovedConnection(doctor, hospital);

  return { doctor, hospital };
};

const buildConversationId = ({ conversationId, doctor, hospital }) => {
  if (conversationId) {
    return String(conversationId).trim();
  }

  const doctorName = doctor?.name || doctor?._id || "doctor";
  const hospitalName = hospital?.name || hospital?._id || "hospital";

  return getSharedConversationId("doctor", doctorName, "hospital", hospitalName);
};

const mapChatMessage = (message) => {
  const source = typeof message.toObject === "function" ? message.toObject() : message;

  return {
    id: String(source._id),
    conversationId: source.conversationId,
    sender: source.senderRole,
    message: source.message,
    type: source.type,
    createdAt: source.createdAt,
    isRead: source.isRead,
    editedAt: source.editedAt,
    readAt: source.readAt,
    doctorId: source.doctorId,
    hospitalId: source.hospitalId,
  };
};

const buildMessageFilters = ({ doctor, hospital, query }) => {
  const filters = {
    doctorId: doctor._id,
    hospitalId: hospital._id,
  };

  const conversationId = normalizeText(query.conversationId);
  if (conversationId) {
    filters.conversationId = conversationId;
  }

  const status = normalizeText(query.status);
  if (status === "read") {
    filters.isRead = true;
  } else if (status === "unread") {
    filters.isRead = false;
  }

  const search = normalizeText(query.search);
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filters.message = { $regex: escapedSearch, $options: "i" };
  }

  return filters;
};

const createMessage = async ({
  doctorId,
  hospitalId,
  message,
  type,
  conversationId,
  requesterId,
  requesterRole,
}) => {
  const trimmedMessage = normalizeText(message);
  if (!trimmedMessage) {
    throw createHttpError(400, "Message is required");
  }

  if (!CHAT_MESSAGE_TYPES.includes(type)) {
    throw createHttpError(400, "type must be quick or manual");
  }

  const { doctor, hospital } = await resolveParticipants({ doctorId, hospitalId });
  const senderRole = ensureRequesterAccess({
    doctor,
    hospital,
    requesterId,
    requesterRole,
  });

  const conversationKey = buildConversationId({ conversationId, doctor, hospital });

  const chatMessage = await ChatMessage.create({
    conversationId: conversationKey,
    doctorId: doctor._id,
    hospitalId: hospital._id,
    doctorUserId: doctor.userId,
    hospitalUserId: hospital.userId,
    senderRole,
    senderUserId: requesterId,
    message: trimmedMessage,
    type,
    isRead: false,
    readAt: null,
  });

  return mapChatMessage(chatMessage);
};

const listMessages = async ({ doctorId, hospitalId, requesterId, requesterRole, query = {} }) => {
  const { doctor, hospital } = await resolveParticipants({ doctorId, hospitalId });
  ensureRequesterAccess({ doctor, hospital, requesterId, requesterRole });

  const filters = buildMessageFilters({ doctor, hospital, query });
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query.sort, CHAT_SORT_FIELDS, { createdAt: 1 });

  const [items, total] = await Promise.all([
    ChatMessage.find(filters).sort(sort).skip(skip).limit(limit),
    ChatMessage.countDocuments(filters),
  ]);

  return {
    items: items.map(mapChatMessage),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const updateMessage = async ({ id, message, requesterId, requesterRole }) => {
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, "Invalid message id");
  }

  const trimmedMessage = normalizeText(message);
  if (!trimmedMessage) {
    throw createHttpError(400, "Message is required");
  }

  const chatMessage = await ChatMessage.findById(id);
  if (!chatMessage) {
    throw createHttpError(404, "Message not found");
  }

  const isSender =
    (requesterRole === ROLES.DOCTOR || requesterRole === ROLES.HOSPITAL) &&
    String(chatMessage.senderRole) === String(requesterRole) &&
    String(chatMessage.senderUserId) === String(requesterId);

  if (!isSender) {
    throw createHttpError(403, "You can only edit your own messages");
  }

  chatMessage.message = trimmedMessage;
  chatMessage.editedAt = new Date();
  await chatMessage.save();

  return mapChatMessage(chatMessage);
};

const deleteMessage = async ({ id, requesterId, requesterRole }) => {
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, "Invalid message id");
  }

  const chatMessage = await ChatMessage.findById(id);
  if (!chatMessage) {
    throw createHttpError(404, "Message not found");
  }

  const isDoctor =
    requesterRole === ROLES.DOCTOR &&
    String(chatMessage.doctorUserId) === String(requesterId);
  const isHospital =
    requesterRole === ROLES.HOSPITAL &&
    String(chatMessage.hospitalUserId) === String(requesterId);

  if (!isDoctor && !isHospital) {
    throw createHttpError(403, "You can only delete messages in your own chat");
  }

  await chatMessage.deleteOne();

  return { id: String(chatMessage._id) };
};

const markConversationAsRead = async ({
  doctorId,
  hospitalId,
  conversationId,
  requesterId,
  requesterRole,
}) => {
  const { doctor, hospital } = await resolveParticipants({ doctorId, hospitalId });
  const viewerRole = ensureRequesterAccess({
    doctor,
    hospital,
    requesterId,
    requesterRole,
  });

  const filters = {
    doctorId: doctor._id,
    hospitalId: hospital._id,
    senderRole: { $ne: viewerRole },
    isRead: false,
  };

  const normalizedConversation = normalizeText(conversationId);
  if (normalizedConversation) {
    filters.conversationId = normalizedConversation;
  }

  const update = {
    $set: {
      isRead: true,
      readAt: new Date(),
    },
  };

  const result = await ChatMessage.updateMany(filters, update);

  return {
    updated: result.modifiedCount || result.nModified || 0,
  };
};

const clearConversation = async ({
  doctorId,
  hospitalId,
  conversationId,
  requesterId,
  requesterRole,
}) => {
  const { doctor, hospital } = await resolveParticipants({ doctorId, hospitalId });
  ensureRequesterAccess({ doctor, hospital, requesterId, requesterRole });

  const filters = {
    doctorId: doctor._id,
    hospitalId: hospital._id,
  };

  const normalizedConversation = normalizeText(conversationId);
  if (normalizedConversation) {
    filters.conversationId = normalizedConversation;
  }

  const result = await ChatMessage.deleteMany(filters);

  return {
    deleted: result.deletedCount || 0,
  };
};

module.exports = {
  createMessage,
  listMessages,
  updateMessage,
  deleteMessage,
  markConversationAsRead,
  clearConversation,
};
