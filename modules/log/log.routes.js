const express = require("express");
const logController = require("./log.controller");
const logValidation = require("./log.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const optionalAuthMiddleware = require("../../middleware/optional-auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.post(
  "/",
  optionalAuthMiddleware,
  logValidation.createLogValidation,
  validationMiddleware,
  logController.createLog
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  logValidation.listLogsValidation,
  validationMiddleware,
  logController.getLogs
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  logValidation.deleteLogValidation,
  validationMiddleware,
  logController.deleteLog
);

module.exports = router;
