const { ROLES } = require("./constants");

const PERMISSIONS = Object.freeze({
  AUTH_LOGOUT_ALL: "auth.logout_all",
  ADMIN_MANAGE: "admin.manage",
  DEPARTMENT_MANAGE: "department.manage",
  DOCTOR_SELF_MANAGE: "doctor.self.manage",
  HOSPITAL_SELF_MANAGE: "hospital.self.manage",
  USER_PROFILE_READ: "user.profile.read",
});

const ROLE_HIERARCHY = Object.freeze({
  [ROLES.COMMON_USER]: 10,
  [ROLES.DOCTOR]: 20,
  [ROLES.HOSPITAL]: 30,
  [ROLES.ADMIN]: 40,
  [ROLES.SUPER_ADMIN]: 50,
});

const ROLE_INHERITANCE = Object.freeze({
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  [ROLES.ADMIN]: [ROLES.ADMIN],
  [ROLES.HOSPITAL]: [ROLES.HOSPITAL],
  [ROLES.DOCTOR]: [ROLES.DOCTOR],
  [ROLES.COMMON_USER]: [ROLES.COMMON_USER],
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.COMMON_USER]: [PERMISSIONS.USER_PROFILE_READ],
  [ROLES.DOCTOR]: [PERMISSIONS.USER_PROFILE_READ, PERMISSIONS.DOCTOR_SELF_MANAGE],
  [ROLES.HOSPITAL]: [PERMISSIONS.USER_PROFILE_READ, PERMISSIONS.HOSPITAL_SELF_MANAGE],
  [ROLES.ADMIN]: [
    PERMISSIONS.USER_PROFILE_READ,
    PERMISSIONS.ADMIN_MANAGE,
    PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.AUTH_LOGOUT_ALL,
  ],
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
});

const getRolePermissions = (role) => ROLE_PERMISSIONS[role] || [];

const hasRoleAccess = (role, allowedRoles = []) => {
  if (!allowedRoles.length) return true;
  if (!role) return false;
  const inheritedRoles = ROLE_INHERITANCE[role] || [role];
  return allowedRoles.some((allowedRole) => inheritedRoles.includes(allowedRole));
};

const hasPermissionAccess = (role, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true;

  const permissionSet = new Set(getRolePermissions(role));
  return requiredPermissions.every((permission) => permissionSet.has(permission));
};

module.exports = {
  PERMISSIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  getRolePermissions,
  hasRoleAccess,
  hasPermissionAccess,
};
