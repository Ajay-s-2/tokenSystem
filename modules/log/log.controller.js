const logService = require("./log.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const createLog = async (req, res) => {
  try {
    const log = await logService.createLog(req.body, {
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      requestMethod: req.method,
      requestPath: req.originalUrl || req.path,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return sendSuccess(res, "Log saved successfully", log, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const getLogs = async (req, res) => {
  try {
    const data = await logService.listLogs(req.query);
    return sendSuccess(res, "Logs fetched successfully", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const deleteLog = async (req, res) => {
  try {
    const data = await logService.deleteLogById(req.params.id);
    return sendSuccess(res, "Log deleted successfully", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

module.exports = {
  createLog,
  getLogs,
  deleteLog,
};
