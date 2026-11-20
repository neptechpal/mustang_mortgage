/**
 * Staff Permission Levels
 * Controls what each staff member can access and modify
 */

export const STAFF_PERMISSIONS = {
  // Admin panel access
  viewDashboard: "View admin dashboard",
  viewCases: "View client cases",
  editCases: "Edit client cases",

  // Testimonials
  viewTestimonials: "View testimonials",
  addTestimonials: "Add testimonials",
  editTestimonials: "Edit testimonials",
  deleteTestimonials: "Delete testimonials",

  // Email settings
  viewEmailSettings: "View email settings",
  editEmailSettings: "Edit email settings",

  // User management
  viewUsers: "View users",
  createUsers: "Create new users",
  editUsers: "Edit users",
  deleteUsers: "Delete users",

  // 2FA settings
  view2FaSettings: "View 2FA settings",
  reset2Fa: "Reset user 2FA",

  // Submissions
  viewSubmissions: "View form submissions",
  editSubmissions: "Edit submissions",

  // Lender policies
  viewLenderPolicy: "View lender policies",
  editLenderPolicy: "Edit lender policies",
} as const;

export type StaffPermission = keyof typeof STAFF_PERMISSIONS;

export interface StaffPermissions {
  [key in StaffPermission]?: boolean;
}

/**
 * Predefined permission sets for common roles
 */
export const STAFF_ROLES = {
  junior: {
    viewDashboard: true,
    viewCases: true,
    viewTestimonials: true,
    viewSubmissions: true,
    viewEmailSettings: true,
    viewLenderPolicy: true,
    // Junior staff can view but not edit
  } as StaffPermissions,

  senior: {
    viewDashboard: true,
    viewCases: true,
    editCases: true,
    viewTestimonials: true,
    addTestimonials: true,
    editTestimonials: true,
    viewEmailSettings: true,
    viewSubmissions: true,
    editSubmissions: true,
    viewLenderPolicy: true,
    // Senior staff can edit most things but not delete or manage users
  } as StaffPermissions,

  manager: {
    // Manager has most permissions except user deletion
    viewDashboard: true,
    viewCases: true,
    editCases: true,
    viewTestimonials: true,
    addTestimonials: true,
    editTestimonials: true,
    deleteTestimonials: true,
    viewEmailSettings: true,
    editEmailSettings: true,
    viewUsers: true,
    createUsers: true,
    editUsers: true,
    viewSubmissions: true,
    editSubmissions: true,
    view2FaSettings: true,
    viewLenderPolicy: true,
    editLenderPolicy: true,
  } as StaffPermissions,

  admin: {
    // Admin has all permissions
    ...Object.fromEntries(
      Object.keys(STAFF_PERMISSIONS).map((key) => [key, true])
    ) as StaffPermissions,
  },
} as const;

export type StaffRoleType = keyof typeof STAFF_ROLES;

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userPermissions: StaffPermissions | null | undefined,
  permission: StaffPermission
): boolean {
  if (!userPermissions) {
    return false;
  }
  return userPermissions[permission] === true;
}

/**
 * Check if a user has any of the given permissions
 */
export function hasAnyPermission(
  userPermissions: StaffPermissions | null | undefined,
  permissions: StaffPermission[]
): boolean {
  if (!userPermissions) {
    return false;
  }
  return permissions.some((perm) => userPermissions[perm] === true);
}

/**
 * Check if a user has all of the given permissions
 */
export function hasAllPermissions(
  userPermissions: StaffPermissions | null | undefined,
  permissions: StaffPermission[]
): boolean {
  if (!userPermissions) {
    return false;
  }
  return permissions.every((perm) => userPermissions[perm] === true);
}

/**
 * Get a human-readable description of permissions
 */
export function describePermissions(permissions: StaffPermissions): string[] {
  return Object.entries(permissions)
    .filter(([, value]) => value === true)
    .map(([key]) => STAFF_PERMISSIONS[key as StaffPermission])
    .sort();
}

/**
 * Merge permissions (for assigning multiple roles)
 */
export function mergePermissions(
  ...permissionSets: StaffPermissions[]
): StaffPermissions {
  return Object.assign({}, ...permissionSets);
}
