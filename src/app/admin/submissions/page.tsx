"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";


type FormOption = {
  id: string;
  title: string;
};

export default function SubmissionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forms, setForms] = useState<FormOption[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadSubmissions() {
      const supabase = createClient();
const { data: formsData, error: formsError } = await supabase
  .from("forms")
  .select("id, title")
  .order("title", { ascending: true });

if (formsError) {
console.error("Error loading forms:", formsError);
} else {
setForms(formsData ?? []);

const { data: countData, error: countError } = await supabase
.from("submissions")
.select("form_id");

if (countError) {
console.error("Error loading response counts:", countError);
} else {
const counts: Record<string, number> = {};

for (const submission of countData ?? []) {
  counts[submission.form_id] = (counts[submission.form_id] ?? 0) + 1;
}

setResponseCounts(counts);

}
}

     setLoading(false);
    }

    loadSubmissions();
  }, []);
  return (
    
    <main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Submissions
        </h1>
        <p className="mt-2 text-gray-600">
  Select a form to view its responses in a spreadsheet.
</p>

        
        {loading ? (

  <p className="mt-8 text-gray-600">Loading forms...</p>
) : error ? (
  <p role="alert" className="mt-8 text-red-600">
    {error}
  </p>
) : forms.length === 0 ? (
  <p className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
    No forms found. Create a form first to start collecting responses.
  </p>
) : (
  <div className="mt-8 space-y-4">
    {forms.map((form) => (
      <article
        key={form.id}
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {form.title}
          </h2>

      <p className="mt-1 text-sm text-gray-500">
        {responseCounts[form.id] ?? 0}{" "}
        {(responseCounts[form.id] ?? 0) === 1 ? "response" : "responses"}
      </p>
    </div>

    <Link
      href={`/admin/submissions/${form.id}`}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
    >
      View responses →
    </Link>
  </article>
))}

  </div>
)}
 </div>
    </main>
  );
}