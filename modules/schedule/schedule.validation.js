const { body, param, query } = require("express-validator");
const { TIME_PATTERN } = require("./schedule.utils");

const contactValidator = (value) => {
  const normalizedValue = String(value || "").trim();
  const isPhone = /^\d{10}$/.test(normalizedValue);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
  return isPhone || isEmail;
};

const optionalDateQueryValidation = query("date")
  .optional()
  .isISO8601({ strict: true })
  .withMessage("date must be a valid YYYY-MM-DD value");

const optionalDoctorQueryValidation = query("doctorId")
  .optional()
  .isMongoId()
  .withMessage("doctorId must be a valid mongo id");

const optionalDepartmentQueryValidation = query("department")
  .optional()
  .trim()
  .notEmpty()
  .withMessage("department cannot be empty");

const scheduleIdParamValidation = param("scheduleId")
  .isMongoId()
  .withMessage("scheduleId must be a valid mongo id");

const tokenIdParamValidation = param("tokenId")
  .isMongoId()
  .withMessage("tokenId must be a valid mongo id");

const tokenStatusValidator = body("status")
  .trim()
  .notEmpty()
  .withMessage("status is required")
  .custom((value) => {
    const normalizedValue = String(value || "").trim();
    return (
      normalizedValue === "NOT_STARTED" ||
      normalizedValue === "COMPLETED" ||
      normalizedValue === "CALLING" ||
      normalizedValue.toLowerCase() === "inprogress"
    );
  })
  .withMessage("status must be one of NOT_STARTED, inprogress, COMPLETED");

const listSchedulesValidation = [
  optionalDateQueryValidation,
  optionalDoctorQueryValidation,
  optionalDepartmentQueryValidation,
];

const summaryValidation = [optionalDateQueryValidation];

const listTokensValidation = [
  optionalDateQueryValidation,
  optionalDoctorQueryValidation,
  optionalDepartmentQueryValidation,
];

const createScheduleValidation = [
  body("doctorId").isMongoId().withMessage("Valid doctorId is required"),
  body("department").trim().notEmpty().withMessage("Department is required"),
  body("date").isISO8601({ strict: true }).withMessage("Valid date is required"),
  body("startTime")
    .trim()
    .matches(TIME_PATTERN)
    .withMessage("startTime must be in HH:mm format"),
  body("endTime")
    .trim()
    .matches(TIME_PATTERN)
    .withMessage("endTime must be in HH:mm format"),
  body("consultationTime")
    .isInt({ gt: 0 })
    .withMessage("consultationTime must be a positive integer"),
];

const updateScheduleValidation = [
  scheduleIdParamValidation,
  ...createScheduleValidation,
];

const deleteScheduleValidation = [scheduleIdParamValidation];

const assignTokenValidation = [
  body("patientName").trim().notEmpty().withMessage("Patient name is required"),
  body("dob").isISO8601({ strict: true }).withMessage("Valid date of birth is required"),
  body("bloodGroup").trim().notEmpty().withMessage("Blood group is required"),
  body("aadhaar")
    .optional()
    .trim()
    .custom((value) => value === "" || /^\d{12}$/.test(value))
    .withMessage("Aadhaar must be 12 digits"),
  body("contact").custom(contactValidator).withMessage("Enter a valid 10-digit phone number or email"),
  body("department").trim().notEmpty().withMessage("Department is required"),
  body("date")
    .optional()
    .isISO8601({ strict: true })
    .withMessage("date must be a valid YYYY-MM-DD value"),
  body("doctorId")
    .optional()
    .isMongoId()
    .withMessage("doctorId must be a valid mongo id"),
];

const updateTokenStatusValidation = [tokenIdParamValidation, tokenStatusValidator];

module.exports = {
  listSchedulesValidation,
  summaryValidation,
  listTokensValidation,
  createScheduleValidation,
  updateScheduleValidation,
  deleteScheduleValidation,
  assignTokenValidation,
  updateTokenStatusValidation,
};
