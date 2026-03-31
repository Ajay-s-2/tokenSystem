const authService = require("./auth.service");
const { sendSuccess, sendError } = require("../../shared/utils/response.util");

const register = async (req, res) => {
  try {
    const data = await authService.register(req.body);
    return sendSuccess(res, data.message, { userId: data.userId }, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const verifyRegisterOtp = async (req, res) => {
  try {
    const data = await authService.verifyRegisterOtp(req.body);
    return sendSuccess(res, data.message);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const login = async (req, res) => {
  try {
    const data = await authService.login(req.body);
    return sendSuccess(res, data.message);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

const verifyLoginOtp = async (req, res) => {
  try {
    const data = await authService.verifyLoginOtp(req.body);
    return sendSuccess(res, "Login successful", data);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.errors || null);
  }
};

module.exports = {
  register,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
};
