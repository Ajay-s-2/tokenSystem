const express = require("express");
const departmentController = require("./department.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.get("/", departmentController.getDepartments);

router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.SUPER_ADMIN]),
  departmentController.createDepartment
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.SUPER_ADMIN]),
  departmentController.updateDepartment
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.SUPER_ADMIN]),
  departmentController.deleteDepartment
);

module.exports = router;
