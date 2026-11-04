"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Group = {
  id: string;
  name: string;
};

type Person = {
  id: string;
  name: string;
  group_id: string | null;
  created_at: string;
};

export default function PeoplePage() {
  const supabase = createClient();

  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [peopleResult, groupsResult] = await Promise.all([
      supabase
  .from("people")
  .select("id, name, group_id, created_at")
  .order("name"),
      supabase.from("groups").select("id, name").order("name"),
    ]);

    if (peopleResult.error || groupsResult.error) {
      setError(
        peopleResult.error?.message ||
          groupsResult.error?.message ||
          "Could not load data."
      );
    } else {
      setPeople((peopleResult.data || []) as Person[]);
      setGroups(groupsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase.from("people").insert({
      name: name.trim(),
      group_id: groupId || null,
    });

    if (error) {
      setError(error.message);
    } else {
      setName("");
      setGroupId("");
      setMessage("Person added successfully.");
      await loadData();
    }

    setSaving(false);
  }

  function startEditing(person: Person) {
    setEditingId(person.id);
    setEditingName(person.name);
    setEditingGroupId(person.group_id || "");
    setError("");
    setMessage("");
  }

  async function updatePerson(id: string) {
    if (!editingName.trim()) {
      setError("Please enter a name.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("people")
      .update({
        name: editingName.trim(),
        group_id: editingGroupId || null,
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setEditingId(null);
      setMessage("Person updated successfully.");
      await loadData();
    }

    setSaving(false);
  }

  async function deletePerson(person: Person) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${person.name}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", person.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Person deleted.");
      await loadData();
    }
  }

  const filteredPeople =
    filterGroup === "all"
      ? people
      : people.filter((person) => person.group_id === filterGroup);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/admin/attendance/groups"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Manage groups
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            People
          </h1>
          <p className="mt-1 text-gray-600">
            Add people and assign them to your groups.
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Add a person
          </h2>

          <form onSubmit={addPerson} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Person's name"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 outline-none focus:border-indigo-500"
              required
            />

            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            >
              <option value="">No group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add person"}
            </button>
          </form>
        </section>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                All people
              </h2>
              <p className="text-sm text-gray-500">
                {filteredPeople.length}{" "}
                {filteredPeople.length === 1 ? "person" : "people"}
              </p>
            </div>

            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              <option value="all">All groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="py-6 text-center text-gray-500">Loading people...</p>
          ) : filteredPeople.length === 0 ? (
            <p className="py-6 text-center text-gray-500">
              No people found. Add your first person above.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  {editingId === person.id ? (
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                      />

                      <select
                        value={editingGroupId}
                        onChange={(e) => setEditingGroupId(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                      >
                        <option value="">No group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900">
                        {person.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {groups.find((group) => group.id === person.group_id)?.name ||
  "No group assigned"}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {editingId === person.id ? (
                      <>
                        <button
                          onClick={() => updatePerson(person.id)}
                          disabled={saving}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
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
                          onClick={() => startEditing(person)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePerson(person)}
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