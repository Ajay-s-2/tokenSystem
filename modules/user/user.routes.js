const express = require("express");
const userController = require("./user.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", userController.getMe);

router.patch(
  "/me/department",
  roleMiddleware([ROLES.COMMON_USER]),
  userController.updateMyDepartment
);

module.exports = router;
