import { NextResponse } from 'next/server';

export function middleware(request) {
  // Handle preflight OPTIONS requests for all API routes
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-App-Client',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-App-Client');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};






// // middleware.js
// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";
// import { canAccessAdminPath } from "./lib/admin-rbac";

// const ROLE_ROUTES = {
//   Admin: ["/", "/admin"],
//   Employee: ["/", "/tasks"],
//   "Sales Manager": ["/", "/agent-dashboard", "/admin"],
//   "Purchase Manager": ["/", "/supplier-dashboard", "/admin"],
//   "Inventory Manager": ["/", "/inventory-dashboard", "/admin"],
//   "Accounts Manager": ["/", "/accounts-dashboard", "/admin"],
//   "HR Manager": ["/", "/hr-dashboard", "/admin"],
//   "Support Executive": ["/", "/support-dashboard", "/admin"],
//   "Production Head": ["/", "/production-dashboard", "/admin"],
//   "Project Manager": ["/", "/project-dashboard", "/admin"],
// };

// const SOCIETY_MODULES = {
//   "/societymanagement/society": { moduleKey: "Society", action: "view" },
//   "/societymanagement/building": { moduleKey: "Building", action: "view" },
//   "/societymanagement/flat": { moduleKey: "Flat", action: "view" },
//   "/societymanagement/resident": { moduleKey: "Resident", action: "view" },
//   "/societymanagement/complaint": { moduleKey: "Complaint", action: "view" },
//   "/societymanagement/maintenance-bill": { moduleKey: "Maintenance Bill", action: "view" },
//   "/societymanagement/guard-assignment": { moduleKey: "Guard Assignment", action: "view" },
//   "/societymanagement/staff": { moduleKey: "employees", action: "view" },
//   "/societymanagement/shifts": { moduleKey: "Shift", action: "view" },
//   "/societymanagement/attendance": { moduleKey: "Attendance", action: "view" },
//   "/societymanagement/staff-deployment": { moduleKey: "Deployment", action: "view" },
//   "/societymanagement/guard-entry": { moduleKey: "Guard Entry", action: "view" },
//   "/societymanagement/gate-entry": { moduleKey: "Gate Entry", action: "view" },
//   "/societymanagement/notice": { moduleKey: "Notice Board", action: "view" },
//   "/societymanagement/visitor-pass": { moduleKey: "Visitor Pass", action: "view" },
//   "/societymanagement/billing": { moduleKey: "Billing", action: "view" },
// };

// // 🆕 Public routes that don't require authentication
// const PUBLIC_ROUTES = [
//   '/signin',
//   '/signup',
//   '/register',
//   '/forgot-password',
//   '/reset-password',
//   '/api/users/login',
//   '/api/company/login',
//   '/api/auth/login',
//   '/api/users/register',
//   '/api/company/register',
//   '/api/auth/register',
//   '/api/company/register',
//   '/api/health',
//   '/api/ping',
// ];

// function hasModulePermission(user, moduleKey, action = "view") {
//   if (!user) return false;

//   const roles = Array.isArray(user.roles)
//     ? user.roles
//     : user.role
//       ? [user.role]
//       : [];
//   const normalizedRoles = roles.map((role) => String(role).trim().toLowerCase());
//   const isSuperUser =
//     user.type === "company" ||
//     normalizedRoles.some((role) => ["company", "admin", "super admin", "societyadmin", "supervisor", "manager"].includes(role));

//   if (isSuperUser) return true;

//   const modulePermissions = user.modules || {};
//   const normalizedAction = action === "read" ? "view" : action;
//   const matchedModule = Object.entries(modulePermissions).find(([name]) => {
//     const normalizedName = String(name).trim().toLowerCase();
//     return normalizedName === String(moduleKey).trim().toLowerCase();
//   });

//   if (!matchedModule) return false;

//   const [, moduleData] = matchedModule;
//   if (!moduleData || moduleData.selected === false) return false;

//   if (Array.isArray(moduleData.permissions)) {
//     return moduleData.permissions.includes(normalizedAction) || moduleData.permissions.includes("*");
//   }

//   if (moduleData.permissions && typeof moduleData.permissions === "object") {
//     return moduleData.permissions[normalizedAction] === true;
//   }

//   return false;
// }

// export function middleware(request) {
//   const { pathname } = request.nextUrl;
  
//   // 🔥 1. Allow public routes (no token required)
//   if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))) {
//     return NextResponse.next();
//   }

//   // 🔥 2. Check for token
//   const token = request.cookies.get("token")?.value;

//   if (!token) {
//     // For API routes, return 401 instead of redirect
//     if (pathname.startsWith("/api")) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized - Please login" },
//         { status: 401 }
//       );
//     }
//     return NextResponse.redirect(new URL("/signin", request.url));
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     // 🔥 3. Allow signin/unauthorized pages (with token, just let through)
//     if (pathname.startsWith("/signin") || pathname.startsWith("/unauthorized")) {
//       return NextResponse.next();
//     }

//     // 🔥 4. Handle API routes
//     if (pathname.startsWith("/api")) {
//       // For API routes, just verify token and pass through
//       // You can add the decoded user to headers if needed
//       const requestHeaders = new Headers(request.headers);
//       requestHeaders.set('x-user-id', decoded.id);
//       requestHeaders.set('x-user-email', decoded.email);
      
//       return NextResponse.next({
//         request: {
//           headers: requestHeaders,
//         },
//       });
//     }

//     // 🔥 5. Handle page routes - Check roles
//     const rolesArray = Array.isArray(decoded.roles)
//       ? decoded.roles
//       : decoded.role
//         ? [decoded.role]
//         : [];

//     if (rolesArray.length === 0) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     const allowedRoutes = rolesArray.flatMap((role) => ROLE_ROUTES[role] || []);
//     const allowed = allowedRoutes.some((route) => pathname.startsWith(route));

//     if (!allowed) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     // 🔥 6. Check admin paths
//     if (pathname.startsWith("/admin")) {
//       const hasAdminAccess = canAccessAdminPath(decoded, pathname);
//       if (!hasAdminAccess) {
//         return NextResponse.redirect(new URL("/unauthorized", request.url));
//       }
//     }

//     // 🔥 7. Check society modules
//     const accessRule = Object.entries(SOCIETY_MODULES).find(([route]) => 
//       pathname === route || pathname.startsWith(`${route}/`)
//     );
//     if (accessRule) {
//       const [, rule] = accessRule;
//       if (!hasModulePermission(decoded, rule.moduleKey, rule.action)) {
//         return NextResponse.redirect(new URL("/unauthorized", request.url));
//       }
//     }

//     return NextResponse.next();
//   } catch (error) {
//     // Token invalid
//     if (pathname.startsWith("/api")) {
//       return NextResponse.json(
//         { success: false, message: "Invalid or expired token" },
//         { status: 401 }
//       );
//     }
//     return NextResponse.redirect(new URL("/signin", request.url));
//   }
// }

// export const config = {
//   matcher: [
//     // Page routes
//     "/admin",
//     "/admin/:path*",
//     "/agent-dashboard/:path*",
//     "/supplier-dashboard/:path*",
//     "/inventory-dashboard/:path*",
//     "/accounts-dashboard/:path*",
//     "/hr-dashboard/:path*",
//     "/support-dashboard/:path*",
//     "/production-dashboard/:path*",
//     "/project-dashboard/:path*",
//     "/tasks/:path*",
//     "/societymanagement/:path*",
//     // API routes
//     "/api/:path*",
//   ],
// };




// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";
// import { canAccessAdminPath } from "./lib/admin-rbac";

// const ROLE_ROUTES = {
//   Admin: ["/", "/admin"],
//   Employee: ["/", "/tasks"],
//   "Sales Manager": ["/", "/agent-dashboard", "/admin"],
//   "Purchase Manager": ["/", "/supplier-dashboard", "/admin"],
//   "Inventory Manager": ["/", "/inventory-dashboard", "/admin"],
//   "Accounts Manager": ["/", "/accounts-dashboard", "/admin"],
//   "HR Manager": ["/", "/hr-dashboard", "/admin"],
//   "Support Executive": ["/", "/support-dashboard", "/admin"],
//   "Production Head": ["/", "/production-dashboard", "/admin"],
//   "Project Manager": ["/", "/project-dashboard", "/admin"],
// };

// const SOCIETY_MODULES = {
//   "/societymanagement/society": { moduleKey: "Society", action: "view" },
//   "/societymanagement/building": { moduleKey: "Building", action: "view" },
//   "/societymanagement/flat": { moduleKey: "Flat", action: "view" },
//   "/societymanagement/resident": { moduleKey: "Resident", action: "view" },
//   "/societymanagement/complaint": { moduleKey: "Complaint", action: "view" },
//   "/societymanagement/maintenance-bill": { moduleKey: "Maintenance Bill", action: "view" },
//   "/societymanagement/guard-assignment": { moduleKey: "Guard Assignment", action: "view" },
//   "/societymanagement/staff": { moduleKey: "employees", action: "view" },
//   "/societymanagement/shifts": { moduleKey: "Shift", action: "view" },
//   "/societymanagement/attendance": { moduleKey: "Attendance", action: "view" },
//   "/societymanagement/staff-deployment": { moduleKey: "Deployment", action: "view" },
//   "/societymanagement/guard-entry": { moduleKey: "Guard Entry", action: "view" },
//   "/societymanagement/gate-entry": { moduleKey: "Gate Entry", action: "view" },
//   "/societymanagement/notice": { moduleKey: "Notice Board", action: "view" },
//   "/societymanagement/visitor-pass": { moduleKey: "Visitor Pass", action: "view" },
//   "/societymanagement/billing": { moduleKey: "Billing", action: "view" },
// };

// function hasModulePermission(user, moduleKey, action = "view") {
//   if (!user) return false;

//   const roles = Array.isArray(user.roles)
//     ? user.roles
//     : user.role
//       ? [user.role]
//       : [];
//   const normalizedRoles = roles.map((role) => String(role).trim().toLowerCase());
//   const isSuperUser =
//     user.type === "company" ||
//     normalizedRoles.some((role) => ["company", "admin", "super admin", "societyadmin", "supervisor", "manager"].includes(role));

//   if (isSuperUser) return true;

//   const modulePermissions = user.modules || {};
//   const normalizedAction = action === "read" ? "view" : action;
//   const matchedModule = Object.entries(modulePermissions).find(([name]) => {
//     const normalizedName = String(name).trim().toLowerCase();
//     return normalizedName === String(moduleKey).trim().toLowerCase();
//   });

//   if (!matchedModule) return false;

//   const [, moduleData] = matchedModule;
//   if (!moduleData || moduleData.selected === false) return false;

//   if (Array.isArray(moduleData.permissions)) {
//     return moduleData.permissions.includes(normalizedAction) || moduleData.permissions.includes("*");
//   }

//   if (moduleData.permissions && typeof moduleData.permissions === "object") {
//     return moduleData.permissions[normalizedAction] === true;
//   }

//   return false;
// }

// export function middleware(request) {
//   const token = request.cookies.get("token")?.value;

//   if (!token) {
//     return NextResponse.redirect(new URL("/signin", request.url));
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const { pathname } = request.nextUrl;

//     if (pathname.startsWith("/signin") || pathname.startsWith("/unauthorized")) {
//       return NextResponse.next();
//     }

//     if (pathname.startsWith("/api")) {
//       return NextResponse.next();
//     }

//     const rolesArray = Array.isArray(decoded.roles)
//       ? decoded.roles
//       : decoded.role
//         ? [decoded.role]
//         : [];

//     if (rolesArray.length === 0) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     const allowedRoutes = rolesArray.flatMap((role) => ROLE_ROUTES[role] || []);
//     const allowed = allowedRoutes.some((route) => pathname.startsWith(route));

//     if (!allowed) {
//       return NextResponse.redirect(new URL("/unauthorized", request.url));
//     }

//     if (pathname.startsWith("/admin")) {
//       const hasAdminAccess = canAccessAdminPath(decoded, pathname);
//       if (!hasAdminAccess) {
//         return NextResponse.redirect(new URL("/unauthorized", request.url));
//       }
//     }

//     const accessRule = Object.entries(SOCIETY_MODULES).find(([route]) => pathname === route || pathname.startsWith(`${route}/`));
//     if (accessRule) {
//       const [, rule] = accessRule;
//       if (!hasModulePermission(decoded, rule.moduleKey, rule.action)) {
//         return NextResponse.redirect(new URL("/unauthorized", request.url));
//       }
//     }

//     return NextResponse.next();
//   } catch {
//     return NextResponse.redirect(new URL("/signin", request.url));
//   }
// }

// export const config = {
//   matcher: [
//     "/admin",
//     "/admin/:path*",
//     "/agent-dashboard/:path*",
//     "/supplier-dashboard/:path*",
//     "/inventory-dashboard/:path*",
//     "/accounts-dashboard/:path*",
//     "/hr-dashboard/:path*",
//     "/support-dashboard/:path*",
//     "/production-dashboard/:path*",
//     "/project-dashboard/:path*",
//     "/tasks/:path*",
//     "/societymanagement/:path*",
//     "/api/:path*",
//   ],
// };
