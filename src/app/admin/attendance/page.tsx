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
};

type AttendanceStatus = "present" | "absent" | "excused";

export default function AttendancePage() {
  const supabase = createClient();

  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groupId, setGroupId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadGroups() {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");

      if (error) {
        setError(error.message);
      } else {
        setGroups(data || []);
      }
    }

    loadGroups();
  }, []);

  useEffect(() => {
    if (!groupId || !attendanceDate) {
      setPeople([]);
      setAttendance({});
      return;
    }

    async function loadPeopleAndAttendance() {
      setLoading(true);
      setError("");
      setMessage("");

      const { data: peopleData, error: peopleError } = await supabase
        .from("people")
        .select("id, name")
        .eq("group_id", groupId)
        .order("name");

      if (peopleError) {
        setError(peopleError.message);
        setLoading(false);
        return;
      }

      setPeople(peopleData || []);

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("person_id, status")
          .eq("group_id", groupId)
          .eq("attendance_date", attendanceDate);

      if (attendanceError) {
        setError(attendanceError.message);
        setLoading(false);
        return;
      }

      const savedAttendance: Record<string, AttendanceStatus> = {};

      (attendanceData || []).forEach((record) => {
        savedAttendance[record.person_id] =
          record.status as AttendanceStatus;
      });

      setAttendance(savedAttendance);
      setLoading(false);
    }

    loadPeopleAndAttendance();
  }, [groupId, attendanceDate]);

  function updateAttendance(
    personId: string,
    status: AttendanceStatus
  ) {
    setAttendance((previous) => ({
      ...previous,
      [personId]: status,
    }));
  }

  async function saveAttendance() {
    if (!groupId || !attendanceDate || people.length === 0) return;

    setSaving(true);
    setError("");
    setMessage("");

    const records = people
  .filter((person) => attendance[person.id])
  .map((person) => ({
    person_id: person.id,
    group_id: groupId,
    attendance_date: attendanceDate,
    status: attendance[person.id],
  }));
  if (records.length === 0) {
  setMessage("No attendance statuses have been selected yet.");
  setSaving(false);
  return;
}

    const { error } = await supabase
      .from("attendance")
      .upsert(records, {
        onConflict: "person_id,attendance_date",
      });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Attendance saved successfully.");
    }

    setSaving(false);
  }

  const presentCount = people.filter(
    (person) => (attendance[person.id] || "present") === "present"
  ).length;

  const absentCount = people.filter(
    (person) => attendance[person.id] === "absent"
  ).length;

  const excusedCount = people.filter(
    (person) => attendance[person.id] === "excused"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/admin/attendance/people"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Manage people
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Attendance Tracker
          </h1>

          <p className="mt-1 text-gray-600">
            Record and manage group attendance.
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Select session
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Group
              </label>

              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Date
              </label>

              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
              />
            </div>
          </div>
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

        {groupId && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Attendance
                </h2>
                <p className="text-sm text-gray-500">
                  {people.length} people in this group
                </p>
              </div>

              {people.length > 0 && (
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-green-700">
                    Present: {presentCount}
                  </span>
                  <span className="text-red-700">
                    Absent: {absentCount}
                  </span>
                  <span className="text-amber-700">
                    Excused: {excusedCount}
                  </span>
                </div>
              )}
            </div>

            {loading ? (
              <p className="py-6 text-center text-gray-500">
                Loading attendance...
              </p>
            ) : people.length === 0 ? (
              <p className="py-6 text-center text-gray-500">
                No people have been assigned to this group yet.
              </p>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {people.map((person) => {
                    const status = attendance[person.id];

                    return (
                      <div
                        key={person.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="font-medium text-gray-900">
                          {person.name}
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              updateAttendance(person.id, "present")
                            }
                            className={`rounded-lg px-3 py-2 text-sm font-medium ${
                              status === "present"
                                ? "bg-green-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-green-50"
                            }`}
                          >
                            Present
                          </button>

                          <button
                            onClick={() =>
                              updateAttendance(person.id, "absent")
                            }
                            className={`rounded-lg px-3 py-2 text-sm font-medium ${
                              status === "absent"
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-red-50"
                            }`}
                          >
                            Absent
                          </button>

                          <button
                            onClick={() =>
                              updateAttendance(person.id, "excused")
                            }
                            className={`rounded-lg px-3 py-2 text-sm font-medium ${
                              status === "excused"
                                ? "bg-amber-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-amber-50"
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={saveAttendance}
                    disabled={saving || loading}
                    className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save attendance"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}