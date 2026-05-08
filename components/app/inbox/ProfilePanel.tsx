import Link from "next/link";
import { Archive, Clock3, Flag, History, PauseCircle, Phone, RotateCcw, Settings2, Tag, UserRound } from "lucide-react";
import { CardSection } from "@/components/app/inbox/CardSection";
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

const DEAL_STAGE_LABELS = new Map<string, string>(DEAL_STAGES);
const LEAD_STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "NEW", label: "Nuevo" },
  { value: "IN_CONVERSATION", label: "En conversacion" },
  { value: "FOLLOW_UP", label: "Seguimiento" },
  { value: "CLOSED", label: "Cerrado" }
];

function conversationStatusLabel(value?: string) {
  if (!value) return "Sin estado";
  if (value === "new") return "Nueva";
  if (value === "closed") return "Cerrada";
  return value;
}

function taskStatusLabel(value?: string) {
  if (!value) return "Sin estado";
  if (value === "todo") return "Pendiente";
  if (value === "done") return "Hecha";
  return value;
}

function stageTone(stage?: string) {
  if (stage === "won") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (stage === "proposal" || stage === "qualified") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (stage === "lost") return "border-white/10 bg-white/5 text-muted";
  return "border-white/10 bg-white/5 text-muted";
}

function stageLabel(value?: string) {
  if (!value) return "Sin etapa";
  return DEAL_STAGE_LABELS.get(value) || value;
}

function leadStatusTone(value?: LeadStatus) {
  if (value === "IN_CONVERSATION") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (value === "FOLLOW_UP") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (value === "CLOSED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-white/10 bg-white/5 text-muted";
}

function leadStatusLabel(value?: LeadStatus) {
  return LEAD_STATUS_OPTIONS.find((item) => item.value === value)?.label || "Nuevo";
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
  onToggleBot: () => void;
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
  onToggleBot,
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
      <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-[color:var(--border)] bg-card/35 p-4 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[color:var(--border)] bg-surface/70">
          <UserRound className="h-5 w-5 text-brandBright" />
        </div>
        <p className="mt-3 text-base font-semibold">Panel del contacto</p>
        <p className="mt-1 text-xs leading-6 text-muted">Se completa al abrir una conversacion del inbox.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CardSection title="Identidad y estado" subtitle="Quien es, en que estado esta y que etiquetas lo describen">
        <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
          <div className="flex items-start gap-3">
            <SimpleAvatar
              src={detail.contact?.profileImageUrl}
              name={detail.contact?.name}
              className="h-14 w-14 rounded-[20px] border border-brand/20 bg-brand/10 text-sm text-brandBright"
              fallbackClassName="bg-brand/10 text-brandBright"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-lg font-semibold">{detail.contact?.name || "Sin nombre"}</p>
                <InboxBadge className={leadStatusTone(leadStatus)}>{leadStatusLabel(leadStatus)}</InboxBadge>
                <InboxBadge className={stageTone(detail.deal?.stage)}>{stageLabel(detail.deal?.stage)}</InboxBadge>
                <InboxBadge className="capitalize">{conversationStatusLabel(detail.conversation.status)}</InboxBadge>
              </div>
              <div className="mt-2 space-y-1.5 text-sm text-muted">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  {detail.contact?.phone || "Sin telefono"}
                </p>
                <p className="flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5" />
                  {detail.contact?.email || "Sin email"}
                </p>
              </div>
            </div>
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
            {detail.conversation.priority === "hot" ? <InboxBadge className="text-brandBright">Caliente</InboxBadge> : null}
            {detail.conversation.transferPaymentStatus === "payment_pending_validation" ? <InboxBadge>Pago pendiente</InboxBadge> : null}
          </div>
        </div>
      </CardSection>

      <CardSection title="Acciones principales" subtitle="Tomar, pausar o archivar sin mezclarlo con configuracion">
        <div className="grid gap-2">
          <button
            type="button"
            onClick={onTakeConversation}
            disabled={readOnly}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <UserRound className="h-4 w-4" />
            Tomar conversacion
          </button>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onToggleBot}
              disabled={readOnly}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-muted hover:text-text disabled:opacity-40"
            >
              <PauseCircle className="h-4 w-4" />
              {detail.conversation.botEnabled ? "Pausar bot" : "Reactivar bot"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={readOnly}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-muted hover:text-text disabled:opacity-40"
            >
              <Archive className="h-4 w-4" />
              Archivar
            </button>
          </div>
          <button
            type="button"
            onClick={onResetConversation}
            disabled={readOnly || resetBusy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-muted hover:text-text disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            {resetBusy ? "Reiniciando..." : "Reiniciar conversacion"}
          </button>
          <p className="text-xs text-muted">Esto permitira que el bot vuelva a empezar con este contacto.</p>
        </div>
      </CardSection>

      <CardSection title="Configuracion del bot" subtitle="Flow y modo del bot separados de la accion inmediata">
        <div className="grid gap-3">
          <label className="space-y-2">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <Settings2 className="h-3.5 w-3.5" />
              Flujo
            </span>
            <select
              value={detail.conversation.botFlowLock || "automatic"}
              onChange={(event) => onBotFlowLockChange(event.target.value as BotFlowLock)}
              disabled={readOnly}
              className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
            >
              <option value="automatic">Automatico</option>
              <option value="agenda">Agenda</option>
              <option value="commerce">Ventas</option>
            </select>
            <p className="text-xs text-muted">Actual: {botFlowLockLabel(detail.conversation.botFlowLock)}</p>
          </label>

          <label className="space-y-2">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <Settings2 className="h-3.5 w-3.5" />
              Modo bot
            </span>
            <select
              value={detail.conversation.botDomainOverride || "automatic"}
              onChange={(event) => onBotDomainOverrideChange(event.target.value as BotDomainOverride)}
              disabled={readOnly}
              className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
            >
              <option value="automatic">Automatico</option>
              <option value="agenda">Agenda</option>
              <option value="commerce">Ventas</option>
            </select>
            <p className="text-xs text-muted">Actual: {botDomainLabel(detail.conversation.botDomainOverride)}</p>
          </label>
        </div>
      </CardSection>

      <CardSection title="Contexto" subtitle="Asignacion, estado, notas y proxima accion siempre visibles">
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="rounded-xl border border-[color:var(--border)] bg-bg/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Owner actual</p>
              <p className="mt-2 text-sm font-medium text-text">{detail.conversation.assignedSellerName || detail.conversation.assignedTo || "Sin asignar"}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={assignTo}
                onChange={(event) => onAssignToChange(event.target.value)}
                className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
                disabled={readOnly}
              >
                <option value="">Seleccionar vendedor</option>
                {sellerOptions.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAssign}
                disabled={readOnly || !assignTo || assigningSeller}
                className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {assigningSeller ? "Guardando..." : "Reasignar"}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={leadStatus}
                onChange={(event) => onLeadStatusChange(event.target.value as LeadStatus)}
                className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
                disabled={readOnly || leadStatusBusy}
              >
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="rounded-xl border border-[color:var(--border)] bg-bg/70 px-3 py-2 text-xs text-muted">
                {leadStatusBusy ? "Guardando..." : "Estado"}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
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
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
              >
                Guardar
              </button>
            </div>

            <button
              type="button"
              onClick={onMarkHot}
              disabled={readOnly}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-muted hover:text-text disabled:opacity-40"
            >
              <Flag className="h-4 w-4" />
              Marcar seguimiento prioritario
            </button>
          </div>

          <div className="space-y-2 rounded-[22px] border border-[color:var(--border)] bg-surface/45 p-4">
            <p className="text-sm font-semibold">Proxima accion</p>
            <input
              type="datetime-local"
              value={nextActionAt}
              onChange={(event) => onNextActionAtChange(event.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
              disabled={readOnly || nextActionBusy}
            />
            <input
              value={nextActionNote}
              onChange={(event) => onNextActionNoteChange(event.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
              placeholder="Ej: volver a contactar con demo"
              disabled={readOnly || nextActionBusy}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveNextAction}
                disabled={readOnly || nextActionBusy}
                className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {nextActionBusy ? "Guardando..." : "Guardar seguimiento"}
              </button>
              <button
                type="button"
                onClick={onClearNextAction}
                disabled={readOnly || nextActionBusy}
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs text-muted hover:text-text disabled:opacity-40"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/45 p-4">
            <p className="text-sm font-semibold">Notas</p>
            <div className="mt-3 flex gap-2">
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
              {detail.notes.slice(0, 5).map((note) => (
                <li key={note.id} className="rounded-xl border border-[color:var(--border)] bg-bg px-3 py-2 text-xs">
                  <p>{note.text}</p>
                  <p className="mt-1 text-muted">{new Date(note.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/45 p-4">
            <p className="text-sm font-semibold">Tareas</p>
            <div className="mt-3 flex gap-2">
              <input
                value={taskTitle}
                onChange={(event) => onTaskTitleChange(event.target.value)}
                className="w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-2 text-sm"
                placeholder="Agregar proximo paso"
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
              {detail.tasks.slice(0, 5).map((task) => (
                <li key={task.id} className="rounded-xl border border-[color:var(--border)] bg-bg px-3 py-2 text-xs">
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-muted">{taskStatusLabel(task.status)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardSection>

      <CardSection title="Accesos" subtitle="Historial, pedido y continuidad comercial">
        <div className="grid gap-2 sm:grid-cols-2">
          {historyHref ? (
            <Link
              href={historyHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-muted hover:text-text"
            >
              <History className="h-4 w-4" />
              Ver historial
            </Link>
          ) : null}
          {orderHref ? (
            <Link
              href={orderHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-muted hover:text-text"
            >
              <History className="h-4 w-4" />
              Ver pedido
            </Link>
          ) : null}
          {commercialActionParams ? (
            <Link
              href={{
                pathname: "/app/agenda",
                query: { ...commercialActionParams, actionType: "demo" }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/15"
            >
              <Clock3 className="h-4 w-4" />
              Agendar demo
            </Link>
          ) : null}
          {commercialActionParams ? (
            <Link
              href={{
                pathname: "/app/agenda",
                query: { ...commercialActionParams, actionType: "visit" }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/15"
            >
              <Clock3 className="h-4 w-4" />
              Agendar visita
            </Link>
          ) : null}
        </div>
      </CardSection>
    </div>
  );
}
