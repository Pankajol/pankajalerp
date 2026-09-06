"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaAward,
  FaBook,
  FaCalendarAlt,
  FaClock,
  FaEdit,
  FaLaptop,
  FaUserTie,
} from "react-icons/fa";

export default function ExamDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/exams/${id}`, headers);
        setExam(res.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load exam");
        router.push("/school/exams");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchExam();
  }, [id, router]);

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        Loading exam...
      </div>
    );
  }

  if (!exam) return null;

  const teacherName = exam.teacher
    ? `${exam.teacher.firstName || ""} ${exam.teacher.lastName || ""}`.trim()
    : "Not assigned";

  const stats = [
    { label: "Class", value: `Class ${exam.class}`, icon: FaBook },
    { label: "Subject", value: exam.subject, icon: FaBook },
    { label: "Date", value: new Date(exam.date).toLocaleDateString("en-GB"), icon: FaCalendarAlt },
    { label: "Duration", value: `${exam.duration} min`, icon: FaClock },
    { label: "Marks", value: exam.totalMarks, icon: FaAward },
    { label: "Teacher", value: teacherName, icon: FaUserTie },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
        >
          <FaArrowLeft /> Back
        </button>
        <button
          onClick={() => router.push(`/school/exams/${exam._id}/edit`)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-white shadow-md transition hover:bg-indigo-700"
        >
          <FaEdit /> Edit Exam
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              {exam.type === "online" ? <FaLaptop /> : <FaCalendarAlt />}
              {exam.type === "online" ? "Online Exam" : "Offline Exam"}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">{exam.title}</h2>
          </div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold capitalize text-emerald-700">
            {exam.status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Icon className="text-indigo-500" /> {item.label}
                </div>
                <div className="font-semibold text-gray-900">{item.value || "-"}</div>
              </div>
            );
          })}
        </div>

        {exam.type === "online" && (
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
            <h3 className="mb-3 font-semibold text-indigo-900">Online Settings</h3>
            <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-3">
              <div>Randomise Questions: {exam.randomizeQuestions ? "Yes" : "No"}</div>
              <div>Allow Navigation: {exam.allowNavigation ? "Yes" : "No"}</div>
              <div>Show Results: {exam.showResults ? "Yes" : "No"}</div>
            </div>
            {exam.instructions && (
              <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{exam.instructions}</p>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-gray-100 p-5">
          <h3 className="mb-3 font-semibold text-gray-900">Questions</h3>
          {exam.questions?.length ? (
            <div className="space-y-3">
              {exam.questions.map((q, index) => (
                <div key={`${q.question}-${index}`} className="rounded-xl bg-gray-50 p-4">
                  <div className="font-medium text-gray-900">{index + 1}. {q.question}</div>
                  <div className="mt-1 text-sm text-gray-500">{q.type} • {q.marks || 0} marks</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No questions attached to this exam yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
