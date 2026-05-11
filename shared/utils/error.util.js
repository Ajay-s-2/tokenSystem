const createHttpError = (statusCode, message, errors = null, errorCode = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  error.errorCode = errorCode;
  return error;
};

module.exports = {
  createHttpError,
};
