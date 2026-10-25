"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

  type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  description: string;
  groupId: string | null;
  color: string | null;
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
        endDate: event.end_date ?? event.event_date,
        startTime: event.start_time?.slice(0, 5) ?? "",
        endTime: event.end_time?.slice(0, 5) ?? "",
        allDay: event.all_day,
        description: event.description,
        groupId: event.group_id ?? null,
  color: event.color ?? null,
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

// Start the calendar on Monday
const startingDay = (firstDay + 6) % 7;

// Include dates from the previous and following months
const totalDays = Math.ceil(
  (startingDay + new Date(year, month + 1, 0).getDate()) / 7
) * 7;

const calendarDates = Array.from({ length: totalDays }, (_, index) => {
  const date = new Date(year, month, index - startingDay + 1);

  return {
    date,
    day: date.getDate(),
    dateString: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-"),
    isCurrentMonth: date.getMonth() === month,
  };
});

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
  end_date: eventData.endDate,
  start_time: eventData.allDay ? null : eventData.startTime || null,
  end_time: eventData.allDay ? null : eventData.endTime || null,
  all_day: eventData.allDay,
  description: eventData.description,
  group_id: eventData.groupId,
  color: eventData.color,
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
    endDate: data.end_date ?? data.event_date,
    startTime: data.start_time?.slice(0, 5) ?? "",
    endTime: data.end_time?.slice(0, 5) ?? "",
    allDay: data.all_day,
    description: data.description,
    groupId: data.group_id ?? null,
    color: data.color ?? null,
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

async function handleSaveGroup(name: string, color: string) {
const cleanName = name.trim();

if (!cleanName) {
alert("Please enter a group name.");
return;
}

if (editingGroup) {
const { data, error } = await supabase
.from("calendar_groups")
.update({
name: cleanName,
color,
updated_at: new Date().toISOString(),
})
.eq("id", editingGroup.id)
.select()
.single();

if (error) {
  console.error("Error updating group:", error);
  alert("Could not update the group. Check that its name is not already in use.");
  return;
}

setGroups((previousGroups) =>
  previousGroups
    .map((group) =>
      group.id === editingGroup.id
        ? { id: data.id, name: data.name, color: data.color }
        : group
    )
    .sort((a, b) => a.name.localeCompare(b.name))
);

} else {
const { data, error } = await supabase
.from("calendar_groups")
.insert({
name: cleanName,
color,
})
.select()
.single();

if (error) {
  console.error("Error creating group:", error);
  alert("Could not create the group. Check that its name is not already in use.");
  return;
}

setGroups((previousGroups) =>
  [...previousGroups, {
    id: data.id,
    name: data.name,
    color: data.color,
  }].sort((a, b) => a.name.localeCompare(b.name))
);

}

setShowGroupForm(false);
setEditingGroup(null);
}

async function handleDeleteGroup(groupId: string) {
const confirmed = window.confirm(
"Delete this group? Existing events will be kept, but they will no longer belong to this group."
);

if (!confirmed) return;

const { error } = await supabase
.from("calendar_groups")
.delete()
.eq("id", groupId);

if (error) {
console.error("Error deleting group:", error);
alert("Could not delete the group. Please try again.");
return;
}

setGroups((previousGroups) =>
previousGroups.filter((group) => group.id !== groupId)
);

setShowGroupForm(false);
setEditingGroup(null);
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

<div className="grid grid-cols-7">
  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (dayName) => (
      <div
        key={dayName}
        className="border-b border-r border-gray-100 p-2 text-center text-xs font-semibold text-gray-500"
      >
        {dayName}
      </div>
    )
  )}

  {Array.from(
    { length: calendarDates.length / 7 },
    (_, weekIndex) => {
      const weekDates = calendarDates.slice(
        weekIndex * 7,
        weekIndex * 7 + 7
      );

      const weekStart = weekDates[0].dateString;
      const weekEnd = weekDates[6].dateString;

      const weekEvents = events
        .filter(
          (event) =>
            event.date <= weekEnd && event.endDate >= weekStart
        )
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            b.endDate.localeCompare(a.endDate) ||
            a.title.localeCompare(b.title)
        );

      const eventRows: CalendarEvent[][] = [];

      const placedEvents = weekEvents.map((event) => {
        const visibleStart =
          event.date < weekStart ? weekStart : event.date;

        const visibleEnd =
          event.endDate > weekEnd ? weekEnd : event.endDate;

        const startColumn = weekDates.findIndex(
          (item) => item.dateString === visibleStart
        );

        const endColumn = weekDates.findIndex(
          (item) => item.dateString === visibleEnd
        );

        let row = 0;

        while (
          eventRows[row]?.some((existingEvent) => {
            const existingStart =
              existingEvent.date < weekStart
                ? weekStart
                : existingEvent.date;

            const existingEnd =
              existingEvent.endDate > weekEnd
                ? weekEnd
                : existingEvent.endDate;

            return (
              existingStart <= visibleEnd &&
              existingEnd >= visibleStart
            );
          })
        ) {
          row++;
        }

        if (!eventRows[row]) {
          eventRows[row] = [];
        }

        eventRows[row].push(event);

        return {
          event,
          row,
          startColumn,
          span: endColumn - startColumn + 1,
          continuesBefore: event.date < weekStart,
          continuesAfter: event.endDate > weekEnd,
        };
      });

      const rowCount = Math.max(eventRows.length, 1);

      return (
        <div key={weekStart} className="col-span-7">
          <div className="grid grid-cols-7">
            {weekDates.map((item) => {
              const isToday =
                item.dateString ===
                `${today.getFullYear()}-${String(
                  today.getMonth() + 1
                ).padStart(2, "0")}-${String(
                  today.getDate()
                ).padStart(2, "0")}`;

              return (
                <div
                  key={item.dateString}
                  className={`min-h-10 border-b border-r border-gray-100 p-1 sm:p-2 ${
                    item.isCurrentMonth
                      ? "bg-white"
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.dateString);
                      setEditingEvent(null);
                      setShowEventForm(true);
                    }}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      isToday
                        ? "bg-indigo-600 font-semibold text-white"
                        : item.isCurrentMonth
                          ? "text-gray-700 hover:bg-gray-100"
                          : "text-gray-400 hover:bg-gray-200"
                    }`}
                    aria-label={`Create event on ${item.dateString}`}
                  >
                    {item.day}
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className="grid grid-cols-7 gap-y-1 border-b border-gray-100 pb-2"
            style={{
              gridTemplateRows: `repeat(${rowCount}, 24px)`,
            }}
          >
            {placedEvents.map(
              ({
                event,
                row,
                startColumn,
                span,
                continuesBefore,
                continuesAfter,
              }) => {
                const groupColor = groups.find(
                  (group) => group.id === event.groupId
                )?.color;

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setEditingEvent(event);
                      setSelectedDate(event.date);
                      setShowEventForm(true);
                    }}
                    className="z-10 h-6 min-w-0 truncate px-1 text-left text-xs text-white hover:opacity-80"
                    style={{
                      gridColumn: `${startColumn + 1} / span ${span}`,
                      gridRow: row + 1,
                      backgroundColor:
                        event.color ?? groupColor ?? "#6366f1",
                      borderTopLeftRadius: continuesBefore ? 0 : 4,
                      borderBottomLeftRadius: continuesBefore ? 0 : 4,
                      borderTopRightRadius: continuesAfter ? 0 : 4,
                      borderBottomRightRadius: continuesAfter ? 0 : 4,
                    }}
                    title={`${event.title} (${event.date} to ${event.endDate}) — Click to edit`}
                  >
                    {!continuesBefore &&
                      !event.allDay &&
                      event.startTime &&
                      `${event.startTime} `}
                    {event.title}
                  </button>
                );
              }
            )}
          </div>
        </div>
      );
    }
  )}
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
      groups={groups}
      onSave={handleSaveEvent}
      onDelete={handleDeleteEvent}
      onCancel={() => {
        setShowEventForm(false);
        setEditingEvent(null);
      }}
    />
  )}
  {showGroupForm && (
  <GroupForm
    editingGroup={editingGroup}
    onSave={handleSaveGroup}
    onDelete={handleDeleteGroup}
    onCancel={() => {
      setShowGroupForm(false);
      setEditingGroup(null);
    }}
  />
)}

</main>
);
}

type EventFormProps = {
  selectedDate: string | null;
  editingEvent: CalendarEvent | null;
  groups: CalendarGroup[];
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  onDelete: (eventId: string) => void;
  onCancel: () => void;
};

function EventForm({
  selectedDate,
  editingEvent,
  groups,
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
  const [endDate, setEndDate] = useState(
  editingEvent?.endDate ??
    editingEvent?.date ??
    selectedDate ??
    new Date().toLocaleDateString("en-CA")
);
  const [startTime, setStartTime] = useState(
    editingEvent?.startTime ?? "09:00"
  );
  const [groupId, setGroupId] = useState(
  editingEvent?.groupId ?? ""
);
const [color, setColor] = useState(
  editingEvent?.color ?? ""
);

  const [endTime, setEndTime] = useState(
    editingEvent?.endTime ?? "10:00"
  );
  const [allDay, setAllDay] = useState(editingEvent?.allDay ?? false);
  const [description, setDescription] = useState(
    editingEvent?.description ?? ""
  );


  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !date || !endDate) return;

if (endDate < date) {
  alert("The end date cannot be before the start date.");
  return;
}

    onSave({
      title: title.trim(),
      date,
      endDate,
      startTime: allDay ? "" : startTime,
      endTime: allDay ? "" : endTime,
      allDay,
      description: description.trim(),
      groupId: groupId || null,
color: color || null,
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
<div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    End date *
  </label>
  <input
    required
    type="date"
    min={date}
    value={endDate}
    onChange={(event) => setEndDate(event.target.value)}
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
    Group
  </label>
  <select
    value={groupId}
    onChange={(event) => {
      setGroupId(event.target.value);
      setColor("");
    }}
    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
  >
    <option value="">No group</option>
    {groups.map((group) => (
      <option key={group.id} value={group.id}>
        {group.name}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Event colour
  </label>

  <div className="flex items-center gap-3">
    <input
      type="color"
      value={
        color ||
        groups.find((group) => group.id === groupId)?.color ||
        "#6366f1"
      }
      onChange={(event) => setColor(event.target.value)}
      className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
      aria-label="Choose event colour"
    />

    <span className="text-sm text-gray-500">
      {color ? "Custom colour" : "Using group colour"}
    </span>
  </div>

  {color && (
    <button
      type="button"
      onClick={() => setColor("")}
      className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
    >
      Use group colour
    </button>
  )}
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
type GroupFormProps = {
editingGroup: CalendarGroup | null;
onSave: (name: string, color: string) => void;
onDelete: (groupId: string) => void;
onCancel: () => void;
};

function GroupForm({
editingGroup,
onSave,
onDelete,
onCancel,
}: GroupFormProps) {
const [name, setName] = useState(editingGroup?.name ?? "");
const [color, setColor] = useState(editingGroup?.color ?? "#6366f1");

function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
onSave(name, color);
}

return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
<form
     onSubmit={handleSubmit}
     className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
   >
<h2 className="mb-6 text-xl font-semibold text-gray-900">
{editingGroup ? "Edit group" : "Create group"}
</h2>

    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Group name *
        </label>
        <input
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          placeholder="e.g. Futsal"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Group colour
        </label>

        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-11 w-14 cursor-pointer rounded border border-gray-300 p-1"
          />

          <span className="text-sm text-gray-600">{color}</span>

          <span
            className="h-6 w-6 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    </div>

    <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
      {editingGroup && (
        <button
          type="button"
          onClick={() => onDelete(editingGroup.id)}
          className="mr-auto rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        {editingGroup ? "Save changes" : "Create group"}
      </button>
    </div>
  </form>
</div>

);
}
