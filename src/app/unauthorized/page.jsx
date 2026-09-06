"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function UnauthorizedPage() {
  const message = "You do not have permission to access this page.";
  useEffect(() => {
    const shouldShowMessage = sessionStorage.getItem("adminPermissionDenied") === "true";
    if (shouldShowMessage) {
      sessionStorage.removeItem("adminPermissionDenied");
      window.alert(message);
    }
  }, []);

  return <main className="min-h-screen grid place-items-center bg-gray-50 p-6"><section className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-gray-900">Access denied</h1><p className="mt-3 text-gray-600">{message}</p><Link className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white" href="/admin">Return to dashboard</Link></section></main>;
}
