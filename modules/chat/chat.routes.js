const express = require("express");
const chatController = require("./chat.controller");
const chatValidation = require("./chat.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware([ROLES.DOCTOR, ROLES.HOSPITAL]));

router.get(
  "/messages",
  chatValidation.listMessagesValidation,
  validationMiddleware,
  chatController.listMessages
);

router.post(
  "/messages",
  chatValidation.createMessageValidation,
  validationMiddleware,
  chatController.createMessage
);

router.patch(
  "/messages/:id",
  chatValidation.updateMessageValidation,
  validationMiddleware,
  chatController.updateMessage
);

router.delete(
  "/messages/:id",
  chatValidation.deleteMessageValidation,
  validationMiddleware,
  chatController.deleteMessage
);

router.patch(
  "/conversations/read",
  chatValidation.markConversationReadValidation,
  validationMiddleware,
  chatController.markConversationAsRead
);

router.delete(
  "/conversations",
  chatValidation.clearConversationValidation,
  validationMiddleware,
  chatController.clearConversation
);

module.exports = router;
