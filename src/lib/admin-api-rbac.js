import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

export function permissionForMethod(method) {
  return ({ GET: "view", POST: "create", PUT: "edit", PATCH: "edit", DELETE: "delete" })[method] || "view";
}

export function requireAdminPermission(req, moduleName, action = permissionForMethod(req.method)) {
  const token = getTokenFromHeader(req);
  if (!token) return { response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const user = verifyJWT(token);
  if (!user) return { response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  if (!hasPermission(user, moduleName, action)) {
    return { response: NextResponse.json({ message: "You do not have permission" }, { status: 403 }) };
  }
  return { user };
}

export function requireUserManagement(req, action = permissionForMethod(req.method)) {
  const token = getTokenFromHeader(req);
  if (!token) return { response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const user = verifyJWT(token);
  const isOwner = user?.type === "company";
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("Admin");
  if (!user || (!isOwner && !isAdmin)) {
    return { response: NextResponse.json({ message: "You do not have permission" }, { status: 403 }) };
  }
  return { user };
}
