const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

function getCorsOrigins() {
  const configured = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean)
        .filter((origin) => origin !== "*")
    : [];

  return configured.length ? configured : DEFAULT_CORS_ORIGINS;
}

function createCorsOriginChecker(origins) {
  return (origin, callback) => {
    const normalizedOrigin = origin ? origin.replace(/\/+$/, "") : origin;

    if (!normalizedOrigin || origins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${normalizedOrigin} is not allowed by CORS`));
  };
}

module.exports = {
  getCorsOrigins,
  createCorsOriginChecker,
};
