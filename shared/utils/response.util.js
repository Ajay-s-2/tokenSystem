const sendSuccess = (res, message, data = null, status = 200, meta = null) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    error: null,
    meta,
  });
};

const sendError = (res, message, status = 400, errors = null, errorCode = "REQUEST_ERROR") => {
  return res.status(status).json({
    success: false,
    message,
    data: null,
    error: {
      code: errorCode,
      details: errors,
    },
    errors,
  });
};

module.exports = { sendSuccess, sendError };
