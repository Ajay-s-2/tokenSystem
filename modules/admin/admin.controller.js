const adminService = require("./admin.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const getDoctors = async (req, res) => {
  try {
    const data = await adminService.getDoctors(req.query);
    return sendSuccess(res, "Doctors fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const getHospitals = async (req, res) => {
  try {
    const data = await adminService.getHospitals(req.query);
    return sendSuccess(res, "Hospitals fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const updateDoctorStatus = async (req, res) => {
  try {
    const doctor = await adminService.updateDoctorStatus(req.params.id, req.body.status);
    return sendSuccess(res, "Doctor status updated successfully", doctor);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const updateHospitalStatus = async (req, res) => {
  try {
    const hospital = await adminService.updateHospitalStatus(req.params.id, req.body.status);
    return sendSuccess(res, "Hospital status updated successfully", hospital);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const setDefaultSubscription = async (req, res) => {
  try {
    const subscription = await adminService.setDefaultSubscription(req.body.amount);
    return sendSuccess(res, "Default subscription updated successfully", subscription);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const getDefaultSubscription = async (req, res) => {
  try {
    const subscription = await adminService.getDefaultSubscription();
    return sendSuccess(res, "Default subscription fetched successfully", subscription);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const setHospitalSubscription = async (req, res) => {
  try {
    const hospital = await adminService.setHospitalSubscription(req.body);
    return sendSuccess(res, "Hospital subscription updated successfully", {
      hospitalId: hospital._id,
      subscription_amount: hospital.subscriptionAmount,
    });
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const getDoctorSubscriptions = async (req, res) => {
  try {
    const data = await adminService.getDoctorSubscriptions();
    return sendSuccess(res, "Doctor subscriptions fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const updateDoctorSubscription = async (req, res) => {
  try {
    const record = await adminService.updateDoctorSubscription(
      req.params.doctorId,
      req.body.ratePerHospital
    );
    return sendSuccess(res, "Doctor subscription updated successfully", record);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const approveUser = async (req, res) => {
  try {
    const user = await adminService.approveUser(req.params.id);
    return sendSuccess(res, "User approved", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const rejectUser = async (req, res) => {
  try {
    const user = await adminService.rejectUser(req.params.id);
    return sendSuccess(res, "User rejected", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const onboardUser = async (req, res) => {
  try {
    const user = await adminService.onboardUser(req.params.id);
    return sendSuccess(res, "User onboarded", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await adminService.deleteUser(req.params.id);
    return sendSuccess(res, "User deleted", { id: user._id });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  getDoctors,
  getHospitals,
  updateDoctorStatus,
  updateHospitalStatus,
  setDefaultSubscription,
  getDefaultSubscription,
  setHospitalSubscription,
  getDoctorSubscriptions,
  updateDoctorSubscription,
  approveUser,
  rejectUser,
  onboardUser,
  deleteUser,
};
