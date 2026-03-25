require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { ensureSuperAdmin } = require("./modules/superadmin/superadmin.service");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();

    // Ensure a super admin exists based on .env credentials
    await ensureSuperAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
