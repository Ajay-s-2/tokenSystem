require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");
const errorMiddleware = require("./middleware/error.middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger.json");
const { getCorsOrigins, createCorsOriginChecker } = require("./config/cors");
const languageMiddleware = require("./middleware/language.middleware");
const requestLogger = require("./middleware/requestLogger.middleware");
const cookieMiddleware = require("./middleware/cookie.middleware");
const { csrfProtectionMiddleware, csrfTokenMiddleware } = require("./middleware/csrf.middleware");
const {
  mongoSanitizeMiddleware,
  xssCleanMiddleware,
  hppMiddleware,
} = require("./middleware/security.middleware");
const {
  globalApiLimiter,
  logLimiter,
} = require("./middleware/rateLimiter.middleware");
const { getConfig } = require("./config/env");
const { sendError } = require("./shared/utils/response.util");

const app = express();
const config = getConfig();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: config.enableApiDocs
      ? false
      : {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "connect-src": ["'self'"],
            "img-src": ["'self'", "data:"],
            "style-src": ["'self'", "'unsafe-inline'"],
          },
        },
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
  })
);

app.use((req, res, next) => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  return next();
});

// Parse request bodies with safe limits
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.urlEncodedBodyLimit }));
app.use(cookieMiddleware);
app.use(mongoSanitizeMiddleware);
app.use(xssCleanMiddleware);
app.use(hppMiddleware);
app.use(csrfTokenMiddleware);
app.use(languageMiddleware);

// Enable CORS for API clients
const corsOrigins = getCorsOrigins();
app.use(
  cors({
    origin: createCorsOriginChecker(corsOrigins),
    credentials: true,
  })
);

if (config.logHttpRequests) {
  app.use(requestLogger);
}

// API abuse protection. Route-specific auth limiters live on the exact routes
// so csrf-token and successful login requests do not consume the same bucket.
app.use("/api/logs", logLimiter);
app.use("/api", globalApiLimiter);
app.use("/api", csrfProtectionMiddleware);

// API routes
app.use("/api", routes);

// Swagger docs
if (config.enableApiDocs) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));
}

// 404 handler for unknown routes
app.use((req, res) => {
  return sendError(res, "Route not found", 404, null, "ROUTE_NOT_FOUND");
});

// Central error handler
app.use(errorMiddleware);

module.exports = app;
