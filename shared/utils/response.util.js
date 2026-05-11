const sendSuccess = (res, message, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message, status = 400, errors = null, errorCode = "REQUEST_ERROR") => {
  return res.status(status).json({
    success: false,
    message,
    errorCode,
    errors,
  });
};

module.exports = { sendSuccess, sendError };
