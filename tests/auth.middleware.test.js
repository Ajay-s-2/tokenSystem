process.env.JWT_SECRET = process.env.JWT_SECRET || "UnitTestJwtSecretValueThatIsLongEnough123!";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "UnitTestRefreshSecretValueThatIsLongEnough123!";

jest.mock("../modules/user/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../modules/auth/auth-session.repository", () => ({
  findActiveById: jest.fn(),
}));

const User = require("../modules/user/user.model");
const authSessionRepository = require("../modules/auth/auth-session.repository");
const authMiddleware = require("../middleware/auth.middleware");
const { signAccessToken } = require("../shared/utils/token.util");

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe("auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("attaches req.user for valid cookie session", async () => {
    const user = {
      _id: "507f1f77bcf86cd799439011",
      role: "admin",
      email: "admin@example.com",
      loginStatus: "APPROVED",
      isEmailVerified: true,
      tokenVersion: 0,
    };

    const token = signAccessToken({
      user,
      sessionId: "507f1f77bcf86cd799439012",
    });

    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(user),
      }),
    });
    authSessionRepository.findActiveById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      userId: user._id,
    });

    const req = {
      headers: {
        cookie: `htms_access_token=${encodeURIComponent(token)}`,
      },
      cookies: {},
    };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeTruthy();
    expect(req.user.role).toBe("admin");
  });
});
