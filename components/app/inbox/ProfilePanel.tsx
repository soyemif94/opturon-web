import Link from "next/link";
import { Archive, Clock3, Flag, History, Phone, RotateCcw, Settings2, Tag, UserRound } from "lucide-react";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { ProfileSkeleton } from "@/components/app/inbox/Skeleton";
import type { BotDomainOverride, BotFlowLock, DetailPayload, LeadStatus } from "@/components/app/inbox/types";
import { SimpleAvatar } from "@/components/app/simple-avatar";

const DEAL_STAGES = [
  ["lead", "Prospecto"],
  ["qualified", "Calificado"],
  ["proposal", "Propuesta"],
  ["won", "Ganado"],
  ["lost", "Perdido"]
] as const;

const LEAD_STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "NEW", label: "Nuevo" },
  { value: "IN_CONVERSATION", label: "En conversacion" },
  { value: "FOLLOW_UP", label: "Seguimiento" },
  { value: "CLOSED", label: "Cerrado" }
];

function taskStatusLabel(value?: string) {
  if (!value) return "Sin estado";
  if (value === "todo") return "Pendiente";
  if (value === "done") return "Hecha";
  return value;
}

function botDomainLabel(value?: BotDomainOverride) {
  if (value === "agenda") return "Agenda";
  if (value === "commerce") return "Ventas";
  return "Automatico";
}

function botFlowLockLabel(value?: BotFlowLock) {
  if (value === "agenda") return "Agenda";
  if (value === "commerce") return "Ventas";
  return "Automatico";
}

type ProfilePanelProps = {
  detail: DetailPayload | null;
  loading: boolean;
  readOnly: boolean;
  dealStage: string;
  onDealStageChange: (value: string) => void;
  onSaveDealStage: () => void;
  assignTo: string;
  onAssignToChange: (value: string) => void;
  sellerOptions: Array<{ id: string; name: string; role: string }>;
  assigningSeller?: boolean;
  onAssign: () => void;
  onTakeConversation: () => void;
  onMarkHot: () => void;
  onClose: () => void;
  onResetConversation: () => void;
  resetBusy?: boolean;
  noteText: string;
  onNoteTextChange: (value: string) => void;
  onAddNote: () => void;
  taskTitle: string;
  onTaskTitleChange: (value: string) => void;
  onAddTask: () => void;
  historyHref?: string;
  orderHref?: string;
  leadStatus: LeadStatus;
  leadStatusBusy?: boolean;
  onLeadStatusChange: (value: LeadStatus) => void;
  nextActionAt: string;
  nextActionNote: string;
  nextActionBusy?: boolean;
  onNextActionAtChange: (value: string) => void;
  onNextActionNoteChange: (value: string) => void;
  onSaveNextAction: () => void;
  onClearNextAction: () => void;
  onBotFlowLockChange: (value: BotFlowLock) => void;
  onBotDomainOverrideChange: (value: BotDomainOverride) => void;
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
  sellerOptions,
  assigningSeller,
  onAssign,
  onTakeConversation,
  onMarkHot,
  onClose,
  onResetConversation,
  resetBusy,
  noteText,
  onNoteTextChange,
  onAddNote,
  taskTitle,
  onTaskTitleChange,
  onAddTask,
  historyHref,
  orderHref,
  leadStatus,
  leadStatusBusy,
  onLeadStatusChange,
  nextActionAt,
  nextActionNote,
  nextActionBusy,
  onNextActionAtChange,
  onNextActionNoteChange,
  onSaveNextAction,
  onClearNextAction,
  onBotFlowLockChange,
  onBotDomainOverrideChange
}: ProfilePanelProps) {
  const commercialActionParams = detail
    ? {
        conversationId: detail.conversation.id,
        contactId: detail.contact?.id || "",
        contactName: detail.contact?.name || detail.conversation.contact?.name || "",
        phone: detail.contact?.phone || detail.conversation.contact?.phone || ""
      }
    : null;

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-5 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-surface/50">
          <UserRound className="h-5 w-5 text-brandBright" />
        </div>
        <p className="mt-3 text-base font-semibold">Panel del contacto</p>
        <p className="mt-1 text-xs leading-6 text-muted">Se completa al abrir una conversacion del inbox.</p>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <section className="border-b border-[color:var(--border)] px-4 py-4">
        <div className="flex items-start gap-3">
          <SimpleAvatar
            src={detail.contact?.profileImageUrl}
            name={detail.contact?.name}
            className="size-14 rounded-full border border-brand/20 bg-brand/10 text-sm text-brandBright"
            fallbackClassName="bg-brand/10 text-brandBright"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{detail.contact?.name || "Sin nombre"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-muted"><Phone className="size-3.5" />{detail.contact?.phone || "Sin telefono"}</p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-muted"><UserRound className="size-3.5" />{detail.contact?.email || "Sin email"}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(detail.contact?.tags || []).length ? detail.contact?.tags.map((tag) => (
            <InboxBadge key={tag} className="capitalize"><Tag className="size-3" />{tag}</InboxBadge>
          )) : <span className="text-[10px] text-muted">Sin etiquetas</span>}
          {detail.conversation.priority === "hot" ? <InboxBadge className="text-brandBright">Prioridad</InboxBadge> : null}
          {detail.conversation.transferPaymentStatus === "payment_pending_validation" ? <InboxBadge>Pago pendiente</InboxBadge> : null}
        </div>
      </section>

      <section className="border-b border-[color:var(--border)] px-4 py-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Contexto comercial</h3>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] text-muted">Propietario · {detail.conversation.assignedSellerName || detail.conversation.assignedTo || "Sin asignar"}</span>
            <div className="flex gap-1.5">
              <select value={assignTo} onChange={(event) => onAssignToChange(event.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs" disabled={readOnly}>
                <option value="">Seleccionar vendedor</option>
                {sellerOptions.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
              </select>
              <button type="button" onClick={onAssign} disabled={readOnly || !assignTo || assigningSeller} className="h-8 rounded-lg border border-[color:var(--border)] px-2 text-[10px] text-muted hover:text-text disabled:opacity-40">{assigningSeller ? "..." : "Guardar"}</button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-[10px] text-muted">Estado</span>
              <select value={leadStatus} onChange={(event) => onLeadStatusChange(event.target.value as LeadStatus)} className="h-8 w-full rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs" disabled={readOnly || leadStatusBusy}>
                {LEAD_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] text-muted">Etapa</span>
              <select value={dealStage} onChange={(event) => onDealStageChange(event.target.value)} className="h-8 w-full rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs" disabled={readOnly}>
                {DEAL_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <button type="button" onClick={onSaveDealStage} disabled={readOnly} className="text-[10px] font-medium text-brandBright hover:underline disabled:opacity-40">Guardar etapa</button>
        </div>
      </section>

      <section className="border-b border-[color:var(--border)] px-4 py-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Notas</h3>
        <div className="mt-2 flex gap-1.5">
          <input value={noteText} onChange={(event) => onNoteTextChange(event.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs" placeholder="Agregar nota..." disabled={readOnly} />
          <button type="button" onClick={onAddNote} disabled={readOnly || !noteText.trim()} className="h-8 rounded-lg border border-[color:var(--border)] px-2 text-[10px] text-muted hover:text-text disabled:opacity-40">Guardar</button>
        </div>
        <ul className="mt-2 divide-y divide-[color:var(--border)]">
          {detail.notes.slice(0, 3).map((note) => (
            <li key={note.id} className="py-2 text-[11px]"><p>{note.text}</p><p className="mt-0.5 text-[9px] text-muted">{new Date(note.createdAt).toLocaleString()}</p></li>
          ))}
          {!detail.notes.length ? <li className="py-2 text-[10px] text-muted">Todavía no hay notas.</li> : null}
        </ul>
      </section>

      <details className="group border-b border-[color:var(--border)] px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"><span className="inline-flex items-center gap-2"><Clock3 className="size-3.5" />Seguimiento</span><span className="text-[10px] normal-case tracking-normal">{nextActionAt ? "Programado" : "Sin fecha"}</span></summary>
        <div className="mt-3 space-y-2">
          <input type="datetime-local" value={nextActionAt} onChange={(event) => onNextActionAtChange(event.target.value)} className="h-8 w-full rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs" disabled={readOnly || nextActionBusy} />
          <input value={nextActionNote} onChange={(event) => onNextActionNoteChange(event.target.value)} className="h-8 w-full rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs" placeholder="Próxima acción" disabled={readOnly || nextActionBusy} />
          <div className="flex gap-2"><button type="button" onClick={onSaveNextAction} disabled={readOnly || nextActionBusy} className="h-7 rounded-lg bg-brand px-2.5 text-[10px] font-semibold text-white disabled:opacity-40">{nextActionBusy ? "Guardando..." : "Guardar"}</button><button type="button" onClick={onClearNextAction} disabled={readOnly || nextActionBusy} className="h-7 px-2 text-[10px] text-muted hover:text-text disabled:opacity-40">Limpiar</button></div>
        </div>
      </details>

      <details className="group border-b border-[color:var(--border)] px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"><span>Tareas</span><span className="text-[10px] normal-case tracking-normal">{detail.tasks.length}</span></summary>
        <div className="mt-3">
          <div className="flex gap-1.5"><input value={taskTitle} onChange={(event) => onTaskTitleChange(event.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs" placeholder="Agregar próximo paso" disabled={readOnly} /><button type="button" onClick={onAddTask} disabled={readOnly || !taskTitle.trim()} className="h-8 rounded-lg border border-[color:var(--border)] px-2 text-[10px] text-muted disabled:opacity-40">Crear</button></div>
          <ul className="mt-2 divide-y divide-[color:var(--border)]">{detail.tasks.slice(0, 5).map((task) => <li key={task.id} className="flex items-center justify-between py-2 text-[11px]"><span>{task.title}</span><span className="text-[9px] text-muted">{taskStatusLabel(task.status)}</span></li>)}</ul>
        </div>
      </details>

      <details className="group border-b border-[color:var(--border)] px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"><span className="inline-flex items-center gap-2"><Settings2 className="size-3.5" />Configuración del bot</span><span className="text-[10px] normal-case tracking-normal">{botFlowLockLabel(detail.conversation.botFlowLock)}</span></summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label><span className="mb-1 block text-[10px] text-muted">Flujo</span><select value={detail.conversation.botFlowLock || "automatic"} onChange={(event) => onBotFlowLockChange(event.target.value as BotFlowLock)} disabled={readOnly} className="h-8 w-full rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs"><option value="automatic">Automatico</option><option value="agenda">Agenda</option><option value="commerce">Ventas</option></select></label>
          <label><span className="mb-1 block text-[10px] text-muted">Modo</span><select value={detail.conversation.botDomainOverride || "automatic"} onChange={(event) => onBotDomainOverrideChange(event.target.value as BotDomainOverride)} disabled={readOnly} className="h-8 w-full rounded-lg border border-[color:var(--border)] bg-bg px-2 text-xs"><option value="automatic">Automatico</option><option value="agenda">Agenda</option><option value="commerce">Ventas</option></select></label>
        </div>
        <p className="mt-2 text-[9px] text-muted">Modo actual: {botDomainLabel(detail.conversation.botDomainOverride)}</p>
      </details>

      <section className="border-b border-[color:var(--border)] px-4 py-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Atajos</h3>
        <div className="mt-2 grid gap-1.5">
          {historyHref ? <Link href={historyHref} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[color:var(--border)] px-2.5 text-[11px] text-muted hover:text-text"><History className="size-3.5" />Ver historial</Link> : null}
          {orderHref ? <Link href={orderHref} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[color:var(--border)] px-2.5 text-[11px] text-muted hover:text-text"><History className="size-3.5" />Ver pedido</Link> : null}
          {commercialActionParams ? <Link href={{ pathname: "/app/agenda", query: { ...commercialActionParams, actionType: "demo" } }} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[color:var(--border)] px-2.5 text-[11px] text-muted hover:text-text"><Clock3 className="size-3.5" />Agendar demo</Link> : null}
          {commercialActionParams ? <Link href={{ pathname: "/app/agenda", query: { ...commercialActionParams, actionType: "visit" } }} className="inline-flex h-8 items-center gap-2 rounded-lg border border-[color:var(--border)] px-2.5 text-[11px] text-muted hover:text-text"><Clock3 className="size-3.5" />Agendar visita</Link> : null}
        </div>
      </section>

      <details className="group px-4 py-3">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Más acciones</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onTakeConversation} disabled={readOnly} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--border)] text-[10px] text-muted disabled:opacity-40"><UserRound className="size-3.5" />Tomar</button>
          <button type="button" onClick={onClose} disabled={readOnly} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--border)] text-[10px] text-muted disabled:opacity-40"><Archive className="size-3.5" />Archivar</button>
          <button type="button" onClick={onMarkHot} disabled={readOnly} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--border)] text-[10px] text-muted disabled:opacity-40"><Flag className="size-3.5" />Prioridad</button>
          <button type="button" onClick={onResetConversation} disabled={readOnly || resetBusy} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--border)] text-[10px] text-muted disabled:opacity-40"><RotateCcw className="size-3.5" />{resetBusy ? "..." : "Reiniciar"}</button>
        </div>
        <p className="mt-2 text-[9px] text-muted">Reiniciar conserva el historial y limpia sólo el contexto actual.</p>
      </details>
    </div>
  );
}
