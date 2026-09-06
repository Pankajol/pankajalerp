"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaArrowLeft, FaDatabase, FaEdit } from "react-icons/fa";

export default function QuestionSetDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [questionSet, setQuestionSet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionSet = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/question-bank/${id}`, headers);
        setQuestionSet(res.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load question set");
        router.push("/school/exams/question-bank");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchQuestionSet();
  }, [id, router]);

  if (loading) {
    return <div className="py-16 text-center text-gray-500">Loading question set...</div>;
  }

  if (!questionSet) return null;

  const answerText = (question) => {
    if (question.correctAnswer === undefined || question.correctAnswer === null) return "Manual grading";
    return question.options?.[question.correctAnswer] || `Option ${Number(question.correctAnswer) + 1}`;
  };

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
          onClick={() => router.push(`/school/exams/question-bank/${questionSet._id}/edit`)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-white shadow-md transition hover:bg-indigo-700"
        >
          <FaEdit /> Edit Set
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <FaDatabase size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{questionSet.title}</h2>
            <p className="text-sm text-gray-500">
              Class {questionSet.class} • {questionSet.subject} • {questionSet.questions?.length || 0} questions
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {questionSet.questions?.map((question, index) => (
            <div key={`${question.question}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900">Question {index + 1}</h3>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                  {question.type} • {question.marks || 0} marks
                </span>
              </div>
              <p className="whitespace-pre-wrap text-gray-800">{question.question}</p>
              {question.options?.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={`${option}-${optionIndex}`} className="rounded-xl bg-white px-4 py-2 text-sm text-gray-700">
                      {optionIndex + 1}. {option}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 text-sm font-medium text-emerald-700">
                Correct answer: {answerText(question)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
