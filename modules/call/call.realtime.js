const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const callService = require("./call.service");
const Hospital = require("../hospital/hospital.model");
const User = require("../user/user.model");
const { LOGIN_STATUS, ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");
const { parseCookies, ACCESS_COOKIE_NAME } = require("../../shared/utils/cookie.util");
const { verifyAccessToken } = require("../../shared/utils/token.util");
const authSessionRepository = require("../auth/auth-session.repository");

const CALL_SOCKET_EVENTS = Object.freeze({
  CONNECTED: "call:connected",
  ERROR: "call:error",
  SUBSCRIBE: "call:subscribe",
  SUBSCRIBED: "call:subscribed",
  ACTIVE_LIST: "call:active:list",
  ACTIVE_RESULT: "call:active",
  LOG_LIST: "call:log:list",
  LOG_RESULT: "call:logs",
  EVENT_LIST: "call:event:list",
  EVENT_RESULT: "call:events",
  TEMPLATE_LIST: "call:message-template:list",
  TEMPLATE_RESULT: "call:message-templates",
  CREATE: "call:create",
  CREATED: "call:created",
  ACKNOWLEDGE: "call:acknowledge",
  UPDATED: "call:updated",
  END: "call:end",
  ENDED: "call:ended",
  EVENT_CREATED: "call:event:created",
  TEMPLATE_CREATE: "call:message-template:create",
  TEMPLATE_CREATED: "call:message-template:created",
  TEMPLATE_UPDATE: "call:message-template:update",
  TEMPLATE_UPDATED: "call:message-template:updated",
  TEMPLATE_DELETE: "call:message-template:delete",
  TEMPLATE_DELETED: "call:message-template:deleted",
});

let io = null;
const CALL_SOCKET_EVENT_LIMIT = Number(process.env.CALL_SOCKET_EVENT_LIMIT_PER_MINUTE || 120);
const CALL_SOCKET_MAX_PAYLOAD_BYTES = Number(process.env.CALL_SOCKET_MAX_PAYLOAD_BYTES || 10000);
const CALL_SOCKET_PATH = process.env.CALL_SOCKET_PATH || "/call-socket.io";

const getDoctorRoom = (doctorUserId) => `call:user:doctor:${String(doctorUserId)}`;
const getHospitalRoom = (hospitalId) => `call:hospital:${String(hospitalId)}`;
const getAdminRoom = () => "call:admins";
const getSessionRoom = (callId) => `call:session:${String(callId)}`;

const getCallRooms = (payload = {}) =>
  [
    payload.doctorId ? getDoctorRoom(payload.doctorId) : null,
    payload.hospitalProfileId
      ? getHospitalRoom(payload.hospitalProfileId)
      : payload.hospitalId
        ? getHospitalRoom(payload.hospitalId)
        : null,
    payload.callSessionId ? getSessionRoom(payload.callSessionId) : payload.id ? getSessionRoom(payload.id) : null,
    getAdminRoom(),
  ].filter(Boolean);

const buildSocketError = (error) => ({
  message: error?.message || "Internal server error",
  statusCode: error?.statusCode || 500,
  errors: error?.errors || null,
});

const getPayloadSize = (payload) => {
  try {
    return Buffer.byteLength(JSON.stringify(payload || {}));
  } catch {
    return CALL_SOCKET_MAX_PAYLOAD_BYTES + 1;
  }
};

const assertPayloadObject = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError(400, "Socket payload must be an object", null, "SOCKET_PAYLOAD_INVALID");
  }

  if (getPayloadSize(payload) > CALL_SOCKET_MAX_PAYLOAD_BYTES) {
    throw createHttpError(413, "Socket payload is too large", null, "SOCKET_PAYLOAD_TOO_LARGE");
  }
};

const enforceSocketEventLimit = (socket, eventName) => {
  const now = Date.now();
  socket.data.callRateBuckets = socket.data.callRateBuckets || {};
  const bucket = socket.data.callRateBuckets[eventName] || [];
  const recent = bucket.filter((timestamp) => now - timestamp < 60 * 1000);

  if (recent.length >= CALL_SOCKET_EVENT_LIMIT) {
    socket.data.callRateBuckets[eventName] = recent;
    throw createHttpError(429, "Too many socket events. Please slow down.", null, "SOCKET_RATE_LIMITED");
  }

  recent.push(now);
  socket.data.callRateBuckets[eventName] = recent;
};

const guardSocketEvent = (socket, eventName, payload) => {
  enforceSocketEventLimit(socket, eventName);
  assertPayloadObject(payload || {});
};

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

  socket.emit(CALL_SOCKET_EVENTS.ERROR, payload.error);
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

  const cookieToken = parseCookies(socket.handshake?.headers?.cookie || "")[ACCESS_COOKIE_NAME];
  if (cookieToken) {
    return String(cookieToken).trim();
  }

  const queryToken = socket.handshake?.query?.token;
  if (queryToken) {
    return String(queryToken).replace(/^Bearer\s+/i, "").trim();
  }

  return null;
};

const authenticateCallSocket = async (socket, next) => {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = verifyAccessToken(token);
    if (![ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(decoded?.role)) {
      return next(new Error("Only active staff users can access call realtime"));
    }

    const [user, session] = await Promise.all([
      User.findById(decoded.id).select("_id email role loginStatus isEmailVerified tokenVersion").lean(),
      authSessionRepository.findActiveById(decoded.sessionId),
    ]);

    if (
      !user ||
      !session ||
      String(session.userId) !== String(user._id) ||
      user.role !== decoded.role ||
      Number(user.tokenVersion || 0) !== Number(decoded.tokenVersion || 0) ||
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

const emitToRooms = (eventName, payload) => {
  if (!io) return;

  const rooms = [...new Set(getCallRooms(payload))];
  if (!rooms.length) return;

  let emitter = io;
  for (const room of rooms) {
    emitter = emitter.to(room);
  }

  emitter.emit(eventName, payload);
};

const emitCallCreated = (payload) => {
  emitToRooms(CALL_SOCKET_EVENTS.CREATED, payload);
};

const emitCallUpdated = (payload) => {
  emitToRooms(CALL_SOCKET_EVENTS.UPDATED, payload);
};

const emitCallEnded = (payload) => {
  emitToRooms(CALL_SOCKET_EVENTS.ENDED, payload);
};

const emitCallEventCreated = (payload) => {
  emitToRooms(CALL_SOCKET_EVENTS.EVENT_CREATED, payload);
};

const emitCallTemplateCreated = (payload) => {
  if (!io) return;
  io.to(getDoctorRoom(payload.doctorUserId)).emit(CALL_SOCKET_EVENTS.TEMPLATE_CREATED, payload.template);
};

const emitCallTemplateUpdated = (payload) => {
  if (!io) return;
  io.to(getDoctorRoom(payload.doctorUserId)).emit(CALL_SOCKET_EVENTS.TEMPLATE_UPDATED, payload.template);
};

const emitCallTemplateDeleted = (payload) => {
  if (!io) return;
  io.to(getDoctorRoom(payload.doctorUserId)).emit(CALL_SOCKET_EVENTS.TEMPLATE_DELETED, {
    id: payload.templateId,
  });
};

let registered = false;

const initializeCallRealtime = async (server, corsOptions) => {
  if (io || registered) {
    return io;
  }

  io = new Server(server, {
    cors: corsOptions,
    maxHttpBufferSize: CALL_SOCKET_MAX_PAYLOAD_BYTES,
    path: CALL_SOCKET_PATH,
  });
  io.use(authenticateCallSocket);
  registered = true;

  io.on("connection", async (socket) => {
    const userId = socket.user?.id;
    const role = socket.user?.role;

    try {
      if (role === ROLES.DOCTOR) {
        await socket.join(getDoctorRoom(userId));
      } else if (role === ROLES.HOSPITAL) {
        const hospital = await Hospital.findOne({ userId }).select("_id").lean();
        if (hospital?._id) {
          await socket.join(getHospitalRoom(hospital._id));
        }
      } else if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
        await socket.join(getAdminRoom());
      }

      socket.emit(CALL_SOCKET_EVENTS.CONNECTED, { userId, role });
    } catch (error) {
      sendSocketError(socket, null, error);
      socket.disconnect(true);
      return;
    }

    socket.on(CALL_SOCKET_EVENTS.SUBSCRIBE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.SUBSCRIBE, payload);
        if (payload.callId) {
          await socket.join(getSessionRoom(payload.callId));
        }
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.SUBSCRIBED, {
          userId,
          role,
          callId: payload.callId || null,
        });
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.ACTIVE_LIST, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.ACTIVE_LIST, payload);
        const data = await callService.listActiveCalls(payload.query || {}, socket.user);
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.ACTIVE_RESULT, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.LOG_LIST, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.LOG_LIST, payload);
        const data = await callService.listCallLogs(payload.query || {}, socket.user);
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.LOG_RESULT, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.EVENT_LIST, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.EVENT_LIST, payload);
        const data = await callService.listCallEvents(payload.query || {}, socket.user);
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.EVENT_RESULT, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.TEMPLATE_LIST, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.TEMPLATE_LIST, payload);
        const data = await callService.listMessageTemplates(socket.user);
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.TEMPLATE_RESULT, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.CREATE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.CREATE, payload);
        const data = await callService.createCall(payload, socket.user);
        emitCallCreated(data.call);
        emitCallEventCreated(data.event);
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.CREATED, data.call);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.ACKNOWLEDGE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.ACKNOWLEDGE, payload);
        const data = await callService.acknowledgeCall(payload.callId, socket.user);
        emitCallUpdated(data.call);
        emitCallEventCreated(data.event);
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.UPDATED, data.call);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.END, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.END, payload);
        const data = await callService.endCall(payload.callId, payload, socket.user);
        emitCallEnded(data.call);
        emitCallEventCreated(data.event);
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.ENDED, data.call);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.TEMPLATE_CREATE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.TEMPLATE_CREATE, payload);
        const template = await callService.createMessageTemplate(payload, socket.user);
        emitCallTemplateCreated({ template, doctorUserId: socket.user.id });
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.TEMPLATE_CREATED, template);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.TEMPLATE_UPDATE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.TEMPLATE_UPDATE, payload);
        const template = await callService.updateMessageTemplate(payload.templateId, payload, socket.user);
        emitCallTemplateUpdated({ template, doctorUserId: socket.user.id });
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.TEMPLATE_UPDATED, template);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });

    socket.on(CALL_SOCKET_EVENTS.TEMPLATE_DELETE, async (payload = {}, ack) => {
      try {
        guardSocketEvent(socket, CALL_SOCKET_EVENTS.TEMPLATE_DELETE, payload);
        const data = await callService.deleteMessageTemplate(payload.templateId, socket.user);
        emitCallTemplateDeleted({ templateId: data.id, doctorUserId: socket.user.id });
        sendSocketResponse(socket, ack, CALL_SOCKET_EVENTS.TEMPLATE_DELETED, data);
      } catch (error) {
        sendSocketError(socket, ack, error);
      }
    });
  });

  return io;
};

module.exports = {
  CALL_SOCKET_EVENTS,
  CALL_SOCKET_PATH,
  initializeCallRealtime,
  emitCallCreated,
  emitCallUpdated,
  emitCallEnded,
  emitCallEventCreated,
  emitCallTemplateCreated,
  emitCallTemplateUpdated,
  emitCallTemplateDeleted,
};
