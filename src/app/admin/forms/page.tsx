"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Form = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
};


type Question = {
id: string;
label: string;
type: "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "date";
required: boolean;
options: string[];
kind?: "question" | "section";
sectionDescription?: string;
};

function moveQuestion(
  questions: Question[],
  fromIndex: number,
  toIndex: number
): Question[] {
  if (toIndex < 0 || toIndex >= questions.length) {
    return questions;
  }

  const updatedQuestions = [...questions];
  const [movedQuestion] = updatedQuestions.splice(fromIndex, 1);
  updatedQuestions.splice(toIndex, 0, movedQuestion);

  return updatedQuestions;
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [finalInformation, setFinalInformation] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  async function loadForms() {
    const { data, error } = await supabase
      .from("forms")
      .select("id, title, description, is_published, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setForms(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
  loadForms();

  setQuestions([
    {
      id: crypto.randomUUID(),
      label: "",
      type: "short_text",
      required: true,
      options: [],
    },
  ]);
}, []);

  async function createForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    const fields = questions
  .filter((question) => question.label.trim())
  .map((question) => ({
    ...question,
    label: question.label.trim(),
    options: question.options.filter((option) => option.trim()),
  }));

    if (fields.length === 0) {
      setError("Please add at least one question.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("forms").insert({
  title: title.trim(),
  description: description.trim(),
  final_information: finalInformation.trim(),
  fields,
  is_published: false,
});

    if (error) {
      setError(error.message);
    } else {
      setTitle("");
      setDescription("");
      setFinalInformation("");
      setQuestions([
  {
    id: crypto.randomUUID(),
    label: "",
    type: "short_text",
    required: true,
    options: [],
  },
]);
      setSuccess("Form created successfully!");
      await loadForms();
    }

    setSaving(false);
  }
  async function togglePublished(form: Form) {
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("forms")
      .update({ is_published: !form.is_published })
      .eq("id", form.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(
        form.is_published
          ? "Form unpublished successfully."
          : "Form published successfully."
      );

      await loadForms();
    }
  }
  async function deleteForm(form: Form) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${form.title}"?\n\nThis will permanently delete the form and all its submissions. This action cannot be undone.`
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");

  const supabase = createClient();

  const { error } = await supabase
    .from("forms")
    .delete()
    .eq("id", form.id);

  if (error) {
    setError("Unable to delete the form. Please try again.");
  } else {
    setSuccess(`"${form.title}" was deleted successfully.`);
    await loadForms();
  }
}
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <a
          href="/admin"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </a>

        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Forms
        </h1>

        <p className="mt-2 text-gray-600">
          Create forms and manage your responses.
        </p>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Create a new form
          </h2>

          <form onSubmit={createForm} className="mt-6 space-y-5">
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
                placeholder="e.g. Tournament registration"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>

            <div>
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
                placeholder="Explain what this form is for..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>
            <div>
  <label
    htmlFor="finalInformation"
    className="mb-2 block text-sm font-medium text-gray-700"
  >
    Final information (optional)
  </label>

  <textarea
    id="finalInformation"
    value={finalInformation}
    onChange={(e) => setFinalInformation(e.target.value)}
    placeholder="e.g. Thank you for your interest! More information will follow..."
    rows={4}
    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
  />

  <p className="mt-1 text-xs text-gray-500">
    This message will appear at the end of the form.
  </p>
</div>

            <div>
  <h3 className="mb-3 text-sm font-medium text-gray-700">
    Questions
  </h3>
</div>
  <div className="space-y-4">
  {questions.map((question, index) => (
    <div
      key={question.id}
      className={
        question.kind === "section"
          ? "rounded-xl border-2 border-green-200 bg-green-50 p-4"
          : "rounded-xl border border-gray-200 bg-white p-4"
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-medium text-gray-900">
          {question.kind === "section"
            ? "Section"
            : `Question ${index + 1}`}
        </h4>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() =>
          setQuestions((previous) =>
            moveQuestion(previous, index, index - 1)
          )
        }
        disabled={index === 0}
        className="text-sm text-gray-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↑ Up
      </button>

      <button
        type="button"
        onClick={() =>
          setQuestions((previous) =>
            moveQuestion(previous, index, index + 1)
          )
        }
        disabled={index === questions.length - 1}
        className="text-sm text-gray-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↓ Down
      </button>

      <button
        type="button"
        onClick={() =>
          setQuestions((previous) =>
            previous.filter((item) => item.id !== question.id)
          )
        }
        className="text-sm text-red-600 hover:underline"
      >
        Remove
      </button>
    </div>
  </div>

  {question.kind === "section" ? (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Section title
      </label>

      <input
        type="text"
        value={question.label}
        onChange={(e) =>
          setQuestions((previous) =>
            previous.map((item) =>
              item.id === question.id
                ? { ...item, label: e.target.value }
                : item
            )
          )
        }
        placeholder="e.g. Personal information"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
      />

      <label className="mb-2 mt-4 block text-sm font-medium text-gray-700">
        Section description (optional)
      </label>

      <textarea
        value={question.sectionDescription ?? ""}
        onChange={(e) =>
          setQuestions((previous) =>
            previous.map((item) =>
              item.id === question.id
                ? { ...item, sectionDescription: e.target.value }
                : item
            )
          )
        }
        placeholder="Explain what this section is about..."
        rows={2}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
      />
    </div>
  ) : (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Question text
        </label>

        <input
          type="text"
          value={question.label}
          onChange={(e) =>
            setQuestions((previous) =>
              previous.map((item) =>
                item.id === question.id
                  ? { ...item, label: e.target.value }
                  : item
              )
            )
          }
          placeholder="e.g. What is your full name?"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Answer type
        </label>

        <select
          value={question.type}
          onChange={(e) =>
            setQuestions((previous) =>
              previous.map((item) =>
                item.id === question.id
                  ? {
                      ...item,
                      type: e.target.value as Question["type"],
                      options: [],
                    }
                  : item
              )
            )
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
        >
          <option value="short_text">Short answer</option>
          <option value="long_text">Long answer</option>
          <option value="multiple_choice">Multiple choice</option>
          <option value="checkboxes">Checkboxes</option>
          <option value="date">Date</option>
        </select>
      </div>

      {(question.type === "multiple_choice" ||
        question.type === "checkboxes") && (
        <div>
          <label className="mb-2 block text-sm text-gray-700">
            Answer options
          </label>

          <textarea
            value={question.options.join("\n")}
            onChange={(e) =>
              setQuestions((previous) =>
                previous.map((item) =>
                  item.id === question.id
                    ? {
                        ...item,
                        options: e.target.value.split("\n"),
                      }
                    : item
                )
              )
            }
            placeholder={"Option 1\nOption 2\nOption 3"}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
          />

          <p className="mt-1 text-xs text-gray-500">
            Enter one option per line.
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={question.required}
          onChange={(e) =>
            setQuestions((previous) =>
              previous.map((item) =>
                item.id === question.id
                  ? { ...item, required: e.target.checked }
                  : item
              )
            )
          }
          className="h-4 w-4 rounded border-gray-300"
        />
        Required question
      </label>
    </div>
  )}
</div>

))}

</div>

  <div className="mt-4 flex flex-wrap gap-3">
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
          kind: "question",
        },
      ])
    }
    className="rounded-lg border border-indigo-600 px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-50"
  >
    + Add question
  </button>

<button
  type="button"
  onClick={() =>
    setQuestions((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        label: "",
        type: "short_text",
        required: false,
        options: [],
        kind: "section",
        sectionDescription: "",
      },
    ])
  }
  className="rounded-lg border border-green-600 px-4 py-2 font-medium text-green-700 hover:bg-green-50"
>
  + Add section
</button>
</div>

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
              className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create form"}
            </button>
          </form>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Your forms
          </h2>

          {loading ? (
            <p className="mt-4 text-gray-600">Loading forms...</p>
          ) : forms.length === 0 ? (
            <p className="mt-4 text-gray-600">
              You haven't created any forms yet.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {forms.map((form) => (
                <article
                  key={form.id}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {form.title}
                      </h3>

                      {form.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {form.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
    {form.is_published ? "Published" : "Draft"}
  </span>

  {form.is_published && (
    <a
      href={`/forms/${form.id}`}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
    >
      Open form
    </a>
    
  )}
<a
  href={`/admin/forms/${form.id}`}
  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  Edit
</a>
<button
  type="button"
  onClick={() => deleteForm(form)}
  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
>
  Delete
</button>
  <button
    onClick={() => togglePublished(form)}
    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
  >
    {form.is_published ? "Unpublish" : "Publish"}
  </button>
</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}