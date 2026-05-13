const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const chatService = require("./chat.service");
const User = require("../user/user.model");
const { LOGIN_STATUS, ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");

const CHAT_SOCKET_EVENTS = Object.freeze({
  CONNECTED: "chat:connected",
  ERROR: "chat:error",
  SUBSCRIBE: "chat:subscribe",
  SUBSCRIBED: "chat:subscribed",
  UNSUBSCRIBE: "chat:unsubscribe",
  UNSUBSCRIBED: "chat:unsubscribed",
  MESSAGES_LIST: "chat:messages:list",
  MESSAGES_RESULT: "chat:messages",
  MESSAGE_CREATE: "chat:message:create",
  MESSAGE_CREATED: "chat:message:created",
  MESSAGE_UPDATE: "chat:message:update",
  MESSAGE_UPDATED: "chat:message:updated",
  MESSAGE_DELETE: "chat:message:delete",
  MESSAGE_DELETED: "chat:message:deleted",
  CONVERSATION_READ: "chat:conversation:read",
  CONVERSATION_READ_UPDATED: "chat:conversation:read:updated",
  CONVERSATION_CLEAR: "chat:conversation:clear",
  CONVERSATION_CLEARED: "chat:conversation:cleared",
});

let io = null;
const SOCKET_EVENT_LIMIT = Number(process.env.CHAT_SOCKET_EVENT_LIMIT_PER_MINUTE || 120);
const SOCKET_MAX_PAYLOAD_BYTES = Number(process.env.CHAT_SOCKET_MAX_PAYLOAD_BYTES || 10000);

const getUserRoom = (role, userId) => `chat:user:${role}:${String(userId)}`;
const getConversationRoom = (conversationId) =>
  conversationId ? `chat:conversation:${String(conversationId)}` : null;
const getPairRoom = (doctorId, hospitalId) =>
  doctorId && hospitalId
    ? `chat:pair:${String(doctorId)}:${String(hospitalId)}`
    : null;

const getChatRooms = ({
  doctorId,
  hospitalId,
  doctorUserId,
  hospitalUserId,
  conversationId,
}) =>
  [
    getPairRoom(doctorId, hospitalId),
    getConversationRoom(conversationId),
    doctorUserId ? getUserRoom(ROLES.DOCTOR, doctorUserId) : null,
    hospitalUserId ? getUserRoom(ROLES.HOSPITAL, hospitalUserId) : null,
  ].filter(Boolean);

const buildSocketError = (error) => ({
  message: error?.message || "Internal server error",
  statusCode: error?.statusCode || 500,
  errors: error?.errors || null,
});

const sendSocketResponse = (socket, ack, successEvent, data) => {
  if (typeof ack === "function") {
    ack({ success: true, data });
    return;
  }

  socket.emit(successEvent, data);
};

const sendSocketError = (socket, ack, error) => {
  const payload = { success: false, error: buildSocketError(error) };

  if (typeof ack === "function") {
    ack(payload);
    return;
  }

  socket.emit(CHAT_SOCKET_EVENTS.ERROR, payload.error);
};

const getPayloadSize = (payload) => {
  try {
    return Buffer.byteLength(JSON.stringify(payload || {}));
  } catch {
    return SOCKET_MAX_PAYLOAD_BYTES + 1;
  }
};

const assertPayloadObject = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError(400, "Socket payload must be an object", null, "SOCKET_PAYLOAD_INVALID");
  }

  if (getPayloadSize(payload) > SOCKET_MAX_PAYLOAD_BYTES) {
    throw createHttpError(413, "Socket payload is too large", null, "SOCKET_PAYLOAD_TOO_LARGE");
  }
};

const assertMongoId = (value, field) => {
  if (!mongoose.isValidObjectId(String(value || ""))) {
    throw createHttpError(400, `${field} must be a valid mongo id`, null, "SOCKET_VALIDATION_ERROR");
  }
};

const assertOptionalString = (value, field, maxLength = 200) => {
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string" || value.length > maxLength) {
    throw createHttpError(400, `${field} is invalid`, null, "SOCKET_VALIDATION_ERROR");
  }
};

const validateConversationPayload = (payload) => {
  assertPayloadObject(payload);
  assertMongoId(payload.doctorId, "doctorId");
  assertMongoId(payload.hospitalId, "hospitalId");
  assertOptionalString(payload.conversationId, "conversationId");
};

const validateMessagePayload = (payload) => {
  validateConversationPayload(payload);
  if (!["quick", "manual"].includes(payload.type)) {
    throw createHttpError(400, "type must be quick or manual", null, "SOCKET_VALIDATION_ERROR");
  }
  if (typeof payload.message !== "string" || !payload.message.trim() || payload.message.length > 2000) {
    throw createHttpError(400, "message is required and must be at most 2000 characters", null, "SOCKET_VALIDATION_ERROR");
  }
};

const validateMessageMutationPayload = (payload) => {
  assertPayloadObject(payload);
  assertMongoId(payload.id, "id");
  if (payload.message !== undefined) {
    if (typeof payload.message !== "string" || !payload.message.trim() || payload.message.length > 2000) {
      throw createHttpError(400, "message is required and must be at most 2000 characters", null, "SOCKET_VALIDATION_ERROR");
    }
  }
};

const enforceSocketEventLimit = (socket, eventName) => {
  const now = Date.now();
  socket.data.rateBuckets = socket.data.rateBuckets || {};
  const bucket = socket.data.rateBuckets[eventName] || [];
  const recent = bucket.filter((timestamp) => now - timestamp < 60 * 1000);

  if (recent.length >= SOCKET_EVENT_LIMIT) {
    socket.data.rateBuckets[eventName] = recent;
    throw createHttpError(429, "Too many socket events. Please slow down.", null, "SOCKET_RATE_LIMITED");
  }

  recent.push(now);
  socket.data.rateBuckets[eventName] = recent;
};

const guardSocketEvent = (socket, eventName, payload, validator) => {
  enforceSocketEventLimit(socket, eventName);
  if (validator) {
    validator(payload || {});
  } else {
    assertPayloadObject(payload || {});
  }
};

const acknowledgeSuccess = (ack, data) => {
  if (typeof ack === "function") {
    ack({ success: true, data });
  }
};

const emitToRooms = (eventName, payload) => {
  if (!io) return;

  const rooms = [...new Set(getChatRooms(payload))];
  if (!rooms.length) return;

  let emitter = io;
  for (const room of rooms) {
    emitter = emitter.to(room);
  }

  emitter.emit(eventName, payload);
};

const emitMessageCreated = (payload) => {
  emitToRooms(CHAT_SOCKET_EVENTS.MESSAGE_CREATED, payload);
};

const emitMessageUpdated = (payload) => {
  emitToRooms(CHAT_SOCKET_EVENTS.MESSAGE_UPDATED, payload);
};

const emitMessageDeleted = (payload) => {
  emitToRooms(CHAT_SOCKET_EVENTS.MESSAGE_DELETED, payload);
};

const emitConversationRead = (payload) => {
  emitToRooms(CHAT_SOCKET_EVENTS.CONVERSATION_READ_UPDATED, payload);
};

const emitConversationCleared = (payload) => {
  emitToRooms(CHAT_SOCKET_EVENTS.CONVERSATION_CLEARED, payload);
};

const extractToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) {
    return String(authToken).replace(/^Bearer\s+/i, "").trim();
  }

  const headerToken = socket.handshake?.headers?.authorization;
  if (headerToken) {
    return String(headerToken).replace(/^Bearer\s+/i, "").trim();
  }

  const queryToken = socket.handshake?.query?.token;
  if (queryToken) {
    return String(queryToken).replace(/^Bearer\s+/i, "").trim();
  }

  return null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error("JWT_SECRET is not configured"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (![ROLES.DOCTOR, ROLES.HOSPITAL].includes(decoded?.role)) {
      return next(new Error("Only doctors and hospitals can access chat"));
    }

    const user = await User.findById(decoded.id)
      .select("_id email role loginStatus isEmailVerified")
      .lean();

    if (
      !user ||
      user.role !== decoded.role ||
      user.loginStatus !== LOGIN_STATUS.APPROVED ||
      !user.isEmailVerified
    ) {
      return next(new Error("Account is not active"));
    }

    socket.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
    };
    return next();
  } catch (error) {
    return next(new Error("Invalid or expired token"));
  }
};

const initializeChatRealtime = (server, corsOptions) => {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: corsOptions,
    maxHttpBufferSize: SOCKET_MAX_PAYLOAD_BYTES,
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    const role = socket.user?.role;
    socket.join(getUserRoom(role, userId));
    socket.emit(CHAT_SOCKET_EVENTS.CONNECTED, { userId, role });

    socket.on(CHAT_SOCKET_EVENTS.SUBSCRIBE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.SUBSCRIBE, payload, validateConversationPayload);
        const context = await chatService.getConversationContext({
          doctorId: payload.doctorId,
          hospitalId: payload.hospitalId,
          conversationId: payload.conversationId,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
        });

        const rooms = getChatRooms(context);
        await socket.join(rooms);

        const data = await chatService.listMessages({
          doctorId: payload.doctorId,
          hospitalId: payload.hospitalId,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
          query: {
            ...payload.query,
            conversationId: context.conversationId,
          },
        });

        sendSocketResponse(
          socket,
          ack,
          CHAT_SOCKET_EVENTS.SUBSCRIBED,
          Object.assign({}, data, {
            conversationId: context.conversationId,
            doctorId: context.doctorId,
            hospitalId: context.hospitalId,
          })
        );
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CHAT_SOCKET_EVENTS.UNSUBSCRIBE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.UNSUBSCRIBE, payload, validateConversationPayload);
        const context = await chatService.getConversationContext({
          doctorId: payload.doctorId,
          hospitalId: payload.hospitalId,
          conversationId: payload.conversationId,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
        });

        await socket.leave(getConversationRoom(context.conversationId));
        await socket.leave(getPairRoom(context.doctorId, context.hospitalId));

        sendSocketResponse(socket, ack, CHAT_SOCKET_EVENTS.UNSUBSCRIBED, {
          conversationId: context.conversationId,
          doctorId: context.doctorId,
          hospitalId: context.hospitalId,
        });
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CHAT_SOCKET_EVENTS.MESSAGES_LIST, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.MESSAGES_LIST, payload, validateConversationPayload);
        const data = await chatService.listMessages({
          doctorId: payload.doctorId,
          hospitalId: payload.hospitalId,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
          query: payload.query || {},
        });

        sendSocketResponse(socket, ack, CHAT_SOCKET_EVENTS.MESSAGES_RESULT, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CHAT_SOCKET_EVENTS.MESSAGE_CREATE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.MESSAGE_CREATE, payload, validateMessagePayload);
        const message = await chatService.createMessage({
          doctorId: payload.doctorId,
          hospitalId: payload.hospitalId,
          message: payload.message,
          type: payload.type,
          conversationId: payload.conversationId,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
        });

        emitMessageCreated(message);
        acknowledgeSuccess(ack, message);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CHAT_SOCKET_EVENTS.MESSAGE_UPDATE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.MESSAGE_UPDATE, payload, validateMessageMutationPayload);
        const message = await chatService.updateMessage({
          id: payload.id,
          message: payload.message,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
        });

        emitMessageUpdated(message);
        acknowledgeSuccess(ack, message);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CHAT_SOCKET_EVENTS.MESSAGE_DELETE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.MESSAGE_DELETE, payload, validateMessageMutationPayload);
        const data = await chatService.deleteMessage({
          id: payload.id,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
        });

        emitMessageDeleted(data);
        acknowledgeSuccess(ack, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CHAT_SOCKET_EVENTS.CONVERSATION_READ, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.CONVERSATION_READ, payload, validateConversationPayload);
        const data = await chatService.markConversationAsRead({
          doctorId: payload.doctorId,
          hospitalId: payload.hospitalId,
          conversationId: payload.conversationId,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
        });

        emitConversationRead(data);
        acknowledgeSuccess(ack, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CHAT_SOCKET_EVENTS.CONVERSATION_CLEAR, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CHAT_SOCKET_EVENTS.CONVERSATION_CLEAR, payload, validateConversationPayload);
        const data = await chatService.clearConversation({
          doctorId: payload.doctorId,
          hospitalId: payload.hospitalId,
          conversationId: payload.conversationId,
          requesterId: socket.user.id,
          requesterRole: socket.user.role,
        });

        emitConversationCleared(data);
        acknowledgeSuccess(ack, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });
  });

  return io;
};

module.exports = {
  CHAT_SOCKET_EVENTS,
  initializeChatRealtime,
  emitMessageCreated,
  emitMessageUpdated,
  emitMessageDeleted,
  emitConversationRead,
  emitConversationCleared,
};
