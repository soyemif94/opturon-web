import Link from "next/link";
import { Archive, Clock3, Flag, History, Phone, Tag, UserRound } from "lucide-react";
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

type ProfilePanelProps = {
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
  historyHref?: string;
};

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
  onAddTask,
  historyHref
}: ProfilePanelProps) {
  if (loading) {
    return (
      <div className="h-full rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] p-4 text-center shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[color:var(--border)] bg-surface/70">
          <UserRound className="h-5 w-5 text-brandBright" />
        </div>
        <p className="mt-3 text-base font-semibold">Ficha del contacto</p>
        <p className="mt-1 text-xs leading-6 text-muted">Se completa al abrir una conversacion del inbox.</p>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <CardSection title="Contacto" subtitle="Perfil rapido para contexto y seguimiento">
        <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
          <p className="text-base font-semibold">{detail.contact?.name || "Sin nombre"}</p>
          <div className="mt-2 space-y-2 text-sm text-muted">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              {detail.contact?.phone || "Sin telefono"}
            </p>
            <p className="flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5" />
              {detail.contact?.email || "Sin email"}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(detail.contact?.tags || []).length > 0 ? (
              detail.contact?.tags.map((tag) => (
                <InboxBadge key={tag} className="capitalize">
                  <Tag className="h-3 w-3" />
                  {tag}
                </InboxBadge>
              ))
            ) : (
              <InboxBadge>sin etiquetas</InboxBadge>
            )}
          </div>
        </div>
      </CardSection>

      <CardSection title="Lead y estado" subtitle="Estado comercial de la conversacion">
        <div className="mb-3 flex flex-wrap gap-2">
          <InboxBadge>Prob. {detail.deal?.probability || 0}%</InboxBadge>
          <InboxBadge>${detail.deal?.value || 0}</InboxBadge>
          <InboxBadge className="capitalize">{detail.conversation.status}</InboxBadge>
        </div>
        <div className="flex gap-2">
          <select
            value={dealStage}
            onChange={(event) => onDealStageChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
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
            className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </CardSection>

      <CardSection title="Acciones rapidas" subtitle="Asignar, marcar seguimiento o archivar">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onAssign}
            disabled={readOnly}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            <UserRound className="h-3.5 w-3.5" />
            Asignar
          </button>
          <button
            type="button"
            onClick={onMarkHot}
            disabled={readOnly}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            <Flag className="h-3.5 w-3.5" />
            Marcar seguimiento
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={readOnly}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            <Archive className="h-3.5 w-3.5" />
            Archivar
          </button>
          {historyHref ? (
            <Link
              href={historyHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text"
            >
              <History className="h-3.5 w-3.5" />
              Ver historial
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted opacity-50"
            >
              <History className="h-3.5 w-3.5" />
              Ver historial
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={assignTo}
            onChange={(event) => onAssignToChange(event.target.value)}
            placeholder="Asignar a usuario"
            className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
            disabled={readOnly}
          />
          <button
            type="button"
            onClick={onToggleBot}
            disabled={readOnly}
            className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            Bot
          </button>
        </div>
      </CardSection>

      <CardSection title="Resumen del contacto" subtitle="Ultima interaccion, seguimiento y notas">
        <div className="space-y-3 text-sm text-muted">
          <div className="rounded-xl border border-[color:var(--border)] bg-bg/70 p-3">
            <p className="flex items-center gap-2 font-medium text-text">
              <Clock3 className="h-3.5 w-3.5 text-brandBright" />
              Ultima interaccion
            </p>
            <p className="mt-2 leading-6">{new Date(detail.conversation.lastMessageAt).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-bg/70 p-3 leading-6">
            Contacto asociado a una conversacion {detail.conversation.priority === "hot" ? "de alta prioridad" : "activa"} dentro del inbox del cliente.
          </div>
        </div>
      </CardSection>

      <CardSection title="Notas" subtitle="Contexto rapido para el equipo">
        <div className="flex gap-2">
          <input
            value={noteText}
            onChange={(event) => onNoteTextChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
            placeholder="Agregar nota"
            disabled={readOnly}
          />
          <button
            type="button"
            onClick={onAddNote}
            disabled={readOnly || !noteText.trim()}
            className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            Guardar
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

      <CardSection title="Seguimiento" subtitle="Tareas para continuar la gestion">
        <div className="flex gap-2">
          <input
            value={taskTitle}
            onChange={(event) => onTaskTitleChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
            placeholder="Crear tarea"
            disabled={readOnly}
          />
          <button
            type="button"
            onClick={onAddTask}
            disabled={readOnly || !taskTitle.trim()}
            className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
          >
            Crear
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
