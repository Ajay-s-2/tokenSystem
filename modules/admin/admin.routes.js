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
router.patch(
  "/doctors/:id",
  adminValidation.updateDoctorValidation,
  validationMiddleware,
  adminController.updateDoctorProfile
);
router.delete(
  "/doctors/:id",
  adminValidation.entityIdValidation,
  validationMiddleware,
  adminController.deleteDoctor
);
router.patch(
  "/hospitals/:id",
  adminValidation.updateHospitalValidation,
  validationMiddleware,
  adminController.updateHospitalProfile
);
router.delete(
  "/hospitals/:id",
  adminValidation.entityIdValidation,
  validationMiddleware,
  adminController.deleteHospital
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

router.get("/doctor-subscriptions", adminController.getDoctorSubscriptions);
router.patch(
  "/doctor-subscriptions/:doctorId",
  adminValidation.doctorSubscriptionUpdateValidation,
  validationMiddleware,
  adminController.updateDoctorSubscription
);

router.patch("/users/:id/approve", adminController.approveUser);
router.patch("/users/:id/reject", adminController.rejectUser);
router.patch("/users/:id/onboard", adminController.onboardUser);
router.post(
  "/users/:id/email-change",
  adminValidation.emailChangeRequestValidation,
  validationMiddleware,
  adminController.requestUserEmailChange
);
router.post(
  "/users/:id/email-change/verify",
  adminValidation.emailChangeVerifyValidation,
  validationMiddleware,
  adminController.verifyUserEmailChange
);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
