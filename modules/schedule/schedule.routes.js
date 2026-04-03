const express = require("express");
const scheduleController = require("./schedule.controller");
const scheduleValidation = require("./schedule.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware([ROLES.HOSPITAL]));

router.get("/bootstrap", scheduleController.getBootstrapData);

router.get(
  "/summary",
  scheduleValidation.summaryValidation,
  validationMiddleware,
  scheduleController.getScheduleSummary
);

router.get(
  "/tokens",
  scheduleValidation.listTokensValidation,
  validationMiddleware,
  scheduleController.listTokens
);

router.get(
  "/",
  scheduleValidation.listSchedulesValidation,
  validationMiddleware,
  scheduleController.listSchedules
);

router.post(
  "/",
  scheduleValidation.createScheduleValidation,
  validationMiddleware,
  scheduleController.createSchedule
);

router.post(
  "/assign-token",
  scheduleValidation.assignTokenValidation,
  validationMiddleware,
  scheduleController.assignToken
);

router.patch(
  "/tokens/:tokenId/status",
  scheduleValidation.updateTokenStatusValidation,
  validationMiddleware,
  scheduleController.updateTokenStatus
);

router.patch(
  "/:scheduleId",
  scheduleValidation.updateScheduleValidation,
  validationMiddleware,
  scheduleController.updateSchedule
);

router.delete(
  "/:scheduleId",
  scheduleValidation.deleteScheduleValidation,
  validationMiddleware,
  scheduleController.deleteSchedule
);

module.exports = router;
