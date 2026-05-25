const mongoose = require("mongoose");
const { LOGIN_STATUS, ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { hashPassword, comparePassword } = require("../../shared/utils/password.util");
const {
  issueTokenPair,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} = require("../../shared/utils/token.util");
const { createHttpError } = require("../../shared/utils/error.util");
const otpService = require("../../shared/services/otp.service");
const emailService = require("../../shared/services/email.service");
const departmentService = require("../department/department.service");
const Doctor = require("../doctor/doctor.model");
const Hospital = require("../hospital/hospital.model");
const userRepository = require("../user/user.repository");
const authSessionRepository = require("./auth-session.repository");
const { getApprovalStatusFromLoginStatus } = require("../../shared/utils/status.util");
const { generateRandomId, sha256, constantTimeEquals } = require("../../shared/utils/crypto.util");
const { captureAuthAudit } = require("./auth.audit");
const { getConfig } = require("../../config/env");

const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials";
const OTP_RESEND_MESSAGE = "If the account exists and is eligible, a new OTP has been sent.";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const buildRequestContext = (req) => ({
  ipAddress: req?.ip || null,
  userAgent: req?.get ? req.get("user-agent") : null,
});

const createSessionForUser = async (user, context = {}) => {
  const familyId = generateRandomId(16);
  const sessionId = new mongoose.Types.ObjectId().toString();
  const tokens = issueTokenPair({ user, sessionId, familyId });

  const session = await authSessionRepository.createSession({
    _id: sessionId,
    userId: user._id,
    familyId,
    refreshTokenHash: sha256(tokens.refreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
    userAgent: context.userAgent || null,
    ipAddress: context.ipAddress || null,
    lastUsedAt: new Date(),
  });

  return {
    session,
    ...tokens,
  };
};

const clearOtpState = {
  otpSecret: null,
  otpHash: null,
  otpExpiresAt: null,
  otpAttempts: 0,
};

const enforceOtpResendCooldown = (user) => {
  const config = getConfig();
  if (!user?.otpLastSentAt) return;

  const cooldownMs = config.otpResendCooldownSeconds * 1000;
  const nextAllowedAt = new Date(user.otpLastSentAt).getTime() + cooldownMs;
  if (Date.now() < nextAllowedAt) {
    throw createHttpError(429, "OTP resend is temporarily blocked. Please wait before trying again.", null, "OTP_RESEND_COOLDOWN");
  }
};

const issueRegistrationOtp = async (user, purpose = "registration") => {
  const { token, hash, expiresAt } = otpService.generateOtp();

  await userRepository.updateById(user._id, {
    otpHash: hash,
    otpExpiresAt: expiresAt,
    otpAttempts: 0,
    otpLastSentAt: new Date(),
  });

  await emailService.sendOtpEmail({ to: user.email, purpose, otp: token });
};

const ensureDoctorDepartment = async (departmentId) => {
  const department = await departmentService.validateDepartment(departmentId);
  return {
    departmentId: department.departmentId,
    departmentName: department.departmentName,
    departmentObjectId: department._id,
  };
};

const ensureEnvSuperAdmin = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  const envEmail = normalizeEmail(process.env.SUPER_ADMIN_EMAIL);
  const envPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!envEmail || !envPassword || normalizedEmail !== envEmail || password !== envPassword) {
    return null;
  }

  let user = await userRepository.findByEmail(normalizedEmail);
  if (user) {
    return user;
  }

  const hashedPassword = await hashPassword(password);
  user = await userRepository.createUser({
    name: "Super Admin",
    age: 0,
    gender: "other",
    specialization: "Administration",
    email: normalizedEmail,
    password: hashedPassword,
    role: ROLES.SUPER_ADMIN,
    loginStatus: LOGIN_STATUS.APPROVED,
    onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
    isEmailVerified: true,
  });

  return user;
};

const register = async (payload, req = null) => {
  const {
    name,
    specialization,
    departmentId,
    phone,
    dob,
    blood_group,
    location,
    adminAccessCode,
    medicalRegistrationId,
    email,
    password,
    confirmPassword,
    role,
    gender,
  } = payload;

  if (!name || !email || !password || !confirmPassword) {
    throw createHttpError(400, "Missing required registration fields", null, "REGISTRATION_INVALID");
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, "Passwords must match", null, "PASSWORDS_MISMATCH");
  }

  if (![ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.COMMON_USER, ROLES.ADMIN].includes(role)) {
    throw createHttpError(400, "Invalid registration request", null, "ROLE_INVALID");
  }

  if (role === ROLES.ADMIN) {
    const requiredAccessCode = process.env.ADMIN_ACCESS_CODE;
    if (!requiredAccessCode) {
      throw createHttpError(403, "Admin signup is disabled", null, "ADMIN_SIGNUP_DISABLED");
    }

    if (!constantTimeEquals(String(adminAccessCode || ""), String(requiredAccessCode))) {
      throw createHttpError(403, "Invalid registration request", null, "ADMIN_ACCESS_CODE_INVALID");
    }
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    await captureAuthAudit({
      type: "warn",
      message: "Duplicate registration blocked",
      req,
      data: { email: normalizeEmail(email), role },
      statusCode: 409,
    });
    throw createHttpError(409, "Unable to process registration", null, "REGISTRATION_UNAVAILABLE");
  }

  let departmentData = {
    departmentId: null,
    departmentName: null,
    departmentObjectId: null,
  };

  if ([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.COMMON_USER].includes(role) && departmentId) {
    departmentData = await ensureDoctorDepartment(departmentId);
  }

  const hashedPassword = await hashPassword(password);
  const loginStatus = role === ROLES.ADMIN ? LOGIN_STATUS.APPROVED : LOGIN_STATUS.PENDING;
  const onboardingStatus =
    role === ROLES.ADMIN ? ONBOARDING_STATUS.ONBOARDED : ONBOARDING_STATUS.NOT_ONBOARDED;

  let user = null;

  try {
    user = await userRepository.createUser({
      name,
      gender: gender || null,
      specialization: specialization || null,
      email: normalizeEmail(email),
      password: hashedPassword,
      role,
      departmentId: departmentData.departmentId,
      departmentName: departmentData.departmentName,
      loginStatus,
      onboardingStatus,
      isEmailVerified: false,
      otpAttempts: 0,
    });

    const approvalStatus = getApprovalStatusFromLoginStatus(user.loginStatus);

    if (role === ROLES.DOCTOR) {
      await Doctor.create({
        userId: user._id,
        name,
        gender,
        dob,
        bloodGroup: blood_group,
        medicalRegistrationId,
        phone,
        email: normalizeEmail(email),
        department: departmentData.departmentName,
        specialization: specialization || null,
        status: approvalStatus,
        selectedHospitals: [],
        approvedHospitals: [],
        translations: payload.translations || null,
      });

      await userRepository.updateById(user._id, {
        onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
      });
    }

    if (role === ROLES.HOSPITAL) {
      await Hospital.create({
        userId: user._id,
        name,
        location,
        phone,
        email: normalizeEmail(email),
        departments: departmentData.departmentName ? [departmentData.departmentName] : [],
        status: approvalStatus,
        translations: payload.translations || null,
        departmentId: departmentData.departmentObjectId,
      });

      await userRepository.updateById(user._id, {
        onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
      });
    }

    await issueRegistrationOtp(user);
  } catch (error) {
    if (user?._id) {
      await userRepository.deleteById(user._id).catch(() => null);
      await Doctor.deleteOne({ userId: user._id }).catch(() => null);
      await Hospital.deleteOne({ userId: user._id }).catch(() => null);
    }

    throw error;
  }
  await captureAuthAudit({
    type: "success",
    message: "Registration initiated",
    req,
    user,
    data: { role: user.role },
    statusCode: 201,
  });

  return {
    userId: user._id,
    message: "User registered. Please verify OTP.",
  };
};

const verifyRegisterOtp = async ({ email, otp }, req = null) => {
  if (!email || !otp) {
    throw createHttpError(400, "Email and OTP are required", null, "OTP_REQUIRED");
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw createHttpError(400, "Invalid OTP", null, "OTP_INVALID");
  }

  const verification = otpService.verifyOtp(otp, user.otpHash, user.otpExpiresAt, user.otpAttempts);
  if (!verification.valid) {
    await userRepository.updateById(user._id, {
      otpAttempts: Number(user.otpAttempts || 0) + 1,
    });

    await captureAuthAudit({
      type: "warn",
      message: "OTP verification failed",
      req,
      user,
      data: { reason: verification.reason },
      statusCode: 400,
    });
    throw createHttpError(400, verification.reason || "Invalid OTP", null, "OTP_INVALID");
  }

  await userRepository.updateById(user._id, {
    isEmailVerified: true,
    ...clearOtpState,
  });

  await captureAuthAudit({
    type: "success",
    message: "OTP verification succeeded",
    req,
    user,
    statusCode: 200,
  });

  return { message: "Email verified successfully" };
};

const resendRegisterOtp = async ({ email }, req = null) => {
  if (!email) {
    throw createHttpError(400, "Email is required", null, "EMAIL_REQUIRED");
  }

  const user = await userRepository.findByEmail(email);
  if (!user || user.isEmailVerified) {
    return { message: OTP_RESEND_MESSAGE };
  }

  enforceOtpResendCooldown(user);
  await issueRegistrationOtp(user, "registration_resend");
  await captureAuthAudit({
    type: "info",
    message: "Registration OTP resent",
    req,
    user,
    statusCode: 200,
  });

  return { message: OTP_RESEND_MESSAGE };
};

const login = async ({ email, password }, req = null) => {
  if (!email || !password) {
    throw createHttpError(400, INVALID_CREDENTIALS_MESSAGE, null, "INVALID_CREDENTIALS");
  }

  let user = await userRepository.findByEmail(email);

  if (!user) {
    user = await ensureEnvSuperAdmin(email, password);
  }

  if (!user) {
    await captureAuthAudit({
      type: "warn",
      message: "Login failed",
      req,
      data: { email: normalizeEmail(email), reason: "user_not_found" },
      statusCode: 401,
    });
    throw createHttpError(401, INVALID_CREDENTIALS_MESSAGE, null, "INVALID_CREDENTIALS");
  }

  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    await captureAuthAudit({
      type: "warn",
      message: "Login failed",
      req,
      user,
      data: { reason: "password_mismatch" },
      statusCode: 401,
    });
    throw createHttpError(401, INVALID_CREDENTIALS_MESSAGE, null, "INVALID_CREDENTIALS");
  }

  if (user.loginStatus !== LOGIN_STATUS.APPROVED) {
    throw createHttpError(
      403,
      user.loginStatus === LOGIN_STATUS.REJECTED
        ? "Your account has been rejected by admin"
        : "Your account is still pending admin approval",
      null,
      "ACCOUNT_NOT_APPROVED"
    );
  }

  if (!user.isEmailVerified) {
    throw createHttpError(403, "Email is not verified", null, "EMAIL_NOT_VERIFIED");
  }

  const { accessToken, refreshToken, session } = await createSessionForUser(user, buildRequestContext(req));
  await captureAuthAudit({
    type: "success",
    message: "Login successful",
    req,
    user,
    data: { sessionId: String(session._id) },
    statusCode: 200,
  });

  return {
    accessToken,
    refreshToken,
    role: user.role === ROLES.SUPER_ADMIN ? ROLES.ADMIN : user.role,
    actualRole: user.role,
    sessionId: String(session._id),
  };
};

const refreshSession = async ({ refreshToken }, req = null) => {
  if (!refreshToken) {
    throw createHttpError(401, "Refresh session is not available", null, "REFRESH_TOKEN_MISSING");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    await captureAuthAudit({
      type: "warn",
      message: "Refresh failed",
      req,
      data: { reason: "token_invalid" },
      statusCode: 401,
    });
    throw createHttpError(401, "Invalid or expired session", null, "REFRESH_TOKEN_INVALID");
  }

  const session = await authSessionRepository.findById(decoded.sessionId);
  if (!session) {
    throw createHttpError(401, "Invalid or expired session", null, "REFRESH_SESSION_INVALID");
  }

  const incomingHash = sha256(refreshToken);
  if (session.revokedAt || !constantTimeEquals(session.refreshTokenHash, incomingHash)) {
    await authSessionRepository.revokeFamily(session.familyId, "refresh_token_reuse_detected");
    await captureAuthAudit({
      type: "warn",
      message: "Refresh token reuse detected",
      req,
      data: { sessionId: String(session._id), familyId: session.familyId },
      statusCode: 401,
    });
    throw createHttpError(401, "Invalid or expired session", null, "REFRESH_TOKEN_REUSED");
  }

  const user = await userRepository.findById(decoded.id);
  if (!user || Number(user.tokenVersion || 0) !== Number(decoded.tokenVersion || 0)) {
    await authSessionRepository.revokeFamily(session.familyId, "token_version_mismatch");
    throw createHttpError(401, "Invalid or expired session", null, "REFRESH_TOKEN_INVALID");
  }

  if (user.loginStatus !== LOGIN_STATUS.APPROVED || !user.isEmailVerified) {
    await authSessionRepository.revokeById(session._id, "account_inactive");
    throw createHttpError(403, "Account is not active", null, "ACCOUNT_INACTIVE");
  }

  const tokens = issueTokenPair({
    user,
    sessionId: String(session._id),
    familyId: session.familyId,
  });

  await authSessionRepository.rotateRefreshToken(
    session._id,
    sha256(tokens.refreshToken),
    getRefreshTokenExpiryDate(),
    buildRequestContext(req)
  );

  await captureAuthAudit({
    type: "info",
    message: "Session refreshed",
    req,
    user,
    data: { sessionId: String(session._id) },
    statusCode: 200,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    role: user.role === ROLES.SUPER_ADMIN ? ROLES.ADMIN : user.role,
    actualRole: user.role,
    sessionId: String(session._id),
  };
};

const logout = async ({ sessionId, refreshToken }, req = null) => {
  if (sessionId) {
    await authSessionRepository.revokeById(sessionId, "logout");
    await captureAuthAudit({
      type: "info",
      message: "Logout successful",
      req,
      user: req?.user || null,
      data: { sessionId },
      statusCode: 200,
    });
    return { success: true };
  }

  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await authSessionRepository.revokeById(decoded.sessionId, "logout");
    } catch {
      return { success: true };
    }
  }

  return { success: true };
};

const logoutAll = async (authUser, req = null) => {
  const user = await userRepository.incrementTokenVersion(authUser.id);
  await authSessionRepository.revokeAllForUser(authUser.id, "logout_all");
  await captureAuthAudit({
    type: "info",
    message: "All sessions revoked",
    req,
    user,
    statusCode: 200,
  });

  return { success: true };
};

module.exports = {
  register,
  verifyRegisterOtp,
  resendRegisterOtp,
  login,
  refreshSession,
  logout,
  logoutAll,
};
