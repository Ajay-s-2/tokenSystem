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
const {
  globalApiLimiter,
  authLimiter,
  logLimiter,
} = require("./middleware/rateLimiter.middleware");
const { getConfig } = require("./config/env");

const app = express();
const config = getConfig();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: config.enableApiDocs ? false : undefined,
  })
);

// Parse request bodies with safe limits
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.urlEncodedBodyLimit }));
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

// API abuse protection. Route-specific limiters are mounted before the global
// limiter so auth and log ingestion get tighter budgets without changing paths.
app.use("/api/auth", authLimiter);
app.use("/api/logs", logLimiter);
app.use("/api", globalApiLimiter);

// API routes
app.use("/api", routes);

// Swagger docs
if (config.enableApiDocs) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));
}

// 404 handler for unknown routes
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
    errorCode: "ROUTE_NOT_FOUND",
  });
});

// Central error handler
app.use(errorMiddleware);

module.exports = app;
