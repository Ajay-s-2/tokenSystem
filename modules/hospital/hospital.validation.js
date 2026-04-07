const { body, param } = require("express-validator");

const createHospitalValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("departments")
    .isArray({ min: 1 })
    .withMessage("Departments must be a non-empty array"),
  body("departments.*")
    .trim()
    .notEmpty()
    .withMessage("Department entries must be non-empty strings"),
];

const hospitalIdValidation = [
  param("id").isMongoId().withMessage("Valid hospital id is required"),
];

const doctorApprovalValidation = [
  ...hospitalIdValidation,
  body("doctorId").isMongoId().withMessage("Valid doctor id is required"),
];

const updateDepartmentValidation = [
  ...hospitalIdValidation,
  body("departmentId").isMongoId().withMessage("Valid department id is required"),
];

const departmentAssignmentListValidation = [
  ...hospitalIdValidation,
];

const departmentAssignmentCreateValidation = [
  ...hospitalIdValidation,
  body("doctorId").isMongoId().withMessage("Valid doctor id is required"),
  body("departmentId").isMongoId().withMessage("Valid department id is required"),
];

const departmentAssignmentUpdateValidation = [
  ...hospitalIdValidation,
  param("doctorId").isMongoId().withMessage("Valid doctor id is required"),
  body("departmentId").isMongoId().withMessage("Valid department id is required"),
];

const departmentAssignmentDeleteValidation = [
  ...hospitalIdValidation,
  param("doctorId").isMongoId().withMessage("Valid doctor id is required"),
];

module.exports = {
  createHospitalValidation,
  hospitalIdValidation,
  doctorApprovalValidation,
  updateDepartmentValidation,
  departmentAssignmentListValidation,
  departmentAssignmentCreateValidation,
  departmentAssignmentUpdateValidation,
  departmentAssignmentDeleteValidation,
};
