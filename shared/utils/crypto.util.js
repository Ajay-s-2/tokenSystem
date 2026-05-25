const crypto = require("crypto");

const sha256 = (value) => crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");

const constantTimeEquals = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const generateRandomId = (size = 32) => crypto.randomBytes(size).toString("hex");

module.exports = {
  sha256,
  constantTimeEquals,
  generateRandomId,
};
