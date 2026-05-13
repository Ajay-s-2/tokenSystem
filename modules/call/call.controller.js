const callService = require("./call.service");
const callRealtime = require("./call.realtime");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const getBootstrapData = async (req, res) => {
  try {
    const data = await callService.getBootstrapData(req.user);
    return sendSuccess(res, "Call bootstrap data fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const listHospitalTargets = async (req, res) => {
  try {
    const targets = await callService.listHospitalTargets(req.user);
    return sendSuccess(res, "Call targets fetched successfully", targets);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const listMessageTemplates = async (req, res) => {
  try {
    const templates = await callService.listMessageTemplates(req.user);
    return sendSuccess(res, "Call message templates fetched successfully", templates);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const createMessageTemplate = async (req, res) => {
  try {
    const template = await callService.createMessageTemplate(req.body, req.user);
    callRealtime.emitCallTemplateCreated({ template, doctorUserId: req.user.id });
    return sendSuccess(res, "Call message template created successfully", template, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const updateMessageTemplate = async (req, res) => {
  try {
    const template = await callService.updateMessageTemplate(req.params.templateId, req.body, req.user);
    callRealtime.emitCallTemplateUpdated({ template, doctorUserId: req.user.id });
    return sendSuccess(res, "Call message template updated successfully", template);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const deleteMessageTemplate = async (req, res) => {
  try {
    const result = await callService.deleteMessageTemplate(req.params.templateId, req.user);
    callRealtime.emitCallTemplateDeleted({ templateId: result.id, doctorUserId: req.user.id });
    return sendSuccess(res, "Call message template deleted successfully", result);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const listActiveCalls = async (req, res) => {
  try {
    const calls = await callService.listActiveCalls(req.query, req.user);
    return sendSuccess(res, "Active calls fetched successfully", calls);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const listCallLogs = async (req, res) => {
  try {
    const logs = await callService.listCallLogs(req.query, req.user);
    return sendSuccess(res, "Call logs fetched successfully", logs);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const listCallEvents = async (req, res) => {
  try {
    const events = await callService.listCallEvents(req.query, req.user);
    return sendSuccess(res, "Call events fetched successfully", events);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const createCall = async (req, res) => {
  try {
    const data = await callService.createCall(req.body, req.user);
    callRealtime.emitCallCreated(data.call);
    callRealtime.emitCallEventCreated(data.event);
    return sendSuccess(res, "Call created successfully", data.call, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const acknowledgeCall = async (req, res) => {
  try {
    const data = await callService.acknowledgeCall(req.params.callId, req.user);
    callRealtime.emitCallUpdated(data.call);
    callRealtime.emitCallEventCreated(data.event);
    return sendSuccess(res, "Call acknowledged successfully", data.call);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

const endCall = async (req, res) => {
  try {
    const data = await callService.endCall(req.params.callId, req.body, req.user);
    callRealtime.emitCallEnded(data.call);
    callRealtime.emitCallEventCreated(data.event);
    return sendSuccess(res, "Call ended successfully", data.call);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null, error.errorCode);
  }
};

module.exports = {
  getBootstrapData,
  listHospitalTargets,
  listMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  listActiveCalls,
  listCallLogs,
  listCallEvents,
  createCall,
  acknowledgeCall,
  endCall,
};
