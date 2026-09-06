// app/school/exams/question-bank/create/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaArrowLeft,
  FaSave,
  FaPlus,
  FaTrash,
  FaDatabase,
  FaBook,
  FaQuestionCircle,
  FaListUl,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";

const questionTypes = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "true-false", label: "True / False" },
  { value: "short-answer", label: "Short Answer" },
  { value: "long-answer", label: "Long Answer" },
];

export default function CreateQuestionSet() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    class: "",
    subject: "",
    questions: [],
  });

  // Add a new empty question
  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: "",
          type: "mcq",
          options: ["", "", "", ""],
          correctAnswer: 0,
          marks: 1,
        },
      ],
    }));
  };

  // Remove a question
  const removeQuestion = (index) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  // Update a question field
  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index][field] = value;
    setFormData((prev) => ({ ...prev, questions: updatedQuestions }));
  };

  const updateQuestionType = (index, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      type: value,
      options: value === "mcq" ? ["", "", "", ""] : value === "true-false" ? ["True", "False"] : [],
      correctAnswer: value === "long-answer" || value === "short-answer" ? undefined : 0,
    };
    setFormData((prev) => ({ ...prev, questions: updatedQuestions }));
  };

  // Update an option for a specific question
  const updateOption = (qIndex, optIndex, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[qIndex].options[optIndex] = value;
    setFormData((prev) => ({ ...prev, questions: updatedQuestions }));
  };

  // Add option to a question (for MCQ)
  const addOption = (qIndex) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[qIndex].options.push("");
    setFormData((prev) => ({ ...prev, questions: updatedQuestions }));
  };

  // Remove option
  const removeOption = (qIndex, optIndex) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[qIndex].options.splice(optIndex, 1);
    setFormData((prev) => ({ ...prev, questions: updatedQuestions }));
  };

  // Handle simple text/select changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit
  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.class) {
      toast.error("Please select a class");
      return;
    }
    if (!formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (formData.questions.length === 0) {
      toast.error("Add at least one question");
      return;
    }

    // Validate each question
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} has no text`);
        return;
      }
      if (q.type === "mcq") {
        const validOptions = q.options.filter((o) => o.trim() !== "");
        if (validOptions.length < 2) {
          toast.error(`Question ${i + 1} needs at least 2 options`);
          return;
        }
        if (q.correctAnswer === "" || q.correctAnswer === undefined) {
          toast.error(`Question ${i + 1} needs a correct answer`);
          return;
        }
        if (!q.options[Number(q.correctAnswer)]?.trim()) {
          toast.error(`Question ${i + 1}: selected correct option is blank`);
          return;
        }
      }
      if (q.type === "true-false") {
        if (q.correctAnswer === "" || q.correctAnswer === undefined) {
          toast.error(`Question ${i + 1} needs a correct answer (True/False)`);
          return;
        }
      }
      if (q.marks <= 0) {
        toast.error(`Question ${i + 1} marks must be > 0`);
        return;
      }
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
            q.type === "mcq" || q.type === "true-false"
              ? Number(q.correctAnswer)
              : undefined,
        })),
      };
      await api.post("/school/question-bank", payload, headers);
      toast.success("✅ Question set created successfully!");
      router.push("/school/exams/question-bank");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed");
    } finally {
      setSaving(false);
    }
  };

  const classOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((c) => ({
    value: c,
    label: `Class ${c}`,
  }));

  return (
    <div>
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
      >
        <FaArrowLeft size={20} />
        <span>Back</span>
      </motion.button>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <FaDatabase size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create Question Set</h2>
            <p className="text-sm text-gray-500">Build a collection of questions for exams</p>
          </div>
        </div>

        <form>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Algebra Basics"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <Select
                options={classOptions}
                value={classOptions.find((o) => o.value === formData.class)}
                onChange={(opt) => setFormData((prev) => ({ ...prev, class: opt?.value || "" }))}
                placeholder="Select class"
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: "16px",
                    borderColor: "#e5e7eb",
                    padding: "2px",
                    boxShadow: "none",
                    "&:hover": { borderColor: "#6366f1" },
                    "&:focus-within": {
                      borderColor: "#6366f1",
                      boxShadow: "0 0 0 2px #c7d2fe",
                    },
                  }),
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="e.g. Mathematics"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
            </div>
          </div>

          {/* Questions Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FaQuestionCircle className="text-indigo-500" />
                Questions
                <span className="text-sm font-normal text-gray-400 ml-2">
                  ({formData.questions.length} added)
                </span>
              </h3>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-2xl hover:bg-indigo-200 transition"
              >
                <FaPlus size={14} /> Add Question
              </button>
            </div>

            {formData.questions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <FaQuestionCircle size={40} className="mx-auto text-gray-300 mb-2" />
                <p>No questions yet. Click "Add Question" to start building your set.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.questions.map((q, qIndex) => (
                  <div
                    key={qIndex}
                    className="bg-gray-50 rounded-2xl p-5 border border-gray-200 relative"
                  >
                    {/* Question header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-700 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {qIndex + 1}
                        </span>
                        Question
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      >
                        <FaTrash size={15} />
                      </button>
                    </div>

                    {/* Question fields */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text *
                        </label>
                        <textarea
                          value={q.question}
                          onChange={(e) =>
                            updateQuestion(qIndex, "question", e.target.value)
                          }
                          rows="2"
                          placeholder="Enter the question"
                          className="w-full border border-gray-200 rounded-2xl px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              updateQuestionType(qIndex, e.target.value)
                            }
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                          >
                            {questionTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marks *
                          </label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) =>
                              updateQuestion(qIndex, "marks", parseInt(e.target.value) || 1)
                            }
                            min="1"
                            className="w-full border border-gray-200 rounded-2xl px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correct Answer *
                          </label>
                          {q.type === "true-false" ? (
                            <select
                              value={q.correctAnswer}
                              onChange={(e) =>
                                updateQuestion(qIndex, "correctAnswer", Number(e.target.value))
                              }
                              className="w-full border border-gray-200 rounded-2xl px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                            >
                              <option value={0}>True</option>
                              <option value={1}>False</option>
                            </select>
                          ) : q.type === "mcq" ? (
                            <select
                              value={q.correctAnswer}
                              onChange={(e) =>
                                updateQuestion(qIndex, "correctAnswer", Number(e.target.value))
                              }
                              className="w-full border border-gray-200 rounded-2xl px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                            >
                              {q.options.map((opt, optIndex) => (
                                <option key={optIndex} value={optIndex}>
                                  Option {optIndex + 1}{opt ? ` - ${opt}` : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm text-gray-500 bg-gray-100 rounded-2xl px-4 py-2">
                              Manual grading
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Options for MCQ */}
                      {q.type === "mcq" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Options *
                          </label>
                          <div className="space-y-2">
                            {q.options.map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) =>
                                    updateOption(qIndex, optIndex, e.target.value)
                                  }
                                  placeholder={`Option ${optIndex + 1}`}
                                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(qIndex, optIndex)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <FaTimesCircle size={16} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <FaPlus size={12} /> Add Option
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition disabled:opacity-60 shadow-md"
            >
              <FaSave /> {saving ? "Creating..." : "Create Question Set"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
