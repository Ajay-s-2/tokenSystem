const { LOGIN_STATUS, ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { hashPassword, comparePassword } = require("../../shared/utils/password.util");
const { generateToken } = require("../../shared/utils/token.util");
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

  if (!name || !age || !gender || !(specialization || spelization) || !email || !password) {
    throw new Error("Missing required registration fields");
  }

  if (password !== confirmPassword) {
    throw new Error("Password and confirm password do not match");
  }

  if (![ROLES.DOCTOR, ROLES.HOSPITAL_STAFF, ROLES.ADMIN].includes(role)) {
    throw new Error("Invalid role selected for registration");
  }

  let departmentData = {
    departmentId: null,
    departmentName: null,
  };

  if ([ROLES.DOCTOR, ROLES.HOSPITAL_STAFF].includes(role)) {
    if (!departmentId) {
      throw new Error("Department ID is required for doctors and hospital staff");
    }

    const department = await departmentService.validateDepartment(departmentId);
    departmentData = {
      departmentId: department.departmentId,
      departmentName: department.departmentName,
    };
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password before saving
  const hashedPassword = await hashPassword(password);

  const user = await userRepository.createUser({
    name,
    age,
    gender,
    specialization: specialization || spelization,
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
    throw new Error("Email and OTP are required");
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  // Validate OTP and expiry
  const { valid, reason } = otpService.verifyOtp(otp, user.otpSecret, user.otpExpiresAt);
  if (!valid) {
    throw new Error(reason || "Invalid OTP");
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
    throw new Error("Email and password are required");
  }

  // Super admin login: validate credentials from .env (no DB lookup)
  if (isEnvSuperAdmin(email)) {
    if (!validateSuperAdminPassword(password)) {
      throw new Error("Invalid credentials");
    }

    const { token, secret, expiresAt } = otpService.generateOtp();
    superAdminOtpStore.setOtp(email, { secret, expiresAt });

    console.log("Super Admin Login OTP:", token);
    return { message: "OTP sent. Please verify to complete login." };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    throw new Error("Invalid credentials");
  }

  if (user.loginStatus !== LOGIN_STATUS.APPROVED) {
    throw new Error("Login not approved yet");
  }

  if (user.onboardingStatus !== ONBOARDING_STATUS.ONBOARDED) {
    throw new Error("Onboarding not completed yet");
  }

  if (!user.isEmailVerified) {
    throw new Error("Email is not verified");
  }

  // Generate OTP for login verification
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
    throw new Error("Email and OTP are required");
  }

  // Super admin OTP verification using in-memory store
  if (isEnvSuperAdmin(email)) {
    const otpRecord = superAdminOtpStore.getOtp(email);
    const { valid, reason } = otpService.verifyOtp(otp, otpRecord?.secret, otpRecord?.expiresAt);
    if (!valid) {
      throw new Error(reason || "Invalid OTP");
    }

    superAdminOtpStore.clearOtp(email);
    const token = generateToken({ id: "super_admin", role: ROLES.SUPER_ADMIN, email });

    return { token, role: ROLES.SUPER_ADMIN };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.loginStatus !== LOGIN_STATUS.APPROVED) {
    throw new Error("Login not approved yet");
  }

  if (user.onboardingStatus !== ONBOARDING_STATUS.ONBOARDED) {
    throw new Error("Onboarding not completed yet");
  }

  // Validate OTP and expiry
  const { valid, reason } = otpService.verifyOtp(otp, user.otpSecret, user.otpExpiresAt);
  if (!valid) {
    throw new Error(reason || "Invalid OTP");
  }

  await userRepository.updateById(user._id, {
    otpSecret: null,
    otpExpiresAt: null,
  });

  // Issue JWT after OTP verification
  const token = generateToken({ id: user._id, role: user.role });

  return { token, role: user.role };
};

module.exports = {
  register,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
};
