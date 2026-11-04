"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Group = {
  id: string;
  name: string;
  created_at: string;
};

export default function GroupsPage() {
  const supabase = createClient();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadGroups = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("groups")
      .select("id, name, created_at")
      .order("name");

    if (error) {
      setError(error.message);
    } else {
      setGroups(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const addGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = groupName.trim();
    if (!name) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .insert({ name });

    if (error) {
      setError(
        error.code === "23505"
          ? "A group with this name already exists."
          : error.message
      );
    } else {
      setGroupName("");
      setMessage("Group added successfully.");
      await loadGroups();
    }

    setSaving(false);
  };

  const updateGroup = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .update({ name })
      .eq("id", id);

    if (error) {
      setError(
        error.code === "23505"
          ? "A group with this name already exists."
          : error.message
      );
    } else {
      setEditingId(null);
      setEditingName("");
      setMessage("Group updated successfully.");
      await loadGroups();
    }

    setSaving(false);
  };

  const deleteGroup = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this group? People assigned to it will become unassigned."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Group deleted successfully.");
      await loadGroups();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Attendance Groups
          </h1>
          <p className="mt-2 text-gray-600">
            Create and manage the groups used in your attendance tracker.
          </p>
        </div>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Add a new group
          </h2>

          <form onSubmit={addGroup} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Women's Team, U13, Men's Team"
              maxLength={100}
              required
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <button
              type="submit"
              disabled={saving || !groupName.trim()}
              className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add group"}
            </button>
          </form>
        </section>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            {message}
          </p>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Your groups
            </h2>
            <span className="text-sm text-gray-500">
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </span>
          </div>

          {loading ? (
            <p className="mt-5 text-gray-500">Loading groups...</p>
          ) : groups.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-medium text-gray-700">
                No groups created yet.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Add your first group using the form above.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  {editingId === group.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      maxLength={100}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Created {new Date(group.created_at).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {editingId === group.id ? (
                      <>
                        <button
                          onClick={() => updateGroup(group.id)}
                          disabled={saving || !editingName.trim()}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(group.id);
                            setEditingName(group.name);
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => deleteGroup(group.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}