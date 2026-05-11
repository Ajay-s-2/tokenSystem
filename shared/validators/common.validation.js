const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const flexibleDepartmentIdParam = param("id")
  .custom((value) => {
    const normalized = String(value || "").trim();
    return mongoose.isValidObjectId(normalized) || /^DEP\d{3,}$/i.test(normalized);
  })
  .withMessage("Valid department id is required");

const departmentNameValidation = [
  body("departmentName")
    .trim()
    .notEmpty()
    .withMessage("Department name is required")
    .bail()
    .isLength({ max: 120 })
    .withMessage("Department name must be at most 120 characters"),
];

const adminCreateValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("age").isInt({ min: 0 }).withMessage("Age must be a non-negative integer"),
  body("gender").trim().notEmpty().withMessage("Gender is required"),
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
];

const mongoIdParam = (name = "id") =>
  param(name).isMongoId().withMessage(`Valid ${name} is required`);

module.exports = {
  adminCreateValidation,
  departmentNameValidation,
  flexibleDepartmentIdParam,
  mongoIdParam,
};
