require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { getCorsOrigins, createCorsOriginChecker } = require("./config/cors");
const { ensureSuperAdmin, ensureDefaultDepartments } = require("./modules/superadmin/superadmin.service");
const { initializeChatRealtime } = require("./modules/chat/chat.realtime");
const { getConfig, validateStartupConfig } = require("./config/env");
const { logger } = require("./shared/utils/logger.util");

const config = getConfig();
const PORT = config.port;

const startServer = async () => {
  try {
    validateStartupConfig({ logger });
    await connectDB();

    // Ensure a super admin exists based on .env credentials
    await ensureSuperAdmin();

    // Ensure default departments are seeded
    await ensureDefaultDepartments();

    const corsOrigins = getCorsOrigins();
    const server = http.createServer(app);
    initializeChatRealtime(server, {
      origin: createCorsOriginChecker(corsOrigins),
      credentials: true,
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(
          { port: PORT },
          `Port ${PORT} is already in use. Stop the existing process or set a different PORT in .env.`
        );
      } else {
        logger.error({ err: error }, "Server listen error");
      }

      process.exit(1);
    });

    server.listen(PORT, () => {
      logger.info(
        {
          port: PORT,
          apiBaseUrl: `http://localhost:${PORT}/api`,
          apiDocsEnabled: config.enableApiDocs,
          chatSocketUrl: `http://localhost:${PORT}`,
        },
        "Server started"
      );
    });

    const shutdown = (signal) => {
      logger.info({ signal }, "Shutting down server");
      server.close(async () => {
        try {
          await require("mongoose").connection.close(false);
          logger.info("Server shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, "Error during shutdown");
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
