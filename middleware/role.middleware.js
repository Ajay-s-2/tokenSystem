const { sendError } = require("../shared/utils/response.util");
const { hasRoleAccess, hasPermissionAccess } = require("../shared/utils/authz.util");

const roleMiddleware = (allowedRoles = [], requiredPermissions = []) => {
  const normalizedPermissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions].filter(Boolean);

  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Unauthorized", 401, null, "UNAUTHORIZED");
    }

    if (!hasRoleAccess(req.user.role, allowedRoles)) {
      return sendError(res, "Forbidden: insufficient role access", 403, null, "FORBIDDEN");
    }

    if (!hasPermissionAccess(req.user.role, normalizedPermissions)) {
      return sendError(res, "Forbidden: missing permissions", 403, null, "FORBIDDEN");
    }

    return next();
  };
};

module.exports = roleMiddleware;
