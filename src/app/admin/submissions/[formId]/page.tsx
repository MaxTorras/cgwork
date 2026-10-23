"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Suspense } from "react";

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
    ) : (
      <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 font-semibold text-gray-700">
                Submitted
              </th>

              {form.fields
  .filter((field) => field.kind !== "section")
  .map((field) => (
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
              <tr
                key={submission.id}
                className="hover:bg-indigo-50/40"
              >
                <td className="whitespace-nowrap border-b border-gray-100 px-4 py-3 text-gray-500">
                  {new Date(submission.created_at).toLocaleString(
                    "en-GB",
                    {
                      dateStyle: "short",
                      timeStyle: "short",
                    }
                  )}
                </td>

                {form.fields
  .filter((field) => field.kind !== "section")
  .map((field) => (
    <td
      key={field.id}
      className="max-w-xs border-b border-gray-100 px-4 py-3 text-gray-900"
    >
      <div className="whitespace-pre-wrap wrap-break-words">
        {submission.answers?.[field.id] || "—"}
      </div>
    </td>
  ))}
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