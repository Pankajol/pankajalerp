"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiDollarSign,
  FiBook,
  FiClock,
  FiCalendar,
  FiCheckSquare,
  FiFileText,
  FiVideo,
  FiCpu,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronDown,
  FiLogOut,
  FiUser,
  FiBarChart2,
  FiTool,
  FiAward,
} from "react-icons/fi";

// ─── School Modules ─────────────────────────────────────────────────────
const ALL_MODULES = [
  { name: "Dashboard", href: "/school", icon: FiHome, moduleKey: "schoolDashboard" },
  { name: "Students", href: "/school/students", icon: FiUsers, moduleKey: "students" },
  { name: "Staff", href: "/school/staff", icon: FiUserCheck, moduleKey: "staff" },
  { name: "Attendance", href: "/school/attendance", icon: FiCheckSquare, moduleKey: "attendance" },
  { name: "Fees", href: "/school/fees", icon: FiDollarSign, moduleKey: "fees" },
  { name: "Academics", href: "/school/academics/timetable", icon: FiBook, moduleKey: "academics" },
  { name: "Exams", href: "/school/exams", icon: FiClock, moduleKey: "exams" },
  { name: "Homework", href: "/school/homework", icon: FiFileText, moduleKey: "homework" },
  { name: "Circulars", href: "/school/circulars", icon: FiCalendar, moduleKey: "circulars" },
  { name: "Live Classes", href: "/school/live-classes", icon: FiVideo, moduleKey: "liveClasses" },
  { name: "Library", href: "/school/library", icon: FiBook, moduleKey: "library" },
  { name: "Borrowings", href: "/school/borrowings", icon: FiClock, moduleKey: "Borrowings" },
  { name: "Reports", href: "/school/reports", icon: FiBarChart2, moduleKey: "reports" },
  { name: "Transport", href: "/school/bus/vehicles", icon: FiCpu, moduleKey: "transport" },
  { name: "Transport Routes", href: "/school/bus/routes", icon: FiCpu, moduleKey: "transportRoutes" },
  { name: "Bus Assignment", href: "/school/bus/assignments", icon: FiCpu, moduleKey: "busAssignment" },
  { name: "Bus Tracker", href: "/school/bus/tracker", icon: FiCpu, moduleKey: "busTracker" },
  { name: "My Bus", href: "/school/bus/my-bus", icon: FiCpu, moduleKey: "myBus" },
  { name: "My Bus Route", href: "/school/bus/my-route", icon: FiCpu, moduleKey: "myBusRoute" },
  { name: "Reports", href: "/school/reports", icon: FiBarChart2, moduleKey: "busReports" }, // duplicate href
  { name: "Training", href: "/school/training/programs", icon: FiAward, moduleKey: "training" },
  { name: "Settings", href: "/school/settings", icon: FiTool, moduleKey: "schoolSettings" },
];

// ─── Bottom Nav (Mobile) ──────────────────────────────────────────────
const BOTTOM_NAV_ITEMS = [
  { name: "Dashboard", href: "/school", icon: FiHome },
  { name: "Students", href: "/school/students", icon: FiUsers },
  { name: "Staff", href: "/school/staff", icon: FiUserCheck },
  { name: "Fees", href: "/school/fees", icon: FiDollarSign },
];

const PORTAL_MODULES = {
  student: ["schoolDashboard", "students", "attendance", "fees", "academics", "exams", "homework", "circulars", "liveClasses", "library"],
  parent: ["schoolDashboard", "students", "attendance", "fees", "academics", "exams", "homework", "circulars", "liveClasses", "library"],
  teacher: ["schoolDashboard", "students", "staff", "attendance", "academics", "exams", "homework", "circulars", "liveClasses", "library"],
};

// ─── User Menu Component ──────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const [user, setUser] = useState({ name: "", email: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          name: decoded.name || decoded.username || "User",
          email: decoded.email || "",
        });
      } catch (e) {
        console.error("Decode error:", e);
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/signin");
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials || "U"}
        </div>
        <span className="hidden sm:inline-block max-w-[120px] truncate">{user.name}</span>
        <FiChevronDown className={`text-xs transition-transform duration-200 hidden sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 sm:right-0 sm:w-48 sm:rounded-xl">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
            </div>
            <Link
              href="/admin/company"
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              <FiUser className="text-base text-gray-400" /> My Profile
            </Link>
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 text-left"
            >
              <FiLogOut className="text-base" /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────
export default function SchoolLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visibleModules, setVisibleModules] = useState(ALL_MODULES);
  const [loading, setLoading] = useState(true);
  const [internalHistory, setInternalHistory] = useState([pathname]);
  const [backPressed, setBackPressed] = useState(false);

  // ── Effects ──
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    setInternalHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last === pathname) return prev;
      return [...prev, pathname];
    });
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // ── Auth / Permissions ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      const userRoles = decoded.roles || [];
      const userModules = decoded.modules || {};
      const userType = decoded.type;
      const portalRole = (decoded.schoolRole || decoded.role || "").toLowerCase();

      if (userType === "school") {
        const allowedKeys = new Set(PORTAL_MODULES[portalRole] || ["schoolDashboard"]);
        setVisibleModules(ALL_MODULES.filter((mod) => allowedKeys.has(mod.moduleKey)));
        setLoading(false);
        return;
      }

      const isSuperUser =
        userType === "company" ||
        userRoles.includes("Company") ||
        userRoles.includes("Admin") ||
        userRoles.includes("Project Manager") ||
        userRoles.includes("Supervisor");

      if (isSuperUser) {
        setVisibleModules(ALL_MODULES);
        setLoading(false);
        return;
      }

      const filtered = ALL_MODULES.filter((mod) => {
        const modPerm = userModules[mod.moduleKey];
        return modPerm && modPerm.selected === true;
      });
      setVisibleModules(filtered.length > 0 ? filtered : []);
    } catch (err) {
      console.error("Decode error:", err);
      setVisibleModules(ALL_MODULES);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Derived ──
  const isDashboard = pathname === "/school";
  const showBackButton = !isDashboard;

  const pathSegments = pathname.split("/").filter(Boolean);
  const pageTitleFromSegment = (seg) =>
    seg?.replace(/-/g, " ")?.replace(/\b\w/g, (c) => c.toUpperCase()) || "";
  const pageTitle = pageTitleFromSegment(pathSegments[pathSegments.length - 1]);
  const parentSegment = pathSegments.length >= 3 ? pathSegments[pathSegments.length - 2] : null;
  const parentTitle = parentSegment ? pageTitleFromSegment(parentSegment) : "School";

  const canGoBack = internalHistory.length > 1;

  const handleBack = useCallback(() => {
    setBackPressed(true);
    setTimeout(() => setBackPressed(false), 200);
    if (canGoBack) {
      setInternalHistory((prev) => prev.slice(0, -1));
      router.back();
    } else {
      router.push("/school");
    }
  }, [canGoBack, router]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-indigo-600" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    ...(visibleModules.some((mod) => mod.href === "/school")
      ? visibleModules
      : [{ name: "Dashboard", href: "/school", icon: FiHome }, ...visibleModules]),
  ];

  const accessibleHrefs = new Set(navItems.map((m) => m.href));
  const visibleBottomNav = BOTTOM_NAV_ITEMS.filter((item) => accessibleHrefs.has(item.href));

  return (
    <div
      className="flex h-screen bg-gray-50 overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 shadow-xl
          flex flex-col transform transition-transform duration-250 ease-in-out
          lg:relative lg:z-auto lg:w-64 lg:shadow-none lg:translate-x-0 lg:flex-shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FiTool className="text-white text-sm" />
            </div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">
              School<span className="text-indigo-600">Hub</span>
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            aria-label="Close sidebar"
          >
            <FiX className="text-sm" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((mod) => {
            const isActive =
              mod.href === "/school"
                ? pathname === mod.href
                : pathname.startsWith(mod.href);
            return (
              <Link
                key={mod.href + mod.moduleKey}  // ✅ unique key: combination of href and moduleKey
                href={mod.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group
                  ${isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
                  }
                `}
              >
                <mod.icon
                  className={`text-base flex-shrink-0 transition-colors ${
                    isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
                <span className="truncate">{mod.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="px-3 py-2 rounded-xl bg-gray-50 text-xs text-gray-400 text-center">
            School ERP v1.0
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Main Content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ─── Top Navbar ────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="h-16 flex items-center justify-between px-3 sm:px-5 lg:px-6 gap-2">

            {/* Left cluster */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {showBackButton ? (
                <button
                  onClick={handleBack}
                  className={`
                    lg:hidden flex items-center gap-1 pl-1 pr-3 h-9 rounded-xl
                    text-indigo-600 active:text-indigo-800
                    transition-all duration-150 flex-shrink-0 select-none
                    ${backPressed ? "scale-95 opacity-60" : "scale-100 opacity-100"}
                  `}
                  aria-label={`Back to ${parentTitle}`}
                >
                  <FiChevronLeft className="text-xl flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-sm font-semibold truncate max-w-[90px]">{parentTitle}</span>
                </button>
              ) : (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-600 flex-shrink-0 transition-colors"
                  aria-label="Open sidebar"
                >
                  <FiMenu className="text-base" />
                </button>
              )}

              <div className="min-w-0 flex-1 lg:hidden flex flex-col justify-center">
                <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                  {isDashboard ? "School Hub" : pageTitle}
                </p>
                {showBackButton && pathSegments.length >= 3 && (
                  <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
                    {parentTitle}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="hidden lg:flex w-9 h-9 rounded-xl hover:bg-gray-100 active:bg-gray-200 items-center justify-center text-gray-500 flex-shrink-0 transition-colors"
                aria-label="Toggle sidebar"
              >
                <FiMenu className="text-base" />
              </button>

              {showBackButton && (
                <button
                  onClick={handleBack}
                  className={`
                    hidden lg:inline-flex items-center gap-1.5 pl-2 pr-3 h-9 rounded-xl
                    bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                    text-gray-700 text-sm font-medium
                    transition-all duration-150 flex-shrink-0 select-none
                    ${backPressed ? "scale-95" : "scale-100"}
                  `}
                  aria-label={`Back to ${parentTitle}`}
                >
                  <FiChevronLeft className="text-base" strokeWidth={2.5} />
                  {parentTitle}
                </button>
              )}

              <div className="hidden lg:flex items-center gap-1.5 min-w-0 text-sm">
                {showBackButton && (
                  <>
                    <span className="text-gray-300 select-none">/</span>
                    <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
                  </>
                )}
                {isDashboard && (
                  <span className="font-semibold text-gray-900">Dashboard</span>
                )}
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {showBackButton && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-500 flex-shrink-0 transition-colors"
                  aria-label="Open sidebar"
                >
                  <FiMenu className="text-sm" />
                </button>
              )}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* ─── Page Content ──────────────────────────────────── */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)",
          }}
        >
          <div className="p-4 sm:p-5 lg:p-6 pb-safe lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* ─── Mobile Bottom Navigation ────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch h-16">
          {visibleBottomNav.map((item) => {
            const isActive =
              item.href === "/school"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href} // bottom nav items are unique
                href={item.href}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium
                  transition-colors duration-150 active:bg-gray-50
                  ${isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"}
                `}
              >
                <item.icon
                  className={`text-xl transition-transform duration-150 ${isActive ? "scale-110" : ""}`}
                />
                <span>{item.name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-t-full" />
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 active:bg-gray-50 transition-colors"
            aria-label="More menu"
          >
            <FiMenu className="text-xl" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}