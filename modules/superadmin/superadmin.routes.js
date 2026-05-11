const express = require("express");
const superAdminController = require("./superadmin.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");
const {
  adminCreateValidation,
  mongoIdParam,
} = require("../../shared/validators/common.validation");

const router = express.Router();

// Only super admin can access these endpoints
router.use(authMiddleware);
router.use(roleMiddleware([ROLES.SUPER_ADMIN]));

router.post(
  "/admins",
  adminCreateValidation,
  validationMiddleware,
  superAdminController.createAdmin
);
router.delete(
  "/admins/:id",
  mongoIdParam("id"),
  validationMiddleware,
  superAdminController.deleteAdmin
);

module.exports = router;
