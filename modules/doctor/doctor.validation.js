const { body, param } = require("express-validator");

const createDoctorValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("gender").trim().notEmpty().withMessage("Gender is required"),
  body("dob").isISO8601().withMessage("Valid date of birth is required"),
  body("blood_group").trim().notEmpty().withMessage("Blood group is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("department").trim().notEmpty().withMessage("Department is required"),
  body("specialization").optional().trim().isString().withMessage("Specialization must be a string"),
  body("medicalRegistrationId")
    .optional()
    .trim()
    .isString()
    .withMessage("Medical registration ID must be a string"),
];

const doctorIdValidation = [
  param("id").isMongoId().withMessage("Valid doctor id is required"),
];

const selectHospitalValidation = [
  ...doctorIdValidation,
  body("hospitalId").isMongoId().withMessage("Valid hospital id is required"),
];

module.exports = {
  createDoctorValidation,
  doctorIdValidation,
  selectHospitalValidation,
};
