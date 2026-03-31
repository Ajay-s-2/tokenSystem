const { sendError } = require("../shared/utils/response.util");

const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Unauthorized", 401);
    }

    // Allow only specific roles
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return sendError(res, "Forbidden: insufficient permissions", 403);
    }

    return next();
  };
};

module.exports = roleMiddleware;
