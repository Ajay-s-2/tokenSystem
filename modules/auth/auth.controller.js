const authService = require("./auth.service");
const { sendSuccess } = require("../../shared/utils/response.util");
const asyncHandler = require("../../middleware/async.middleware");
const {
  attachAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
} = require("../../shared/utils/cookie.util");

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body, req);
  return sendSuccess(res, data.message, { userId: data.userId }, 201);
});

const verifyRegisterOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyRegisterOtp(req.body, req);
  return sendSuccess(res, data.message);
});

const resendRegisterOtp = asyncHandler(async (req, res) => {
  const data = await authService.resendRegisterOtp(req.body, req);
  return sendSuccess(res, data.message);
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body, req);
  attachAuthCookies(res, data);
  return sendSuccess(res, "Login successful", {
    role: data.role,
    actualRole: data.actualRole,
    sessionId: data.sessionId,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refreshSession(
    { refreshToken: req.cookies?.[REFRESH_COOKIE_NAME] || null },
    req
  );
  attachAuthCookies(res, data);
  return sendSuccess(res, "Session refreshed", {
    role: data.role,
    actualRole: data.actualRole,
    sessionId: data.sessionId,
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(
    {
      sessionId: req.user?.sessionId || null,
      refreshToken: req.cookies?.[REFRESH_COOKIE_NAME] || null,
    },
    req
  );
  clearAuthCookies(res);
  return sendSuccess(res, "Logout successful");
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user, req);
  clearAuthCookies(res);
  return sendSuccess(res, "Logged out from all devices");
});

const getCsrfToken = asyncHandler(async (req, res) => {
  return sendSuccess(res, "CSRF token issued", {
    csrfToken: req.csrfToken(),
  });
});

module.exports = {
  register,
  verifyRegisterOtp,
  resendRegisterOtp,
  login,
  refresh,
  logout,
  logoutAll,
  getCsrfToken,
};
