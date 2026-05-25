const jwt = require("jsonwebtoken");
const { getConfig } = require("../../config/env");

const ACCESS_TOKEN_TYPE = "access";
const REFRESH_TOKEN_TYPE = "refresh";

const parseDurationToMs = (value) => {
  if (typeof value === "number") return value;

  const normalized = String(value || "").trim();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "ms"
      ? 1
      : unit === "s"
        ? 1000
        : unit === "m"
          ? 60 * 1000
          : unit === "h"
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;

  return amount * multiplier;
};

const assertSecrets = () => {
  const config = getConfig();
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  if (!config.jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return config;
};

const buildAccessTokenPayload = ({ user, sessionId }) => ({
  type: ACCESS_TOKEN_TYPE,
  sessionId,
  id: String(user._id || user.id),
  role: user.role,
  email: user.email,
  tokenVersion: Number(user.tokenVersion || 0),
});

const buildRefreshTokenPayload = ({ user, sessionId, familyId }) => ({
  type: REFRESH_TOKEN_TYPE,
  sessionId,
  familyId,
  id: String(user._id || user.id),
  role: user.role,
  email: user.email,
  tokenVersion: Number(user.tokenVersion || 0),
});

const signAccessToken = ({ user, sessionId }) => {
  const config = assertSecrets();
  return jwt.sign(buildAccessTokenPayload({ user, sessionId }), config.jwtSecret, {
    expiresIn: config.accessTokenExpiresIn,
    algorithm: "HS256",
  });
};

const signRefreshToken = ({ user, sessionId, familyId }) => {
  const config = assertSecrets();
  return jwt.sign(buildRefreshTokenPayload({ user, sessionId, familyId }), config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenExpiresIn,
    algorithm: "HS256",
  });
};

const issueTokenPair = ({ user, sessionId, familyId }) => ({
  accessToken: signAccessToken({ user, sessionId }),
  refreshToken: signRefreshToken({ user, sessionId, familyId }),
});

const verifyAccessToken = (token) => {
  const config = assertSecrets();
  const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });

  if (decoded?.type !== ACCESS_TOKEN_TYPE) {
    throw new Error("Invalid access token");
  }

  return decoded;
};

const verifyRefreshToken = (token) => {
  const config = assertSecrets();
  const decoded = jwt.verify(token, config.jwtRefreshSecret, { algorithms: ["HS256"] });

  if (decoded?.type !== REFRESH_TOKEN_TYPE) {
    throw new Error("Invalid refresh token");
  }

  return decoded;
};

const getAccessTokenExpiryDate = () => {
  const config = getConfig();
  return new Date(Date.now() + parseDurationToMs(config.accessTokenExpiresIn));
};

const getRefreshTokenExpiryDate = () => {
  const config = getConfig();
  return new Date(Date.now() + parseDurationToMs(config.refreshTokenExpiresIn));
};

module.exports = {
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE,
  issueTokenPair,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getAccessTokenExpiryDate,
  getRefreshTokenExpiryDate,
  parseDurationToMs,
};
