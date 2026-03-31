const { ROLES, LOGIN_STATUS, ONBOARDING_STATUS } = require("../../shared/utils/constants");
const { hashPassword } = require("../../shared/utils/password.util");
const userRepository = require("../user/user.repository");
const Department = require("../department/department.model");

const createAdmin = async (payload) => {
  const {
    name,
    age,
    gender,
    specialization,
    spelization,
    email,
    password,
    confirmPassword,
  } = payload;

  if (!name || !age || !gender || !(specialization || spelization) || !email || !password) {
    throw new Error("Missing required admin fields");
  }

  if (password !== confirmPassword) {
    throw new Error("Password and confirm password do not match");
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  const admin = await userRepository.createUser({
    name,
    age,
    gender,
    specialization: specialization || spelization,
    email,
    password: hashedPassword,
    role: ROLES.ADMIN,
    loginStatus: LOGIN_STATUS.APPROVED,
    onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
    isEmailVerified: true,
  });

  return admin;
};

const deleteAdmin = async (adminId) => {
  const user = await userRepository.findById(adminId);
  if (!user) throw new Error("User not found");

  if (user.role !== ROLES.ADMIN) {
    throw new Error("Only admin users can be deleted here");
  }

  const deleted = await userRepository.deleteById(adminId);
  return deleted;
};

const ensureSuperAdmin = async () => {
  // Skip DB seeding unless explicitly enabled
  if (process.env.SUPER_ADMIN_SEED_DB !== "true") {
    return null;
  }

  // Read super admin credentials from environment
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set. Skipping super admin seed.");
    return null;
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) return existing;

  const hashedPassword = await hashPassword(password);

  const superAdmin = await userRepository.createUser({
    name: "Super Admin",
    age: 0,
    gender: "N/A",
    specialization: "Administration",
    email,
    password: hashedPassword,
    role: ROLES.SUPER_ADMIN,
    loginStatus: LOGIN_STATUS.APPROVED,
    onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
    isEmailVerified: true,
  });

  console.log("Super admin created");
  return superAdmin;
};

const ensureDefaultDepartments = async () => {
  const defaultDepartments = [
    "General Medicine",
    "Cardiology",
    "Orthopedics",
    "Neurology",
    "Gastroenterology",
    "Oncology",
    "Psychiatry",
    "Dermatology",
    "ENT",
    "Ophthalmology",
    "Urology",
    "Gynecology",
    "Pediatrics",
    "Surgery",
    "Radiology",
    "Pathology",
    "Anesthesiology"
  ];

  const DEPARTMENT_ID_PREFIX = "DEP";

  try {
    const existingCount = await Department.countDocuments({});
    if (existingCount > 0) {
      return; // Departments already exist
    }

    // Get the sequence for next department ID
    const lastDepartment = await Department.findOne({}).sort({ createdAt: -1 }).lean();
    const nextSequence = 1;

    // Create all default departments
    const departmentsToCreate = defaultDepartments.map((name, index) => ({
      departmentId: `${DEPARTMENT_ID_PREFIX}${String(index + 1).padStart(3, "0")}`,
      departmentName: name,
      createdBy: "system-seed"
    }));

    await Department.insertMany(departmentsToCreate);
    console.log(`Created ${departmentsToCreate.length} default departments`);
  } catch (error) {
    console.error("Error seeding default departments:", error.message);
  }
};

module.exports = {
  createAdmin,
  deleteAdmin,
  ensureSuperAdmin,
  ensureDefaultDepartments,
};
