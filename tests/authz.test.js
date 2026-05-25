const { ROLES } = require("../shared/utils/constants");
const { hasRoleAccess, hasPermissionAccess, PERMISSIONS } = require("../shared/utils/authz.util");

describe("authz utilities", () => {
  test("supports role hierarchy", () => {
    expect(hasRoleAccess(ROLES.SUPER_ADMIN, [ROLES.ADMIN])).toBe(true);
    expect(hasRoleAccess(ROLES.DOCTOR, [ROLES.ADMIN])).toBe(false);
  });

  test("supports permission checks", () => {
    expect(hasPermissionAccess(ROLES.ADMIN, [PERMISSIONS.ADMIN_MANAGE])).toBe(true);
    expect(hasPermissionAccess(ROLES.DOCTOR, [PERMISSIONS.ADMIN_MANAGE])).toBe(false);
  });
});
