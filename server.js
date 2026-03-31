require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { ensureSuperAdmin, ensureDefaultDepartments } = require("./modules/superadmin/superadmin.service");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();

    // Ensure a super admin exists based on .env credentials
    await ensureSuperAdmin();

    // Ensure default departments are seeded
    await ensureDefaultDepartments();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log(`Swagger Docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
