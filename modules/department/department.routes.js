const express = require("express");
const departmentController = require("./department.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");
const {
  departmentNameValidation,
  flexibleDepartmentIdParam,
} = require("../../shared/validators/common.validation");

const router = express.Router();

router.get("/", departmentController.getDepartments);

router.post(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  departmentNameValidation,
  validationMiddleware,
  departmentController.createDepartment
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  flexibleDepartmentIdParam,
  departmentNameValidation,
  validationMiddleware,
  departmentController.updateDepartment
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  flexibleDepartmentIdParam,
  validationMiddleware,
  departmentController.deleteDepartment
);

module.exports = router;
