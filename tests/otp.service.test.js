const otpService = require("../shared/services/otp.service");

describe("otp service", () => {
  test("generates and validates otp", () => {
    const { token, hash, expiresAt } = otpService.generateOtp();
    const result = otpService.verifyOtp(token, hash, expiresAt, 0);
    expect(result.valid).toBe(true);
  });

  test("rejects invalid otp", () => {
    const { hash, expiresAt } = otpService.generateOtp();
    const result = otpService.verifyOtp("000000", hash, expiresAt, 0);
    expect(result.valid).toBe(false);
  });
});
