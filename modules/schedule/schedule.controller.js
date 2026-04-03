const scheduleService = require("./schedule.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const getBootstrapData = async (req, res) => {
  try {
    const data = await scheduleService.getBootstrapData(req.user);
    return sendSuccess(res, "Schedule bootstrap data fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const listSchedules = async (req, res) => {
  try {
    const schedules = await scheduleService.listSchedules(req.query, req.user);
    return sendSuccess(res, "Doctor schedules fetched successfully", schedules);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const getScheduleSummary = async (req, res) => {
  try {
    const summary = await scheduleService.getScheduleSummary(req.query, req.user);
    return sendSuccess(res, "Doctor schedule summary fetched successfully", summary);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const createSchedule = async (req, res) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body, req.user);
    return sendSuccess(res, "Doctor schedule created successfully", schedule, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const updateSchedule = async (req, res) => {
  try {
    const schedule = await scheduleService.updateSchedule(req.params.scheduleId, req.body, req.user);
    return sendSuccess(res, "Doctor schedule updated successfully", schedule);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const result = await scheduleService.deleteSchedule(req.params.scheduleId, req.user);
    return sendSuccess(res, "Doctor schedule deleted successfully", result);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const listTokens = async (req, res) => {
  try {
    const tokens = await scheduleService.listTokens(req.query, req.user);
    return sendSuccess(res, "Patient tokens fetched successfully", tokens);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const assignToken = async (req, res) => {
  try {
    const result = await scheduleService.assignToken(req.body, req.user);
    return sendSuccess(res, "Patient token assigned successfully", result, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const updateTokenStatus = async (req, res) => {
  try {
    const token = await scheduleService.updateTokenStatus(
      req.params.tokenId,
      req.body.status,
      req.user
    );
    return sendSuccess(res, "Patient token status updated successfully", token);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

module.exports = {
  getBootstrapData,
  listSchedules,
  getScheduleSummary,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listTokens,
  assignToken,
  updateTokenStatus,
};
