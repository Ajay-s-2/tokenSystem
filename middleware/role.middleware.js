const { sendError } = require("../shared/utils/response.util");
const { ROLES } = require("../shared/utils/constants");

const VALID_ROLES = new Set(Object.values(ROLES));

const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Unauthorized", 401, null, "UNAUTHORIZED");
    }

    // Allow only specific roles
    const userRole = req.user.role;
    if (!VALID_ROLES.has(userRole) || !allowedRoles.includes(userRole)) {
      return sendError(res, "Forbidden: insufficient permissions", 403, null, "FORBIDDEN");
    }

    return next();
  };
};

module.exports = roleMiddleware;
