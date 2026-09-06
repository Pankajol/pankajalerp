"use client";

import React from "react";
import LeadDetailsForm from "@/components/LeadDetailsForm";
import { useAuth } from "@/context/AuthContext";
import ProtectedPage from "@/components/ProtectedPage";

const LeadAddPage = () => {
  return <ProtectedPage permission="Lead Generation" action="create">
    <div className="max-w-5xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Lead</h1>
      <LeadDetailsForm />
    </div>
  </ProtectedPage>;
};

export default LeadAddPage;

