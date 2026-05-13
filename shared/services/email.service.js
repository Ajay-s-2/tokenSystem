const { logger } = require("../utils/logger.util");
const { getConfig } = require("../../config/env");

const sendOtpEmail = async ({ to, purpose, otp }) => {
  const config = getConfig();

  if (config.logDevOtp && otp) {
    logger.warn(
      { to, purpose },
      `[DEV ONLY] OTP for ${purpose}: ${otp}`
    );
  }

  if (!config.logDevOtp) {
    logger.warn(
      {
        to,
        purpose,
        deliveryConfigured: false,
      },
      "OTP email delivery is not configured"
    );
  }

  return {
    delivered: false,
    reason: "EMAIL_DELIVERY_NOT_CONFIGURED",
  };
};

module.exports = {
  sendOtpEmail,
};
