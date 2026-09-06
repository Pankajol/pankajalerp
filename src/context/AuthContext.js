"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasPermission, hasRole } from "@/lib/auth";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const payload = decodeToken(token);

    if (!payload) {
      localStorage.removeItem("token");
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(payload);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();

    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
    };
  }, []);

const login = (token) => {
  localStorage.setItem("token", token);

  const payload = decodeToken(token);

  setUser(payload);
  setLoading(false);
};

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const can = (module, action = "view") =>
    hasPermission(user, module, action);

  const hasUserRole = (role) =>
    hasRole(user, role);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser: loadUser,
      can,
      hasUserRole,
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}



// // context/AuthContext.js
// "use client"
// import { createContext, useContext, useState, useEffect } from 'react';
// import jwt from "@/"

// const AuthContext = createContext();

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     // Load user from token
//     const token = localStorage.getItem('token');
//     if (token) {
//       // Decode token and set user
//       const decoded = verifyJWT(token);
//       setUser(decoded);
//     }
//   }, []);

//   return (
//     <AuthContext.Provider value={{ user, setUser }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   return useContext(AuthContext);
// }