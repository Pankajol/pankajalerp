import { jwtDecode } from "jwt-decode";

const SUPER_ROLES = new Set([
  "company",
  "admin",
  "super admin",
  "societyadmin",
  "supervisor",
  "manager",
]);

const MODULE_ALIASES = {
  Society: ["Society"],
  Building: ["Building"],
  Flat: ["Flat"],
  Resident: ["Resident"],
  Complaint: ["Complaint"],
  "Maintenance Bill": ["Maintenance Bill", "Maintenance Bills", "Maintenance"],
  "Guard Assignment": ["Guard Assignment", "GuardAssignment"],
  employees: ["employees", "staff", "Staff"],
  Shift: ["Shift", "Shifts"],
  Attendance: ["Attendance"],
  Deployment: ["Deployment", "Staff Deployment", "StaffDeployment"],
  "Guard Entry": ["Guard Entry", "GuardEntry"],
  "Gate Entry": ["Gate Entry", "GateEntry"],
  "Notice Board": ["Notice Board", "Notice", "NoticeBoard"],
  "Visitor Pass": ["Visitor Pass", "VisitorPass"],
  Billing: ["Billing", "billing"],
};

function normalizeModuleName(moduleName) {
  if (!moduleName) return "";
  return String(moduleName).trim().toLowerCase();
}

function readToken(token) {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

function getUserFromStorage() {
  if (typeof window === "undefined") return null;
  return readToken(localStorage.getItem("token"));
}

export function hasModulePermissionForUser(user, moduleKey, action = "view") {
  if (!user) return false;

  const roles = Array.isArray(user.roles)
    ? user.roles
    : user.role
      ? [user.role]
      : [];

  const normalizedRoles = roles.map((role) => String(role).trim().toLowerCase());
  const isSuperUser =
    user.type === "company" ||
    normalizedRoles.some((role) => SUPER_ROLES.has(role)) ||
    normalizedRoles.includes("admin") ||
    normalizedRoles.includes("company");

  if (isSuperUser) return true;

  const moduleAliases = MODULE_ALIASES[moduleKey] || [moduleKey];
  const modulePermissions = user.modules || {};

  const matchedModule = Object.entries(modulePermissions).find(([name]) => {
    const normalizedName = normalizeModuleName(name);
    return moduleAliases.some((alias) => normalizeModuleName(alias) === normalizedName);
  });

  if (!matchedModule) return false;

  const [, moduleData] = matchedModule;
  if (!moduleData || moduleData.selected === false) return false;

  const normalizedAction = action === "read" ? "view" : action;

  if (Array.isArray(moduleData.permissions)) {
    return moduleData.permissions.includes(normalizedAction) || moduleData.permissions.includes("*");
  }

  if (moduleData.permissions && typeof moduleData.permissions === "object") {
    return moduleData.permissions[normalizedAction] === true;
  }

  return false;
}

export function hasModulePermission(moduleKey, action = "view", tokenOverride = null) {
  const user = tokenOverride ? readToken(tokenOverride) : getUserFromStorage();
  return hasModulePermissionForUser(user, moduleKey, action);
}

export function hasRouteAccessForUser(user, pathname) {
  if (!pathname || !pathname.startsWith("/societymanagement")) return true;

  const routePermissions = {
    "/societymanagement/society": { moduleKey: "Society", action: "view" },
    "/societymanagement/building": { moduleKey: "Building", action: "view" },
    "/societymanagement/flat": { moduleKey: "Flat", action: "view" },
    "/societymanagement/resident": { moduleKey: "Resident", action: "view" },
    "/societymanagement/complaint": { moduleKey: "Complaint", action: "view" },
    "/societymanagement/maintenance-bill": { moduleKey: "Maintenance Bill", action: "view" },
    "/societymanagement/guard-assignment": { moduleKey: "Guard Assignment", action: "view" },
    "/societymanagement/staff": { moduleKey: "employees", action: "view" },
    "/societymanagement/shifts": { moduleKey: "Shift", action: "view" },
    "/societymanagement/attendance": { moduleKey: "Attendance", action: "view" },
    "/societymanagement/staff-deployment": { moduleKey: "Deployment", action: "view" },
    "/societymanagement/guard-entry": { moduleKey: "Guard Entry", action: "view" },
    "/societymanagement/gate-entry": { moduleKey: "Gate Entry", action: "view" },
    "/societymanagement/notice": { moduleKey: "Notice Board", action: "view" },
    "/societymanagement/visitor-pass": { moduleKey: "Visitor Pass", action: "view" },
    "/societymanagement/billing": { moduleKey: "Billing", action: "view" },
  };

  const routeMatch = Object.entries(routePermissions).find(([route]) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!routeMatch) return true;
  return hasModulePermissionForUser(user, routeMatch[1].moduleKey, routeMatch[1].action);
}

export function hasRouteAccess(pathname, tokenOverride = null) {
  const user = tokenOverride ? readToken(tokenOverride) : getUserFromStorage();
  return hasRouteAccessForUser(user, pathname);
}
