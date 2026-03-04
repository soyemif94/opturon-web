"use client";

import { useState } from "react";

type Props = {
  tenantId: string;
  notes: Array<{ id: string; text: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: string; dueDate?: string }>;
  activity: Array<{ id: string; action: string; entity: string; createdAt: string }>;
};

export function TenantWorkbench({ tenantId, notes: initialNotes, tasks: initialTasks, activity }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  async function addNote() {
    const response = await fetch("/api/ops/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, text: noteText })
    });
    if (!response.ok) return;
    const json = await response.json();
    setNotes((prev) => [json.note, ...prev]);
    setNoteText("");
  }

  async function addTask() {
    const response = await fetch("/api/ops/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, title: taskTitle })
    });
    if (!response.ok) return;
    const json = await response.json();
    setTasks((prev) => [json.task, ...prev]);
    setTaskTitle("");
  }

  async function updateTaskStatus(id: string, status: "todo" | "in_progress" | "done") {
    const response = await fetch("/api/ops/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    if (!response.ok) return;
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status } : task)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Notes</h3>
        <div className="mt-3 space-y-2">
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" rows={3} />
          <button onClick={addNote} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Agregar nota</button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-[color:var(--border)] p-2">
              <p>{note.text}</p>
              <p className="text-xs text-muted">{new Date(note.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Tasks</h3>
        <div className="mt-3 space-y-2">
          <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Nueva tarea" />
          <button onClick={addTask} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Crear tarea</button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-lg border border-[color:var(--border)] p-2">
              <p className="font-medium">{task.title}</p>
              <div className="mt-2 flex gap-2 text-xs">
                {(["todo", "in_progress", "done"] as const).map((state) => (
                  <button key={state} onClick={() => updateTaskStatus(task.id, state)} className={`rounded px-2 py-1 ${task.status === state ? "bg-brand text-white" : "border border-[color:var(--border)]"}`}>
                    {state}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Activity</h3>
        <ul className="mt-4 space-y-2 text-sm">
          {activity.map((event) => (
            <li key={event.id} className="rounded-lg border border-[color:var(--border)] p-2">
              <p className="font-medium">{event.action}</p>
              <p className="text-xs text-muted">{event.entity}</p>
              <p className="text-xs text-muted">{new Date(event.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

