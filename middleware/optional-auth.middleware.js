const { verifyAccessToken } = require("../shared/utils/token.util");
const { parseCookies, ACCESS_COOKIE_NAME } = require("../shared/utils/cookie.util");
const { getRolePermissions } = require("../shared/utils/authz.util");
const { LOGIN_STATUS } = require("../shared/utils/constants");
const authSessionRepository = require("../modules/auth/auth-session.repository");
const User = require("../modules/user/user.model");

const extractAccessToken = (req) => {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme === "Bearer" && token) {
    return token.trim();
  }

  const cookies = req.cookies || parseCookies(req.headers.cookie || "");
  return cookies[ACCESS_COOKIE_NAME] || null;
};

const optionalAuthMiddleware = async (req, res, next) => {
  const token = extractAccessToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const [user, session] = await Promise.all([
      User.findById(decoded.id).select("_id email role loginStatus isEmailVerified tokenVersion").lean(),
      authSessionRepository.findActiveById(decoded.sessionId),
    ]);

    if (
      user &&
      session &&
      String(session.userId) === String(user._id) &&
      user.role === decoded.role &&
      Number(user.tokenVersion || 0) === Number(decoded.tokenVersion || 0) &&
      user.loginStatus === LOGIN_STATUS.APPROVED &&
      user.isEmailVerified
    ) {
      req.user = {
        id: String(user._id),
        role: user.role,
        email: user.email,
        sessionId: String(session._id),
        permissions: getRolePermissions(user.role),
        tokenVersion: Number(user.tokenVersion || 0),
      };
      req.authSession = session;
    }
  } catch {
    // Optional auth should never block public routes.
  }

  return next();
};

module.exports = optionalAuthMiddleware;
