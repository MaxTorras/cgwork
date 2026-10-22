"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Suspense } from "react";


type Question = {
  id: string;
  label: string;
  type:
    | "short_text"
    | "text"
    | "long_text"
    | "multiple_choice"
    | "checkboxes"
    | "date";
  required: boolean;
  options: string[];
};

type FormData = {
  id: string;
  title: string;
  description: string | null;
  fields: Question[];
  is_published: boolean;
};

export default function EditFormPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading form...</p>}>
      <EditFormContent />
    </Suspense>
  );
}

function EditFormContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadForm() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("forms")
        .select("id, title, description, fields, is_published")
        .eq("id", params.id)
        .maybeSingle();

      if (error || !data) {
        setError("Unable to load this form.");
        setLoading(false);
        return;
      }

      const form = data as FormData;

      setTitle(form.title);
      setDescription(form.description ?? "");
      setQuestions(
        (form.fields ?? []).map((question) => ({
          ...question,
          type: question.type === "text" ? "short_text" : question.type,
          required: question.required ?? true,
          options: question.options ?? [],
        }))
      );

      setLoading(false);
    }

    loadForm();
  }, [params.id]);

  function updateQuestion(
    id: string,
    changes: Partial<Question>
  ) {
    setQuestions((previous) =>
      previous.map((question) =>
        question.id === id
          ? { ...question, ...changes }
          : question
      )
    );
  }

  async function saveForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const fields = questions
      .filter((question) => question.label.trim())
      .map((question) => ({
        ...question,
        label: question.label.trim(),
        options: question.options
          .map((option) => option.trim())
          .filter(Boolean),
      }));

    if (fields.length === 0) {
      setError("Please add at least one question.");
      return;
    }

    for (const question of fields) {
      if (
        (question.type === "multiple_choice" ||
          question.type === "checkboxes") &&
        question.options.length === 0
      ) {
        setError(
          `Please add at least one option to "${question.label}".`
        );
        return;
      }
    }

    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("forms")
      .update({
        title: title.trim(),
        description: description.trim(),
        fields,
      })
      .eq("id", params.id);

    if (error) {
      setError("Unable to save your changes. Please try again.");
    } else {
      setQuestions(fields);
      setSuccess("Form updated successfully!");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Loading form...</p>
      </main>
    );
  }

  if (error && questions.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">{error}</p>
        <Link
          href="/admin/forms"
          className="mt-4 inline-block text-indigo-600 hover:underline"
        >
          Back to forms
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/forms"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to forms
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Edit form
        </h1>

        <p className="mt-2 text-gray-600">
          Update your form and its questions.
        </p>

        <form onSubmit={saveForm} className="mt-8 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Form title
              </label>

              <input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Questions
            </h2>

            <div className="mt-5 space-y-5">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      Question {index + 1}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((previous) =>
                          previous.filter(
                            (item) => item.id !== question.id
                          )
                        )
                      }
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <label className="mb-2 block text-sm text-gray-700">
                    Question text
                  </label>

                  <input
                    value={question.label}
                    onChange={(e) =>
                      updateQuestion(question.id, {
                        label: e.target.value,
                      })
                    }
                    placeholder="Enter your question"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  />

                  <label className="mb-2 mt-4 block text-sm text-gray-700">
                    Answer type
                  </label>

                  <select
                    value={
                      question.type === "text"
                        ? "short_text"
                        : question.type
                    }
                    onChange={(e) =>
                      updateQuestion(question.id, {
                        type: e.target.value as Question["type"],
                        options: [],
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  >
                    <option value="short_text">Short answer</option>
                    <option value="long_text">Long answer</option>
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="checkboxes">Checkboxes</option>
                    <option value="date">Date</option>
                  </select>

                  {(question.type === "multiple_choice" ||
                    question.type === "checkboxes") && (
                    <div className="mt-4">
                      <label className="mb-2 block text-sm text-gray-700">
                        Answer options (one per line)
                      </label>

                      <textarea
                        value={question.options.join("\n")}
                        onChange={(e) =>
                          updateQuestion(question.id, {
                            options: e.target.value.split("\n"),
                          })
                        }
                        rows={3}
                        placeholder={"Option 1\nOption 2\nOption 3"}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                      />
                    </div>
                  )}

                  <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={question.required}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          required: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />
                    Required question
                  </label>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setQuestions((previous) => [
                  ...previous,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    type: "short_text",
                    required: true,
                    options: [],
                  },
                ])
              }
              className="mt-5 rounded-lg border border-indigo-600 px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-50"
            >
              + Add question
            </button>
          </section>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700">{success}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </main>
  );
}