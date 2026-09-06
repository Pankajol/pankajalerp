"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedPage({
  module,
  action = "view",
  children,
}) {
  const router = useRouter();
  const { can, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!can(module, action)) {
      router.replace("/403");
    }
  }, [loading, module, action]);

  if (loading) return null;

  if (!can(module, action)) return null;

  return children;
}