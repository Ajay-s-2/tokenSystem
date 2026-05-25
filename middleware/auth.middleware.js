const { sendError } = require("../shared/utils/response.util");
const { verifyAccessToken } = require("../shared/utils/token.util");
const { parseCookies, ACCESS_COOKIE_NAME } = require("../shared/utils/cookie.util");
const { getRolePermissions } = require("../shared/utils/authz.util");
const { LOGIN_STATUS, ROLES } = require("../shared/utils/constants");
const authSessionRepository = require("../modules/auth/auth-session.repository");
const User = require("../modules/user/user.model");

const VALID_ROLES = new Set(Object.values(ROLES));

const extractBearerToken = (headerValue) => {
  const [scheme, token] = String(headerValue || "").split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
};

const extractAccessToken = (req) => {
  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken) return bearerToken;

  const cookies = req.cookies || parseCookies(req.headers.cookie || "");
  return cookies[ACCESS_COOKIE_NAME] || null;
};

const buildUnauthorized = (res, message, errorCode = "UNAUTHORIZED") =>
  sendError(res, message, 401, null, errorCode);

const authMiddleware = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      return buildUnauthorized(res, "Authentication required", "AUTH_REQUIRED");
    }

    const decoded = verifyAccessToken(token);
    if (!decoded?.id || !decoded?.sessionId || !VALID_ROLES.has(decoded.role)) {
      return buildUnauthorized(res, "Invalid token payload", "TOKEN_PAYLOAD_INVALID");
    }

    const [user, session] = await Promise.all([
      User.findById(decoded.id).select("_id email role loginStatus isEmailVerified tokenVersion").lean(),
      authSessionRepository.findActiveById(decoded.sessionId),
    ]);

    if (!user || !session || String(session.userId) !== String(user._id)) {
      return buildUnauthorized(res, "Invalid or expired session", "SESSION_INVALID");
    }

    if (user.role !== decoded.role || Number(user.tokenVersion || 0) !== Number(decoded.tokenVersion || 0)) {
      return buildUnauthorized(res, "Invalid or expired token", "TOKEN_REVOKED");
    }

    if (user.loginStatus !== LOGIN_STATUS.APPROVED || !user.isEmailVerified) {
      return sendError(res, "Account is not active", 403, null, "ACCOUNT_INACTIVE");
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      sessionId: String(session._id),
      permissions: getRolePermissions(user.role),
      tokenVersion: Number(user.tokenVersion || 0),
    };

    req.authSession = session;
    return next();
  } catch (error) {
    return buildUnauthorized(res, "Invalid or expired token", "TOKEN_INVALID");
  }
};

module.exports = authMiddleware;
