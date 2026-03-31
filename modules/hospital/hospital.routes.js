const express = require("express");
const hospitalController = require("./hospital.controller");
const hospitalValidation = require("./hospital.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.HOSPITAL]),
  hospitalController.listHospitals
);

router.post(
  "/",
  roleMiddleware([ROLES.HOSPITAL]),
  hospitalValidation.createHospitalValidation,
  validationMiddleware,
  hospitalController.createHospital
);

router.get(
  "/:id",
  roleMiddleware([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.HOSPITAL]),
  hospitalValidation.hospitalIdValidation,
  validationMiddleware,
  hospitalController.getHospitalById
);

router.get(
  "/:id/pending-doctors",
  roleMiddleware([ROLES.HOSPITAL]),
  hospitalValidation.hospitalIdValidation,
  validationMiddleware,
  hospitalController.getPendingDoctors
);

router.get(
  "/:id/approved-doctors",
  roleMiddleware([ROLES.HOSPITAL]),
  hospitalValidation.hospitalIdValidation,
  validationMiddleware,
  hospitalController.getApprovedDoctors
);

router.get(
  "/:id/rejected-doctors",
  roleMiddleware([ROLES.HOSPITAL]),
  hospitalValidation.hospitalIdValidation,
  validationMiddleware,
  hospitalController.getRejectedDoctors
);

router.patch(
  "/:id/approve-doctor",
  roleMiddleware([ROLES.HOSPITAL]),
  hospitalValidation.doctorApprovalValidation,
  validationMiddleware,
  hospitalController.approveDoctor
);

router.patch(
  "/:id/reject-doctor",
  roleMiddleware([ROLES.HOSPITAL]),
  hospitalValidation.doctorApprovalValidation,
  validationMiddleware,
  hospitalController.rejectDoctor
);

router.get(
  "/:id/subscription",
  roleMiddleware([ROLES.HOSPITAL]),
  hospitalValidation.hospitalIdValidation,
  validationMiddleware,
  hospitalController.getSubscription
);

router.put(
  "/:id/department",
  roleMiddleware([ROLES.HOSPITAL, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  hospitalValidation.updateDepartmentValidation,
  validationMiddleware,
  hospitalController.updateHospitalDepartment
);

module.exports = router;
