"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { FaArrowLeft, FaPlus, FaSave, FaTrash } from "react-icons/fa";

const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const questionTypes = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "true-false", label: "True / False" },
  { value: "short-answer", label: "Short Answer" },
  { value: "long-answer", label: "Long Answer" },
];

const emptyQuestion = {
  question: "",
  type: "mcq",
  options: ["", "", "", ""],
  correctAnswer: 0,
  marks: 1,
};

export default function EditQuestionSetPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    class: "",
    subject: "",
    questions: [],
  });

  useEffect(() => {
    const fetchQuestionSet = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const res = await api.get(`/school/question-bank/${id}`, headers);
        const data = res.data.data;
        setFormData({
          title: data.title || "",
          class: data.class || "",
          subject: data.subject || "",
          questions: (data.questions || []).map((q) => ({
            question: q.question || "",
            type: q.type || "mcq",
            options: q.options?.length ? q.options : q.type === "true-false" ? ["True", "False"] : [],
            correctAnswer: q.correctAnswer ?? (q.type === "short-answer" || q.type === "long-answer" ? undefined : 0),
            marks: q.marks || 1,
          })),
        });
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load question set");
        router.push("/school/exams/question-bank");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchQuestionSet();
  }, [id, router]);

  const updateQuestion = (index, field, value) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  };

  const updateQuestionType = (index, type) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      questions[index] = {
        ...questions[index],
        type,
        options: type === "mcq" ? ["", "", "", ""] : type === "true-false" ? ["True", "False"] : [],
        correctAnswer: type === "short-answer" || type === "long-answer" ? undefined : 0,
      };
      return { ...prev, questions };
    });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[questionIndex].options];
      options[optionIndex] = value;
      questions[questionIndex] = { ...questions[questionIndex], options };
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setFormData((prev) => ({ ...prev, questions: [...prev.questions, { ...emptyQuestion }] }));
  };

  const removeQuestion = (index) => {
    setFormData((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
  };

  const validate = () => {
    if (!formData.title.trim()) return "Title is required";
    if (!formData.class) return "Class is required";
    if (!formData.subject.trim()) return "Subject is required";
    if (!formData.questions.length) return "Add at least one question";
    for (let i = 0; i < formData.questions.length; i += 1) {
      const q = formData.questions[i];
      if (!q.question.trim()) return `Question ${i + 1} has no text`;
      if (q.marks <= 0) return `Question ${i + 1} marks must be greater than 0`;
      if (q.type === "mcq" && q.options.filter((option) => option.trim()).length < 2) {
        return `Question ${i + 1} needs at least 2 options`;
      }
    }
    return "";
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        ...formData,
        questions: formData.questions.map((q) => ({
          ...q,
          correctAnswer:
            q.type === "mcq" || q.type === "true-false" ? Number(q.correctAnswer || 0) : undefined,
        })),
      };
      await api.put(`/school/question-bank/${id}`, payload, headers);
      toast.success("Question set updated");
      router.push(`/school/exams/question-bank/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-gray-500">Loading question set...</div>;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
      >
        <FaArrowLeft /> Back
      </button>

      <div className="mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Question Set</h2>
          <p className="text-sm text-gray-500">Update questions used for exams</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <input
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="rounded-2xl border border-gray-200 px-5 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <select
            value={formData.class}
            onChange={(e) => setFormData((prev) => ({ ...prev, class: e.target.value }))}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Select class</option>
            {classOptions.map((item) => (
              <option key={item} value={item}>Class {item}</option>
            ))}
          </select>
          <input
            value={formData.subject}
            onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
            placeholder="Subject"
            className="rounded-2xl border border-gray-200 px-5 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Questions ({formData.questions.length})</h3>
          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center gap-2 rounded-2xl bg-indigo-100 px-4 py-2 text-indigo-700 transition hover:bg-indigo-200"
          >
            <FaPlus size={14} /> Add Question
          </button>
        </div>

        <div className="space-y-5">
          {formData.questions.map((question, questionIndex) => (
            <div key={questionIndex} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="font-semibold text-gray-800">Question {questionIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(questionIndex)}
                  className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
                >
                  <FaTrash />
                </button>
              </div>

              <textarea
                value={question.question}
                onChange={(e) => updateQuestion(questionIndex, "question", e.target.value)}
                placeholder="Question text"
                rows="2"
                className="mb-3 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />

              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <select
                  value={question.type}
                  onChange={(e) => updateQuestionType(questionIndex, e.target.value)}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={question.marks}
                  onChange={(e) => updateQuestion(questionIndex, "marks", Number(e.target.value) || 1)}
                  className="rounded-2xl border border-gray-200 px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                {(question.type === "mcq" || question.type === "true-false") ? (
                  <select
                    value={question.correctAnswer ?? 0}
                    onChange={(e) => updateQuestion(questionIndex, "correctAnswer", Number(e.target.value))}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    {(question.options || []).map((option, optionIndex) => (
                      <option key={optionIndex} value={optionIndex}>
                        Option {optionIndex + 1}{option ? ` - ${option}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-500">Manual grading</div>
                )}
              </div>

              {question.type === "mcq" && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <input
                      key={optionIndex}
                      value={option}
                      onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                      placeholder={`Option ${optionIndex + 1}`}
                      className="rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-gray-300 px-6 py-2.5 text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <FaSave /> {saving ? "Saving..." : "Update Set"}
          </button>
        </div>
      </div>
    </div>
  );
}
