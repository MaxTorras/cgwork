"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Suspense } from "react";

type Question = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

type FormData = {
  id: string;
  title: string;
  description: string | null;
  final_information: string | null;
  fields: Question[];
};
function FormattedText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap text-gray-600">
      {text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </div>
  );
}
export default function PublicFormPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading form...</p>}>
      <PublicFormContent />
    </Suspense>
  );
}

function PublicFormContent() {
  const params = useParams<{ id: string }>();
  const formId = params.id;

  const [form, setForm] = useState<FormData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadForm() {
      const supabase = createClient();

      const { data, error } = await supabase
  .from("forms")
  .select("id, title, description, final_information, fields")
  .eq("id", formId)
  .eq("is_published", true)
  .maybeSingle();

      if (error) {
        setError("Unable to load this form. Please try again later.");
      } else if (!data) {
        setError("This form doesn't exist or is no longer available.");
      } else {
        setForm(data as FormData);
      }

      setLoading(false);
    }

    loadForm();
  }, [formId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase.from("submissions").insert({
      form_id: formId,
      answers,
    });

    if (error) {
      setError("We couldn't submit your answers. Please try again.");
      setSaving(false);
      return;
    }

    setSubmitted(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <p className="text-gray-600">Loading form...</p>
      </main>
    );
  }

  if (error && !form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Thank you!
          </h1>
          <p className="mt-3 text-gray-600">
            Your answers have been submitted successfully.
          </p>
        </div>
      </main>
    );
  }

  if (!form) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {form.title}
          </h1>

          {form.description && (
  <div className="mt-3">
    <FormattedText text={form.description} />
  </div>
)}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {form.fields.map((question) => (
              <div key={question.id}>
                <label
                  htmlFor={question.id}
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  {question.label}
                  {question.required && (
                    <span className="ml-1 text-red-600">*</span>
                  )}
                </label>

                {question.type === "short_text" || question.type === "text" ? (
  <input
    id={question.id}
    type="text"
    required={question.required}
    value={answers[question.id] ?? ""}
    onChange={(e) =>
      setAnswers((previous) => ({
        ...previous,
        [question.id]: e.target.value,
      }))
    }
    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500"
  />
) : question.type === "long_text" ? (
  <textarea
    id={question.id}
    required={question.required}
    value={answers[question.id] ?? ""}
    onChange={(e) =>
      setAnswers((previous) => ({
        ...previous,
        [question.id]: e.target.value,
      }))
    }
    rows={4}
    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500"
  />
) : question.type === "multiple_choice" ? (
  <div className="space-y-2">
    {question.options?.map((option) => (
      <label key={option} className="flex items-center gap-3 text-gray-700">
        <input
          type="radio"
          name={question.id}
          value={option}
          required={question.required}
          checked={answers[question.id] === option}
          onChange={() =>
            setAnswers((previous) => ({
              ...previous,
              [question.id]: option,
            }))
          }
          className="h-4 w-4"
        />
        {option}
      </label>
    ))}
  </div>
) : question.type === "checkboxes" ? (
  <div className="space-y-2">
    {question.options?.map((option) => {
      const selected = (answers[question.id] ?? "")
        .split("|||")
        .filter(Boolean);

      return (
        <label key={option} className="flex items-center gap-3 text-gray-700">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={(e) => {
              const updated = e.target.checked
                ? [...selected, option]
                : selected.filter((item) => item !== option);

              setAnswers((previous) => ({
                ...previous,
                [question.id]: updated.join("|||"),
              }));
            }}
            className="h-4 w-4 rounded"
          />
          {option}
        </label>
      );
    })}
    {question.required &&
      !(answers[question.id] ?? "").split("|||").filter(Boolean).length && (
        <input
          tabIndex={-1}
          autoComplete="off"
          aria-label={`${question.label} validation`}
          required
          value=""
          onChange={() => {}}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      )}
  </div>
) : question.type === "date" ? (
  <input
    id={question.id}
    type="date"
    required={question.required}
    value={answers[question.id] ?? ""}
    onChange={(e) =>
      setAnswers((previous) => ({
        ...previous,
        [question.id]: e.target.value,
      }))
    }
    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500"
  />
) : null}
              </div>
            ))}

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

                        {form.final_information && (
  <div className="border-t border-gray-200 pt-6">
    <FormattedText text={form.final_information} />
  </div>
)}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit answers"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
