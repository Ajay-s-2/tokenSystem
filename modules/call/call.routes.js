const express = require("express");
const callController = require("./call.controller");
const callValidation = require("./call.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/bootstrap",
  roleMiddleware([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  callController.getBootstrapData
);

router.get(
  "/targets",
  roleMiddleware([ROLES.DOCTOR]),
  callController.listHospitalTargets
);

router.get(
  "/message-templates",
  roleMiddleware([ROLES.DOCTOR]),
  callController.listMessageTemplates
);

router.post(
  "/message-templates",
  roleMiddleware([ROLES.DOCTOR]),
  callValidation.createMessageTemplateValidation,
  validationMiddleware,
  callController.createMessageTemplate
);

router.patch(
  "/message-templates/:templateId",
  roleMiddleware([ROLES.DOCTOR]),
  callValidation.updateMessageTemplateValidation,
  validationMiddleware,
  callController.updateMessageTemplate
);

router.delete(
  "/message-templates/:templateId",
  roleMiddleware([ROLES.DOCTOR]),
  callValidation.deleteMessageTemplateValidation,
  validationMiddleware,
  callController.deleteMessageTemplate
);

router.get(
  "/active",
  roleMiddleware([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  callValidation.listCommonValidation,
  validationMiddleware,
  callController.listActiveCalls
);

router.get(
  "/logs",
  roleMiddleware([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  callValidation.listCallLogsValidation,
  validationMiddleware,
  callController.listCallLogs
);

router.get(
  "/events",
  roleMiddleware([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  callValidation.listCallEventsValidation,
  validationMiddleware,
  callController.listCallEvents
);

router.post(
  "/",
  roleMiddleware([ROLES.DOCTOR]),
  callValidation.createCallValidation,
  validationMiddleware,
  callController.createCall
);

router.patch(
  "/:callId/acknowledge",
  roleMiddleware([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  callValidation.acknowledgeCallValidation,
  validationMiddleware,
  callController.acknowledgeCall
);

router.patch(
  "/:callId/end",
  roleMiddleware([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  callValidation.endCallValidation,
  validationMiddleware,
  callController.endCall
);

module.exports = router;
