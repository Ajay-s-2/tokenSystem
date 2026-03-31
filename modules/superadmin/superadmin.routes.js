const express = require("express");
const superAdminController = require("./superadmin.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

// Only super admin can access these endpoints
router.use(authMiddleware);
router.use(roleMiddleware([ROLES.SUPER_ADMIN]));

router.post("/admins", superAdminController.createAdmin);
router.delete("/admins/:id", superAdminController.deleteAdmin);

module.exports = router;
