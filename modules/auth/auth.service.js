const { LOGIN_STATUS, ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { hashPassword, comparePassword } = require("../../shared/utils/password.util");
const { generateToken } = require("../../shared/utils/token.util");
const { createHttpError } = require("../../shared/utils/error.util");
const otpService = require("../../shared/services/otp.service");
const superAdminOtpStore = require("../../shared/services/superadmin-otp.store");
const departmentService = require("../department/department.service");
const userRepository = require("../user/user.repository");

const register = async (payload) => {
  const {
    name,
    age,
    gender,
    specialization,
    spelization,
    departmentId,
    email,
    password,
    confirmPassword,
    role,
  } = payload;

  if (!name || !email || !password) {
    throw createHttpError(400, "Missing required registration fields");
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, "Password and confirm password do not match");
  }

  if (![ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.COMMON_USER, ROLES.ADMIN].includes(role)) {
    throw createHttpError(400, "Invalid role selected for registration");
  }

  let departmentData = {
    departmentId: null,
    departmentName: null,
  };

  const normalizedSpecialization = specialization || spelization || null;

  if (role === ROLES.ADMIN) {
    if (!age || !gender || !normalizedSpecialization) {
      throw createHttpError(400, "Admin registration requires age, gender and specialization");
    }
  }

  if (role === ROLES.COMMON_USER) {
    if (!age || !gender || !normalizedSpecialization || !departmentId) {
      throw createHttpError(
        400,
        "Common user registration requires age, gender, specialization and department ID"
      );
    }
  }

  if ([ROLES.DOCTOR, ROLES.COMMON_USER].includes(role) && departmentId) {
    const department = await departmentService.validateDepartment(departmentId);
    departmentData = {
      departmentId: department.departmentId,
      departmentName: department.departmentName,
    };
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw createHttpError(409, "Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.createUser({
    name,
    age: age || null,
    gender: gender || null,
    specialization: normalizedSpecialization,
    email,
    password: hashedPassword,
    role,
    departmentId: departmentData.departmentId,
    departmentName: departmentData.departmentName,
    loginStatus: LOGIN_STATUS.PENDING,
    onboardingStatus: ONBOARDING_STATUS.NOT_ONBOARDED,
    isEmailVerified: false,
  });

  // Generate OTP for email verification
  const { token, secret, expiresAt } = otpService.generateOtp();

  await userRepository.updateById(user._id, {
    otpSecret: secret,
    otpExpiresAt: expiresAt,
  });

  console.log("Registration OTP:", token);

  return {
    userId: user._id,
    message: "User registered. Please verify OTP.",
  };
};

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const isEnvSuperAdmin = (email) => {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) return false;
  return normalizeEmail(email) === normalizeEmail(superAdminEmail);
};

const validateSuperAdminPassword = (password) => {
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!superAdminPassword) return false;
  return password === superAdminPassword;
};

const verifyRegisterOtp = async ({ email, otp }) => {
  if (!email || !otp) {
    throw createHttpError(400, "Email and OTP are required");
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  const { valid, reason } = otpService.verifyOtp(otp, user.otpSecret, user.otpExpiresAt);
  if (!valid) {
    throw createHttpError(400, reason || "Invalid OTP");
  }

  await userRepository.updateById(user._id, {
    isEmailVerified: true,
    otpSecret: null,
    otpExpiresAt: null,
  });

  return { message: "Email verified successfully" };
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw createHttpError(400, "Email and password are required");
  }

  if (isEnvSuperAdmin(email)) {
    if (!validateSuperAdminPassword(password)) {
      throw createHttpError(401, "Invalid credentials");
    }

    const { token, secret, expiresAt } = otpService.generateOtp();
    superAdminOtpStore.setOtp(email, { secret, expiresAt });

    console.log("Super Admin Login OTP:", token);
    return { message: "OTP sent. Please verify to complete login." };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    throw createHttpError(401, "Invalid credentials");
  }

  if (user.loginStatus !== LOGIN_STATUS.APPROVED) {
    const approvalMessage =
      user.loginStatus === LOGIN_STATUS.REJECTED
        ? "Your account has been rejected by admin"
        : "Your account is still pending admin approval";
    throw createHttpError(403, approvalMessage);
  }

  if (!user.isEmailVerified) {
    throw createHttpError(403, "Email is not verified");
  }

  const { token, secret, expiresAt } = otpService.generateOtp();

  await userRepository.updateById(user._id, {
    otpSecret: secret,
    otpExpiresAt: expiresAt,
  });

  console.log("Login OTP:", token);

  return { message: "OTP sent. Please verify to complete login." };
};

const verifyLoginOtp = async ({ email, otp }) => {
  if (!email || !otp) {
    throw createHttpError(400, "Email and OTP are required");
  }

  if (isEnvSuperAdmin(email)) {
    const otpRecord = superAdminOtpStore.getOtp(email);
    const { valid, reason } = otpService.verifyOtp(otp, otpRecord?.secret, otpRecord?.expiresAt);
    if (!valid) {
      throw createHttpError(400, reason || "Invalid OTP");
    }

    superAdminOtpStore.clearOtp(email);
    const token = generateToken({ id: "super_admin", role: ROLES.SUPER_ADMIN, email });

    return { token, role: ROLES.SUPER_ADMIN };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  if (user.loginStatus !== LOGIN_STATUS.APPROVED) {
    throw createHttpError(403, "Only approved users can complete login");
  }

  const { valid, reason } = otpService.verifyOtp(otp, user.otpSecret, user.otpExpiresAt);
  if (!valid) {
    throw createHttpError(400, reason || "Invalid OTP");
  }

  await userRepository.updateById(user._id, {
    otpSecret: null,
    otpExpiresAt: null,
  });

  const token = generateToken({ id: user._id, role: user.role, email: user.email });

  return { token, role: user.role };
};

module.exports = {
  register,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
};
