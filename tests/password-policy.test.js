const { isPasswordStrong } = require("../shared/utils/password-policy.util");

describe("password policy", () => {
  test("accepts strong passwords", () => {
    expect(isPasswordStrong("StrongPass1!")).toBe(true);
  });

  test("rejects weak passwords", () => {
    expect(isPasswordStrong("weak")).toBe(false);
    expect(isPasswordStrong("alllowercase1!")).toBe(false);
    expect(isPasswordStrong("ALLUPPERCASE1!")).toBe(false);
    expect(isPasswordStrong("NoSpecial123")).toBe(false);
  });
});
