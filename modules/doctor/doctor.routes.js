const express = require("express");
const doctorController = require("./doctor.controller");
const doctorValidation = require("./doctor.validation");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validationMiddleware = require("../../middleware/validation.middleware");
const { ROLES } = require("../../shared/utils/constants");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware([ROLES.DOCTOR]),
  doctorValidation.createDoctorValidation,
  validationMiddleware,
  doctorController.createDoctor
);

router.get(
  "/:id",
  roleMiddleware([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.HOSPITAL]),
  doctorValidation.doctorIdValidation,
  validationMiddleware,
  doctorController.getDoctorById
);

router.post(
  "/:id/select-hospital",
  roleMiddleware([ROLES.DOCTOR]),
  doctorValidation.selectHospitalValidation,
  validationMiddleware,
  doctorController.selectHospital
);

module.exports = router;
