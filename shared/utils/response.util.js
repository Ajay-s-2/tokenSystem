const sendSuccess = (res, message, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message, status = 400, errors = null) => {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
};

module.exports = { sendSuccess, sendError };
