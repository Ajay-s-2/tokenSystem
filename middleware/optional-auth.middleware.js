const jwt = require("jsonwebtoken");

const optionalAuthMiddleware = (req, res, next) => {
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
    req.user = jwt.verify(token, secret);
  } catch {
    // Ignore invalid optional auth headers so public log ingestion still works.
  }

  return next();
};

module.exports = optionalAuthMiddleware;
