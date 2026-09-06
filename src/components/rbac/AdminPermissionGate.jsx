"use client";

import { createContext, useContext } from "react";
import { hasModulePermission } from "@/lib/admin-rbac";

const AdminPermissionContext = createContext(null);

export function AdminPermissionProvider({ user, children }) {
  return <AdminPermissionContext.Provider value={user}>{children}</AdminPermissionContext.Provider>;
}

export function useAdminPermission(moduleName, action = "view") {
  return hasModulePermission(useContext(AdminPermissionContext), moduleName, action);
}

export function AdminPermissionGate({ module, action, children, fallback = null }) {
  return useAdminPermission(module, action) ? children : fallback;
}
