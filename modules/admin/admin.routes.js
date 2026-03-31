const express = require("express");
const adminController = require("./admin.controller");
const adminValidation = require("./admin.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware([ROLES.ADMIN, ROLES.SUPER_ADMIN]));

router.get(
  "/doctors",
  adminValidation.listValidation,
  validationMiddleware,
  adminController.getDoctors
);
router.get(
  "/hospitals",
  adminValidation.listValidation,
  validationMiddleware,
  adminController.getHospitals
);
router.patch(
  "/doctors/:id/status",
  adminValidation.statusUpdateValidation,
  validationMiddleware,
  adminController.updateDoctorStatus
);
router.patch(
  "/hospitals/:id/status",
  adminValidation.statusUpdateValidation,
  validationMiddleware,
  adminController.updateHospitalStatus
);
router.post(
  "/subscription/default",
  adminValidation.defaultSubscriptionValidation,
  validationMiddleware,
  adminController.setDefaultSubscription
);
router.get("/subscription/default", adminController.getDefaultSubscription);
router.post(
  "/subscription/hospital",
  adminValidation.hospitalSubscriptionValidation,
  validationMiddleware,
  adminController.setHospitalSubscription
);

router.patch("/users/:id/approve", adminController.approveUser);
router.patch("/users/:id/reject", adminController.rejectUser);
router.patch("/users/:id/onboard", adminController.onboardUser);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
