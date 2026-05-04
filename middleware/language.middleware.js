const { getRequestLanguage } = require("../shared/utils/localization.util");

const languageMiddleware = (req, _res, next) => {
  req.language = getRequestLanguage(req);
  next();
};

module.exports = languageMiddleware;
