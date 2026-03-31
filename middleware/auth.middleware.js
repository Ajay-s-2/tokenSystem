const jwt = require("jsonwebtoken");
const { sendError } = require("../shared/utils/response.util");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendError(res, "Authorization header missing", 401);
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return sendError(res, "Invalid authorization format", 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return sendError(res, "JWT_SECRET is not configured", 500);
    }

    // Verify token and attach user payload
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return sendError(res, "Invalid or expired token", 401);
  }
};

module.exports = authMiddleware;
