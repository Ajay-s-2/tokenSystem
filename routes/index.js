const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const departmentRoutes = require("../modules/department/department.routes");
const doctorRoutes = require("../modules/doctor/doctor.routes");
const hospitalRoutes = require("../modules/hospital/hospital.routes");
const superAdminRoutes = require("../modules/superadmin/superadmin.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  return res.status(200).json({ success: true, message: "OK" });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/departments", departmentRoutes);
router.use("/doctors", doctorRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/hospital", hospitalRoutes);
router.use("/superadmin", superAdminRoutes);

module.exports = router;
