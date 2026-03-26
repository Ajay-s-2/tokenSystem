const express = require("express");
const hospitalController = require("./hospital.controller");

const router = express.Router();

router.get("/:id", hospitalController.getHospitalById);
router.put("/:id/department", hospitalController.updateHospitalDepartment);

module.exports = router;
