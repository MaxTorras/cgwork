"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Group = {
  id: string;
  name: string;
};

type AttendanceRecord = {
  id: string;
  person_id: string;
  group_id: string | null;
  attendance_date: string;
  status: "present" | "absent" | "excused";
  person_name?: string;
};

export default function AttendanceHistoryPage() {
  const supabase = createClient();

  const [groups, setGroups] = useState<Group[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [groupId, setGroupId] = useState("all");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGroups() {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");

      if (error) setError(error.message);
      else setGroups(data || []);
    }

    loadGroups();
  }, []);

  useEffect(() => {
   async function loadHistory() {
  setLoading(true);
  setError("");

  let query = supabase
    .from("attendance")
    .select("id, person_id, group_id, attendance_date, status")
    .order("attendance_date", { ascending: false });

  if (groupId !== "all") {
    query = query.eq("group_id", groupId);
  }

  if (date) {
    query = query.eq("attendance_date", date);
  }

  const { data, error } = await query;

  if (error) {
    setError(error.message);
    setRecords([]);
    setLoading(false);
    return;
  }

  const personIds = [...new Set((data || []).map((record) => record.person_id))];

  const { data: peopleData, error: peopleError } = await supabase
    .from("people")
    .select("id, name")
    .in("id", personIds);

  if (peopleError) {
    setError(peopleError.message);
    setRecords([]);
    setLoading(false);
    return;
  }

  const enrichedRecords = (data || []).map((record) => ({
    ...record,
    person_name:
      peopleData?.find((person) => person.id === record.person_id)?.name ||
      "Unknown",
  }));

  setRecords(enrichedRecords);
  setLoading(false);
}

    loadHistory();
  }, [groupId, date]);

  const presentCount = records.filter(
    (record) => record.status === "present"
  ).length;

  const absentCount = records.filter(
    (record) => record.status === "absent"
  ).length;

  const excusedCount = records.filter(
    (record) => record.status === "excused"
  ).length;

  function exportCSV() {
    if (records.length === 0) return;

    const rows = [
      ["Date", "Person", "Group", "Status"],
      ...records.map((record) => [
        record.attendance_date,
        record.person_name || "Unknown",
        groups.find((group) => group.id === record.group_id)?.name || "Unknown",
        record.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "attendance-history.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link
            href="/admin/attendance"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Attendance tracker
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Attendance History
          </h1>

          <p className="mt-1 text-gray-600">
            Review previous attendance records.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Present</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {presentCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Absent</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {absentCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Excused</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {excusedCount}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Filter by group
              </label>

              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
              >
                <option value="all">All groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Filter by date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={exportCSV}
                disabled={records.length === 0}
                className="w-full rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
              >
                Export CSV
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance records
            </h2>
            <p className="text-sm text-gray-500">
              {records.length} records found
            </p>
          </div>

          {loading ? (
            <p className="p-8 text-center text-gray-500">
              Loading attendance history...
            </p>
          ) : records.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              No attendance records found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Person</th>
                    <th className="px-6 py-4 font-medium">Group</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        {new Date(
                          `${record.attendance_date}T00:00:00`
                        ).toLocaleDateString("en-GB")}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {record.person_name || "Unknown"}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {groups.find((group) => group.id === record.group_id)
                          ?.name || "Unknown"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            record.status === "present"
                              ? "bg-green-100 text-green-700"
                              : record.status === "absent"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}