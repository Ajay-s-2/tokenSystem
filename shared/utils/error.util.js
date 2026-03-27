const createHttpError = (statusCode, message, errors = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
};

module.exports = {
  createHttpError,
};
