const jwt = require("jsonwebtoken");
const User = require("../modules/user/user.model");
const { LOGIN_STATUS, ROLES } = require("../shared/utils/constants");

const isEnvSuperAdminToken = (decoded) =>
  decoded?.id === "super_admin" &&
  decoded?.role === ROLES.SUPER_ADMIN &&
  process.env.SUPER_ADMIN_EMAIL &&
  String(decoded.email || "").toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase();

const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });

    if (isEnvSuperAdminToken(decoded)) {
      req.user = decoded;
      return next();
    }

    const user = await User.findById(decoded.id)
      .select("_id email role loginStatus isEmailVerified")
      .lean();

    if (user && user.role === decoded.role && user.loginStatus === LOGIN_STATUS.APPROVED && user.isEmailVerified) {
      req.user = {
        id: String(user._id),
        role: user.role,
        email: user.email,
      };
    }
  } catch {
    // Ignore invalid optional auth headers so public log ingestion still works.
  }

  return next();
};

module.exports = optionalAuthMiddleware;
