const { getConfig } = require("../../config/env");

const ACCESS_COOKIE_NAME = "htms_access_token";
const REFRESH_COOKIE_NAME = "htms_refresh_token";
const CSRF_COOKIE_NAME = "htms_csrf_token";

const parseCookies = (cookieHeader = "") =>
  String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) return accumulator;

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});

const getCookieDomain = () => {
  const config = getConfig();
  return config.cookieDomain || undefined;
};

const buildBaseCookieOptions = (maxAge) => {
  const config = getConfig();

  return {
    httpOnly: true,
    sameSite: "strict",
    secure: Boolean(config.isProduction),
    domain: getCookieDomain(),
    path: "/",
    maxAge,
  };
};

const getAccessTokenCookieOptions = () => {
  const config = getConfig();
  return buildBaseCookieOptions(config.accessTokenCookieMaxAgeMs);
};

const getRefreshTokenCookieOptions = () => {
  const config = getConfig();
  return buildBaseCookieOptions(config.refreshTokenCookieMaxAgeMs);
};

const getCsrfCookieOptions = () => {
  const config = getConfig();

  return {
    httpOnly: false,
    sameSite: "strict",
    secure: Boolean(config.isProduction),
    domain: getCookieDomain(),
    path: "/",
    maxAge: config.refreshTokenCookieMaxAgeMs,
  };
};

const clearCookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict",
  secure: Boolean(getConfig().isProduction),
  domain: getCookieDomain(),
  path: "/",
});

const attachAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessTokenCookieOptions());
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions());
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE_NAME, clearCookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());
};

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  parseCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getCsrfCookieOptions,
  attachAuthCookies,
  clearAuthCookies,
};
