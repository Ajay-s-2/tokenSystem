const jwt = require("jsonwebtoken");
const { sendError } = require("../shared/utils/response.util");
const User = require("../modules/user/user.model");
const { LOGIN_STATUS, ROLES } = require("../shared/utils/constants");

const VALID_ROLES = new Set(Object.values(ROLES));

const isEnvSuperAdminToken = (decoded) =>
  decoded?.id === "super_admin" &&
  decoded?.role === ROLES.SUPER_ADMIN &&
  process.env.SUPER_ADMIN_EMAIL &&
  String(decoded.email || "").toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendError(res, "Authorization header missing", 401, null, "AUTH_HEADER_MISSING");
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return sendError(res, "Invalid authorization format", 401, null, "AUTH_FORMAT_INVALID");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return sendError(res, "JWT_SECRET is not configured", 500, null, "JWT_SECRET_MISSING");
    }

    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (!decoded?.id || !VALID_ROLES.has(decoded.role)) {
      return sendError(res, "Invalid token payload", 401, null, "TOKEN_PAYLOAD_INVALID");
    }

    if (isEnvSuperAdminToken(decoded)) {
      req.user = decoded;
      return next();
    }

    const user = await User.findById(decoded.id)
      .select("_id email role loginStatus isEmailVerified")
      .lean();

    if (!user || user.role !== decoded.role) {
      return sendError(res, "Invalid or expired token", 401, null, "TOKEN_USER_INVALID");
    }

    if (user.loginStatus !== LOGIN_STATUS.APPROVED || !user.isEmailVerified) {
      return sendError(res, "Account is not active", 403, null, "ACCOUNT_INACTIVE");
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
    };
    return next();
  } catch (error) {
    return sendError(res, "Invalid or expired token", 401, null, "TOKEN_INVALID");
  }
};

module.exports = authMiddleware;
