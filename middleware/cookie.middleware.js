const { parseCookies } = require("../shared/utils/cookie.util");

const cookieMiddleware = (req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie || "");

  res.cookie = (name, value, options = {}) => {
    const segments = [`${name}=${encodeURIComponent(value)}`];

    if (options.maxAge != null) segments.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
    if (options.domain) segments.push(`Domain=${options.domain}`);
    if (options.path) segments.push(`Path=${options.path}`);
    if (options.httpOnly) segments.push("HttpOnly");
    if (options.secure) segments.push("Secure");
    if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);

    const serialized = segments.join("; ");
    const current = res.getHeader("Set-Cookie");
    const nextCookies = Array.isArray(current) ? [...current, serialized] : current ? [current, serialized] : [serialized];
    res.setHeader("Set-Cookie", nextCookies);
    return res;
  };

  res.clearCookie = (name, options = {}) => {
    return res.cookie(name, "", {
      ...options,
      maxAge: 0,
    });
  };

  return next();
};

module.exports = cookieMiddleware;
