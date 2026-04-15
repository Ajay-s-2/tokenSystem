require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { ensureSuperAdmin, ensureDefaultDepartments } = require("./modules/superadmin/superadmin.service");
const { initializeChatRealtime } = require("./modules/chat/chat.realtime");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();

    // Ensure a super admin exists based on .env credentials
    await ensureSuperAdmin();

    // Ensure default departments are seeded
    await ensureDefaultDepartments();

    const corsOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : "*";
    const server = http.createServer(app);
    initializeChatRealtime(server, corsOrigins);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log(`Swagger Docs: http://localhost:${PORT}/api/docs`);
      console.log(`Chat Socket.IO: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
