"use client";

import { useRouter } from "next/navigation";
import { FaLock } from "react-icons/fa";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">

        <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <FaLock className="text-4xl text-red-600" />
        </div>

        <h1 className="text-3xl font-bold mt-6 text-gray-800">
          403
        </h1>

        <h2 className="text-xl font-semibold mt-2 text-gray-700">
          Access Denied
        </h2>

        <p className="text-gray-500 mt-4">
          You don't have permission to access this page.
          Please contact your administrator if you believe this is an error.
        </p>

        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            Go Back
          </button>

          <button
            onClick={() => router.push("/admin")}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}