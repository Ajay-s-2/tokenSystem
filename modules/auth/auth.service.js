const { LOGIN_STATUS, ONBOARDING_STATUS, ROLES } = require("../../shared/utils/constants");
const { hashPassword, comparePassword } = require("../../shared/utils/password.util");
const { generateToken } = require("../../shared/utils/token.util");
const { createHttpError } = require("../../shared/utils/error.util");
const otpService = require("../../shared/services/otp.service");
const superAdminOtpStore = require("../../shared/services/superadmin-otp.store");
const departmentService = require("../department/department.service");
const Doctor = require("../doctor/doctor.model");
const Hospital = require("../hospital/hospital.model");
const userRepository = require("../user/user.repository");
const { getApprovalStatusFromLoginStatus } = require("../../shared/utils/status.util");

const register = async (payload) => {
  const {
    name,
    age,
    gender,
    specialization,
    spelization,
    departmentId,
    department,
    phone,
    dob,
    blood_group,
    location,
    departments,
    adminAccessCode,
    medicalRegistrationId,
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
  let doctorDepartment = null;

  if (role === ROLES.ADMIN) {
    const requiredAccessCode = process.env.ADMIN_ACCESS_CODE;
    if (requiredAccessCode && adminAccessCode !== requiredAccessCode) {
      throw createHttpError(403, "Invalid admin access code");
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

  if (role === ROLES.DOCTOR) {
    if (!phone || !dob || !blood_group || !gender) {
      throw createHttpError(
        400,
        "Doctor registration requires phone, gender, date of birth and blood group"
      );
    }

    doctorDepartment = departmentData.departmentName || department || null;
    if (!doctorDepartment) {
      throw createHttpError(400, "Doctor registration requires department");
    }
  }

  if (role === ROLES.HOSPITAL) {
    if (!phone || !location || !Array.isArray(departments) || departments.length === 0) {
      throw createHttpError(400, "Hospital registration requires location, phone, and departments");
    }
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw createHttpError(409, "Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  const loginStatus = role === ROLES.ADMIN ? LOGIN_STATUS.APPROVED : LOGIN_STATUS.PENDING;
  const onboardingStatus =
    role === ROLES.ADMIN ? ONBOARDING_STATUS.ONBOARDED : ONBOARDING_STATUS.NOT_ONBOARDED;

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
    loginStatus,
    onboardingStatus,
    isEmailVerified: false,
  });

  const approvalStatus = getApprovalStatusFromLoginStatus(user.loginStatus);

  if (role === ROLES.DOCTOR) {
    await Doctor.create({
      userId: user._id,
      name,
      gender,
      dob,
      bloodGroup: blood_group,
      medicalRegistrationId: medicalRegistrationId || null,
      phone,
      email,
      department: doctorDepartment,
      specialization: normalizedSpecialization || null,
      status: approvalStatus,
      selectedHospitals: [],
      approvedHospitals: [],
    });

    await userRepository.updateById(user._id, {
      name,
      gender,
      specialization: normalizedSpecialization,
      departmentId: departmentData.departmentId,
      departmentName: doctorDepartment,
      onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
    });
  }

  if (role === ROLES.HOSPITAL) {
    if (!phone || !location || !Array.isArray(departments) || departments.length === 0) {
      throw createHttpError(400, "Hospital registration requires location, phone, and departments");
    }

    await Hospital.create({
      userId: user._id,
      name,
      location,
      phone,
      email,
      departments,
      status: approvalStatus,
    });

    await userRepository.updateById(user._id, {
      name,
      onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
    });
  }

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
