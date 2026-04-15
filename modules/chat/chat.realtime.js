const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const chatService = require("./chat.service");
const { ROLES } = require("../../shared/utils/constants");

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

const authenticateSocket = (socket, next) => {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error("JWT_SECRET is not configured"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (![ROLES.DOCTOR, ROLES.HOSPITAL].includes(decoded?.role)) {
      return next(new Error("Only doctors and hospitals can access chat"));
    }

    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error("Invalid or expired token"));
  }
};

const initializeChatRealtime = (server, corsOrigins) => {
  io = new Server(server, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    const role = socket.user?.role;
    socket.join(getUserRoom(role, userId));
    socket.emit(CHAT_SOCKET_EVENTS.CONNECTED, { userId, role });

    socket.on(CHAT_SOCKET_EVENTS.SUBSCRIBE, async (payload = {}, ack) => {
      try {
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
