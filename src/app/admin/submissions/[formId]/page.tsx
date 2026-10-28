// src\app\admin\submissions\[formId]\page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Suspense } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Question = {
  id: string;
  label: string;
  type?: string;
  options?: string[];
  kind?: "question" | "section";
  sectionDescription?: string;
};

type FormData = {
id: string;
title: string;
fields: Question[];
};

type Submission = {
id: string;
answers: Record<string, string>;
created_at: string;
};

export default function FormResponsesPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading submissions...</p>}>
      <FormResponsesContent />
    </Suspense>
  );
}

function FormResponsesContent() {
  const params = useParams();
  const formId = params.formId as string;

const [form, setForm] = useState<FormData | null>(null);
const [submissions, setSubmissions] = useState<Submission[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [activeTab, setActiveTab] = useState<"summary" | "individual">(
  "summary"
);

useEffect(() => {
async function loadData() {
const supabase = createClient();

  const { data: formData, error: formError } = await supabase
    .from("forms")
    .select("id, title, fields")
    .eq("id", formId)
    .single();

  if (formError || !formData) {
    setError("Unable to load this form.");
    setLoading(false);
    return;
  }

  setForm(formData as FormData);

  const { data: submissionData, error: submissionError } =
    await supabase
      .from("submissions")
      .select("id, answers, created_at")
      .eq("form_id", formId)
      .order("created_at", { ascending: false });

  if (submissionError) {
    setError("Unable to load responses for this form.");
    console.error(submissionError);
  } else {
    setSubmissions((submissionData ?? []) as Submission[]);
  }

  setLoading(false);
}

loadData();

}, [formId]);

const questionFields =
  form?.fields.filter((field) => field.kind !== "section") ?? [];

const getAnswerSummary = (field: Question) => {
  const counts: Record<string, number> = {};

  submissions.forEach((submission) => {
    const answer = submission.answers?.[field.id];

    if (Array.isArray(answer)) {
      answer.forEach((item) => {
        const value = String(item).trim();
        if (value) {
          counts[value] = (counts[value] ?? 0) + 1;
        }
      });
      return;
    }

    if (typeof answer === "string" && answer.trim()) {
      const values =
  field.type === "checkboxes"
    ? answer.split("|||").map((item) => item.trim()).filter(Boolean)
    : [answer.trim()];

      values.forEach((value) => {
        counts[value] = (counts[value] ?? 0) + 1;
      });
    }
  });

  const allOptions =
  field.type === "checkboxes" ||
  field.type === "multiple_choice" ||
  field.type === "radio" ||
  field.type === "select" ||
  field.type === "dropdown"
    ? field.options ?? []
    : [];

const answersToShow = allOptions.length
  ? allOptions.map((option) => ({
      answer: option,
      count: counts[option] ?? 0,
    }))
  : Object.entries(counts).map(([answer, count]) => ({
      answer,
      count,
    }));

return answersToShow
  .map(({ answer, count }) => ({
    answer,
    count,
    percentage:
      submissions.length > 0
        ? Math.round((count / submissions.length) * 100)
        : 0,
  }))
  .sort((a, b) => b.count - a.count);
};

  const exportToCSV = () => {
    if (!form) return;

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const questionFields = form.fields.filter(
  (field) => field.kind !== "section"
);

const headers = [
  "Submitted",
  ...questionFields.map((field) => field.label),
];

    const rows = submissions.map((submission) => [
  new Date(submission.created_at).toLocaleString("en-GB"),
  ...questionFields.map((field) => {
    const answer = submission.answers?.[field.id];
    return answer || "";
  }),
]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${
      form.title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").trim() ||
      "form-responses"
    }.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };
return (
<main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
<div className="mx-auto max-w-7xl">
<Link
       href="/admin/submissions"
       className="text-sm text-indigo-600 hover:underline"
     >
← Back to submissions
</Link>

    <div className="mt-6">
      <h1 className="text-3xl font-bold text-gray-900">
        {form?.title ?? "Form responses"}
      </h1>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
  <p className="text-gray-600">
    {submissions.length} response{submissions.length === 1 ? "" : "s"}
  </p>

<button
  onClick={() => exportToCSV()}
  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
>
  Export CSV
</button>
</div>
    </div>

{!loading && !error && form && (
  <div className="mt-8 border-b border-gray-200">
    <div className="flex gap-6">
      <button
        onClick={() => setActiveTab("summary")}
        className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
          activeTab === "summary"
            ? "border-indigo-600 text-indigo-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Summary
      </button>

      <button
        onClick={() => setActiveTab("individual")}
        className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
          activeTab === "individual"
            ? "border-indigo-600 text-indigo-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Individual responses
      </button>
    </div>
  </div>
)}

    {loading ? (
      <p className="mt-8 text-gray-600">Loading responses...</p>
    ) : error ? (
      <p role="alert" className="mt-8 text-red-600">
        {error}
      </p>
    ) : !form ? (
      <p className="mt-8 text-gray-600">Form not found.</p>
    ) : submissions.length === 0 ? (
  <p className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
    This form has no responses yet.
  </p>
) : activeTab === "summary" ? (
  <div className="mt-8 space-y-6">
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">
        Total responses
      </p>
      <p className="mt-2 text-4xl font-bold text-gray-900">
        {submissions.length}
      </p>
    </div>

    {questionFields.map((field) => {
      const summary = getAnswerSummary(field);
      const isChoiceQuestion = [
        "multiple_choice",
        "radio",
        "select",
        "dropdown",
        "checkbox",
        "checkboxes",
      ].includes(field.type ?? "");

      return (
        <section
          key={field.id}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {field.label}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {summary.reduce((total, item) => total + item.count, 0)} recorded
            answers
          </p>

          {summary.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No answers yet.
            </p>
          ) : isChoiceQuestion ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="answer"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Responses"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary}
                      dataKey="count"
                      nameKey="answer"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {summary.map((item, index) => (
                        <Cell
                          key={item.answer}
                          fill={
                            [
                              "#4f46e5",
                              "#0d9488",
                              "#f59e0b",
                              "#e11d48",
                              "#7c3aed",
                              "#0284c7",
                            ][index % 6]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {summary.map((item) => (
                <div
                  key={item.answer}
                  className="rounded-lg bg-gray-50 p-3"
                >
                  <p className="whitespace-pre-wrap wrap-break-words text-sm text-gray-800">
                    {item.answer}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.count} {item.count === 1 ? "response" : "responses"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    })}
  </div>
) : (
  <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 bg-white">
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 font-semibold text-gray-700">
            Submitted
          </th>

          {questionFields.map((field) => (
            <th
              key={field.id}
              className="min-w-40 border-b border-gray-200 px-4 py-3 font-semibold text-gray-700"
            >
              {field.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {submissions.map((submission) => (
          <tr key={submission.id} className="hover:bg-indigo-50/40">
            <td className="whitespace-nowrap border-b border-gray-100 px-4 py-3 text-gray-500">
              {new Date(submission.created_at).toLocaleString("en-GB", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </td>

            {questionFields.map((field) => {
              const answer = submission.answers?.[field.id];

              return (
                <td
                  key={field.id}
                  className="max-w-xs border-b border-gray-100 px-4 py-3 text-gray-900"
                >
                  <div className="whitespace-pre-wrap wrap-break-words">
                    {Array.isArray(answer)
                      ? answer.join(", ")
                      : answer || "—"}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
  </div>
</main>

);
}