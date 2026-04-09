const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const chatRoutes = require("../modules/chat/chat.routes");
const departmentRoutes = require("../modules/department/department.routes");
const doctorRoutes = require("../modules/doctor/doctor.routes");
const hospitalRoutes = require("../modules/hospital/hospital.routes");
const logRoutes = require("../modules/log/log.routes");
const scheduleRoutes = require("../modules/schedule/schedule.routes");
const superAdminRoutes = require("../modules/superadmin/superadmin.routes");
const userRoutes = require("../modules/user/user.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  return res.status(200).json({ success: true, message: "OK" });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/chat", chatRoutes);
router.use("/departments", departmentRoutes);
router.use("/doctors", doctorRoutes);
router.use("/doctor-schedules", scheduleRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/hospital", hospitalRoutes);
router.use("/logs", logRoutes);
router.use("/superadmin", superAdminRoutes);
router.use("/users", userRoutes);

module.exports = router;
