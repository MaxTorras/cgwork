"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

    type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  description: string;
  category: string;
};

type CalendarGroup = {
  id: string;
  name: string;
  color: string;
};

export default function CalendarPage() {

const supabase = createClient();
const [currentDate, setCurrentDate] = useState<Date | null>(null);
const [events, setEvents] = useState<CalendarEvent[]>([]);
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [editingEvent, setEditingEvent] = useState<CalendarEvent |    null>(null);
const [showEventForm, setShowEventForm] = useState(false);

const [groups, setGroups] = useState<CalendarGroup[]>([]);
const [showGroupForm, setShowGroupForm] = useState(false);
const [editingGroup, setEditingGroup] = useState<CalendarGroup | null>(null);

useEffect(() => {
  setCurrentDate(new Date());
}, []);

useEffect(() => {
  async function loadEvents() {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error loading calendar events:", error);
      return;
    }

    setEvents(
      (data ?? []).map((event) => ({
        id: event.id,
        title: event.title,
        date: event.event_date,
        startTime: event.start_time?.slice(0, 5) ?? "",
        endTime: event.end_time?.slice(0, 5) ?? "",
        allDay: event.all_day,
        description: event.description,
        category: event.category,
      }))
    );
  }

  loadEvents();
}, []);

useEffect(() => {
  async function loadGroups() {
    const { data, error } = await supabase
      .from("calendar_groups")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading calendar groups:", error);
      return;
    }

    setGroups(
      (data ?? []).map((group) => ({
        id: group.id,
        name: group.name,
        color: group.color,
      }))
    );
  }

  loadGroups();
}, []);

if (!currentDate) {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-gray-500">Loading calendar...</p>
      </div>
    </main>
  );
}

const year = currentDate.getFullYear();
const month = currentDate.getMonth();

const firstDay = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();

// Start the calendar on Monday
const startingDay = (firstDay + 6) % 7;

const days = Array.from(
  { length: startingDay + daysInMonth },
  (_, index) => {
    if (index < startingDay) return null;
    return index - startingDay + 1;
  }
);

const monthName = currentDate.toLocaleDateString("en-GB", {
  month: "long",
  year: "numeric",
});

function changeMonth(amount: number) {
setCurrentDate(new Date(year, month + amount, 1));
}

function goToToday() {
setCurrentDate(new Date());
}

async function handleSaveEvent(eventData: Omit<CalendarEvent, "id">) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    alert("Please sign in before saving an event.");
    return;
  }

  const databaseEvent = {
    title: eventData.title,
    event_date: eventData.date,
    start_time: eventData.allDay ? null : eventData.startTime || null,
    end_time: eventData.allDay ? null : eventData.endTime || null,
    all_day: eventData.allDay,
    description: eventData.description,
    category: eventData.category,
    created_by: user.id,
  };

  if (editingEvent) {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        ...databaseEvent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingEvent.id);

    if (error) {
      console.error("Error updating event:", error);
      alert("Could not update the event. Please try again.");
      return;
    }

    setEvents((previousEvents) =>
      previousEvents.map((event) =>
        event.id === editingEvent.id
          ? { ...eventData, id: editingEvent.id }
          : event
      )
    );
  } else {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(databaseEvent)
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      alert("Could not save the event. Please try again.");
      return;
    }

    setEvents((previousEvents) => [
      ...previousEvents,
      {
        id: data.id,
        title: data.title,
        date: data.event_date,
        startTime: data.start_time?.slice(0, 5) ?? "",
        endTime: data.end_time?.slice(0, 5) ?? "",
        allDay: data.all_day,
        description: data.description,
        category: data.category,
      },
    ]);
  }

  setShowEventForm(false);
  setEditingEvent(null);
}
async function handleDeleteEvent(eventId: string) {
const confirmed = window.confirm(
"Are you sure you want to delete this event?"
);

if (!confirmed) return;

const { error } = await supabase
.from("calendar_events")
.delete()
.eq("id", eventId);

if (error) {
console.error("Error deleting event:", error);
alert("Could not delete the event. Please try again.");
return;
}

setEvents((previousEvents) =>
previousEvents.filter((event) => event.id !== eventId)
);

setShowEventForm(false);
setEditingEvent(null);
}

const today = new Date();

return (
<main className="min-h-screen bg-gray-50 px-6 py-10 sm:px-10">
<div className="mx-auto max-w-5xl">
<Link
       href="/admin"
       className="text-sm text-indigo-600 hover:underline"
     >
← Back to Admin
</Link>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Calendar
        </h1>

        <p className="mt-2 text-gray-600">
          Organise your meetings, events and deadlines.
        </p>
      </div>

      <div className="flex gap-2">
  <button
    type="button"
    onClick={() => {
      setSelectedDate(
        `${year}-${String(month + 1).padStart(2, "0")}-${String(
          currentDate.getDate()
        ).padStart(2, "0")}`
      );
      setEditingEvent(null);
      setShowEventForm(true);
    }}
    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
  >
    + New event
  </button>

  <button
    type="button"
    onClick={goToToday}
    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
  >
    Today
  </button>
</div>
    </div>
<section className="mt-8 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        Event groups
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Organise your events by category and colour.
      </p>
    </div>

    <button
      type="button"
      onClick={() => {
        setEditingGroup(null);
        setShowGroupForm(true);
      }}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
    >
      + New group
    </button>
  </div>

  <div className="mt-5 flex flex-wrap gap-3">
    {groups.length === 0 ? (
      <p className="text-sm text-gray-500">
        No groups yet. Create your first group to get started.
      </p>
    ) : (
      groups.map((group) => (
        <button
          key={group.id}
          type="button"
          onClick={() => {
            setEditingGroup(group);
            setShowGroupForm(true);
          }}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          {group.name}
          <span className="ml-1 text-gray-400">Edit</span>
        </button>
      ))
    )}
  </div>
</section>

    <section className="mt-8 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          ←
        </button>

        <h2 className="text-xl font-semibold text-gray-900">
          {monthName}
        </h2>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 pb-3">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
          (day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-500 sm:text-sm"
            >
              {day}
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const isToday =
            day !== null &&
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div
              key={index}
              className="min-h-20 border-b border-r border-gray-100 p-1 sm:min-h-28 sm:p-3"
            >
              {day !== null && (
  <>
    <button
      type="button"
      onClick={() => {
        const dateString = `${year}-${String(month + 1).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;

        setSelectedDate(dateString);
        setEditingEvent(null);
        setShowEventForm(true);
      }}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
        isToday
          ? "bg-indigo-600 font-semibold text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
      aria-label={`Create event on ${day} ${monthName}`}
    >
      {day}
    </button>

    <div className="mt-1 space-y-1">
      {events
        .filter(
          (event) =>
            event.date ===
            `${year}-${String(month + 1).padStart(2, "0")}-${String(
              day
            ).padStart(2, "0")}`
        )
        .map((event) => (
  <button
    key={event.id}
    type="button"
    onClick={() => {
      setEditingEvent(event);
      setSelectedDate(event.date);
      setShowEventForm(true);
    }}
    className="block w-full truncate rounded bg-indigo-100 px-1 py-1 text-left text-xs text-indigo-800 hover:bg-indigo-200"
    title={`${event.title} — Click to edit`}
  >
    {event.allDay ? "" : `${event.startTime} `}
    {event.title}
  </button>
))}
    </div>
  </>
)}
            </div>
          );
        })}
      </div>
    </section>

    <p className="mt-4 text-sm text-gray-500">
      Your calendar is ready. Event creation and saving will be added next.
    </p>
    </div>

  {showEventForm && (
    <EventForm
      selectedDate={selectedDate}
      editingEvent={editingEvent}
      onSave={handleSaveEvent}
      onDelete={handleDeleteEvent}
      onCancel={() => {
        setShowEventForm(false);
        setEditingEvent(null);
      }}
    />
  )}
</main>
);
}

type EventFormProps = {
  selectedDate: string | null;
  editingEvent: CalendarEvent | null;
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  onDelete: (eventId: string) => void;
  onCancel: () => void;
};

function EventForm({
  selectedDate,
  editingEvent,
  onSave,
  onDelete,
  onCancel,
}: EventFormProps) {
  const [title, setTitle] = useState(editingEvent?.title ?? "");
  const [date, setDate] = useState(
    editingEvent?.date ??
      selectedDate ??
      new Date().toLocaleDateString("en-CA")
  );
  const [startTime, setStartTime] = useState(
    editingEvent?.startTime ?? "09:00"
  );
  const [endTime, setEndTime] = useState(
    editingEvent?.endTime ?? "10:00"
  );
  const [allDay, setAllDay] = useState(editingEvent?.allDay ?? false);
  const [description, setDescription] = useState(
    editingEvent?.description ?? ""
  );
  const [category, setCategory] = useState(
    editingEvent?.category ?? "Meeting"
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !date) return;

    onSave({
      title: title.trim(),
      date,
      startTime: allDay ? "" : startTime,
      endTime: allDay ? "" : endTime,
      allDay,
      description: description.trim(),
      category,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          {editingEvent ? "Edit event" : "Create event"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Event title *
            </label>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              placeholder="e.g. Team meeting"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Date *
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              className="h-4 w-4"
            />
            All-day event
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  End time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            >
              <option>Meeting</option>
              <option>Deadline</option>
              <option>Training</option>
              <option>Personal</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              placeholder="Additional details..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {editingEvent && (
  <button
    type="button"
    onClick={() => onDelete(editingEvent.id)}
    className="mr-auto rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
  >
    Delete
  </button>
)}

          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {editingEvent ? "Save changes" : "Create event"}
          </button>
        </div>
      </form>
    </div>
  );
}
