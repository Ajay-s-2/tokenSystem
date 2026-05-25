const removeDangerousKeys = (input) => {
  if (Array.isArray(input)) {
    return input.map(removeDangerousKeys);
  }

  if (!input || typeof input !== "object") {
    return input;
  }

  for (const key of Object.keys(input)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype" || key.startsWith("$") || key.includes(".")) {
      delete input[key];
      continue;
    }

    input[key] = removeDangerousKeys(input[key]);
  }

  return input;
};

const mongoSanitizeMiddleware = (req, res, next) => {
  req.body = removeDangerousKeys(req.body || {});
  req.query = removeDangerousKeys(req.query || {});
  req.params = removeDangerousKeys(req.params || {});
  return next();
};

const xssCleanMiddleware = (req, res, next) => {
  const sanitizeString = (value) =>
    typeof value === "string"
      ? value.replace(/<script.*?>.*?<\/script>/gi, "").replace(/[<>]/g, "")
      : value;

  const sanitize = (input) => {
    if (Array.isArray(input)) return input.map(sanitize);
    if (!input || typeof input !== "object") return sanitizeString(input);

    for (const key of Object.keys(input)) {
      input[key] = sanitize(input[key]);
    }
    return input;
  };

  req.body = sanitize(req.body || {});
  req.query = sanitize(req.query || {});
  return next();
};

const hppMiddleware = (req, res, next) => {
  const normalize = (input) => {
    if (!input || typeof input !== "object") return input;

    for (const [key, value] of Object.entries(input)) {
      if (Array.isArray(value)) {
        input[key] = value[value.length - 1];
      }
    }

    return input;
  };

  req.query = normalize(req.query || {});
  return next();
};

module.exports = {
  mongoSanitizeMiddleware,
  xssCleanMiddleware,
  hppMiddleware,
};
