import { CardSection } from "@/components/app/inbox/CardSection";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { ProfileSkeleton } from "@/components/app/inbox/Skeleton";
import type { DetailPayload } from "@/components/app/inbox/types";

const DEAL_STAGES = [
  ["lead", "Lead"],
  ["qualified", "Qualified"],
  ["proposal", "Proposal"],
  ["won", "Won"],
  ["lost", "Lost"]
] as const;

export function ProfilePanel({
  detail,
  loading,
  readOnly,
  dealStage,
  onDealStageChange,
  onSaveDealStage,
  assignTo,
  onAssignToChange,
  onAssign,
  onToggleBot,
  onMarkHot,
  onClose,
  noteText,
  onNoteTextChange,
  onAddNote,
  taskTitle,
  onTaskTitleChange,
  onAddTask
}: {
  detail: DetailPayload | null;
  loading: boolean;
  readOnly: boolean;
  dealStage: string;
  onDealStageChange: (value: string) => void;
  onSaveDealStage: () => void;
  assignTo: string;
  onAssignToChange: (value: string) => void;
  onAssign: () => void;
  onToggleBot: () => void;
  onMarkHot: () => void;
  onClose: () => void;
  noteText: string;
  onNoteTextChange: (value: string) => void;
  onAddNote: () => void;
  taskTitle: string;
  onTaskTitleChange: (value: string) => void;
  onAddTask: () => void;
}) {
  if (loading) {
    return (
      <div className="h-full rounded-2xl border border-[color:var(--border)] bg-card p-4 shadow-sm">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-[color:var(--border)] bg-card p-4 text-center shadow-sm">
        <p className="text-2xl">??</p>
        <p className="mt-2 text-base font-semibold">Panel del contacto</p>
        <p className="text-xs text-muted">Se completa al abrir una conversación.</p>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <CardSection title="Perfil contacto" subtitle="Contexto comercial y de atención">
        <p className="text-sm font-semibold">{detail.contact?.name || "Sin nombre"}</p>
        <p className="text-xs text-muted">{detail.contact?.phone || "Sin teléfono"}</p>
        <p className="text-xs text-muted">{detail.contact?.email || "Sin email"}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(detail.contact?.tags || []).map((tag) => (
            <InboxBadge key={tag}>??? {tag}</InboxBadge>
          ))}
        </div>
      </CardSection>

      <CardSection title="Deal / pipeline" subtitle="Lead score y etapa de venta">
        <div className="mb-3 flex gap-2">
          <InboxBadge>?? Prob. {detail.deal?.probability || 0}%</InboxBadge>
          <InboxBadge>?? ${detail.deal?.value || 0}</InboxBadge>
        </div>
        <div className="flex gap-2">
          <select
            value={dealStage}
            onChange={(event) => onDealStageChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-1.5 text-sm"
            disabled={readOnly}
          >
            {DEAL_STAGES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onSaveDealStage}
            disabled={readOnly}
            className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </CardSection>

      <CardSection title="Acciones" subtitle="Asignación y control del bot">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={assignTo}
              onChange={(event) => onAssignToChange(event.target.value)}
              placeholder="ID usuario"
              className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-1.5 text-sm"
              disabled={readOnly}
            />
            <button
              type="button"
              onClick={onAssign}
              disabled={readOnly}
              className="rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
            >
              Asignar
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleBot}
              disabled={readOnly}
              className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
            >
              ?? Bot {detail.conversation.botEnabled ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              onClick={onMarkHot}
              disabled={readOnly}
              className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
            >
              ?? Marcar hot
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={readOnly}
              className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
            >
              ? Cerrar
            </button>
          </div>
        </div>
      </CardSection>

      <CardSection title="Notas" subtitle="Actualización instantánea">
        <div className="flex gap-2">
          <input
            value={noteText}
            onChange={(event) => onNoteTextChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-1.5 text-sm"
            placeholder="Agregar nota"
            disabled={readOnly}
          />
          <button
            type="button"
            onClick={onAddNote}
            disabled={readOnly || !noteText.trim()}
            className="rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            + Nota
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {detail.notes.slice(0, 6).map((note) => (
            <li key={note.id} className="rounded-xl border border-[color:var(--border)] bg-bg px-3 py-2 text-xs">
              <p>{note.text}</p>
              <p className="mt-1 text-muted">{new Date(note.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </CardSection>

      <CardSection title="Tareas" subtitle="Seguimiento comercial">
        <div className="flex gap-2">
          <input
            value={taskTitle}
            onChange={(event) => onTaskTitleChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-1.5 text-sm"
            placeholder="Crear tarea"
            disabled={readOnly}
          />
          <button
            type="button"
            onClick={onAddTask}
            disabled={readOnly || !taskTitle.trim()}
            className="rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            + Tarea
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {detail.tasks.slice(0, 6).map((task) => (
            <li key={task.id} className="rounded-xl border border-[color:var(--border)] bg-bg px-3 py-2 text-xs">
              <p className="font-medium">{task.title}</p>
              <p className="mt-1 text-muted">{task.status}</p>
            </li>
          ))}
        </ul>
      </CardSection>
    </div>
  );
}
