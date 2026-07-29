import type { PortalInventoryLot, PortalInventoryLotHistoryEntry } from "@/lib/api";

export type LotMutationKind = "block" | "unblock";

export type LotActionContext = {
  readOnly: boolean;
  canManageSensitive: boolean;
};

export function getLotStatusLabel(status: PortalInventoryLot["status"]) {
  switch (status) {
    case "active":
      return "Activo";
    case "blocked":
      return "Bloqueado";
    case "written_off":
      return "Dado de baja";
    case "cancelled":
      return "Cancelado";
    case "depleted":
      return "Agotado";
    default:
      return status;
  }
}

export function getLotStatusVariant(status: PortalInventoryLot["status"]) {
  switch (status) {
    case "active":
      return "success" as const;
    case "blocked":
      return "warning" as const;
    case "written_off":
      return "danger" as const;
    case "cancelled":
    case "depleted":
    default:
      return "muted" as const;
  }
}

export function getLotActorName(lot: PortalInventoryLot) {
  const metadata = lot.metadata && typeof lot.metadata === "object" ? lot.metadata : null;
  const actorCandidates = [
    metadata && typeof metadata.blockedByName === "string" ? metadata.blockedByName : null,
    metadata && typeof metadata.actorName === "string" ? metadata.actorName : null,
    metadata && typeof metadata.blockedBy === "string" ? metadata.blockedBy : null
  ].filter((value): value is string => Boolean(value && value.trim()));
  return actorCandidates[0] || null;
}

export function getLotActionAvailability(lot: PortalInventoryLot, context: LotActionContext) {
  const canMutate = context.canManageSensitive && !context.readOnly;
  const available = Number((lot.availableCommercialQuantity ?? lot.availableQuantity) || 0);
  const status = lot.status;
  const isWrittenOff = status === "written_off";
  const isCancelled = status === "cancelled";
  const canBlock = canMutate && status === "active" && lot.expirationStatus !== "expired";
  const canUnblock = canMutate && status === "blocked";
  const canEditExpiration = canMutate && !isWrittenOff && !isCancelled;
  const canAdjustOut = canMutate && !isWrittenOff && !isCancelled && available > 0;
  const canWriteOff = canMutate && !isWrittenOff && !isCancelled && available > 0;

  return {
    canBlock,
    canUnblock,
    canEditExpiration,
    canAdjustOut,
    canWriteOff,
    hideMutations: !canMutate || isWrittenOff,
    statusLabel: getLotStatusLabel(status),
    statusVariant: getLotStatusVariant(status)
  };
}

export function createLotMutationAttemptKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function buildLotMutationPayload(kind: LotMutationKind, lotId: string, reason: string, attemptKey: string) {
  const normalizedReason = reason.trim();
  return {
    reason: normalizedReason,
    idempotencyKey: `lot-${kind}:${lotId}:${attemptKey}`
  };
}

export function buildLotExpirationPayload(lotId: string, expiresAt: string, reason: string, attemptKey: string) {
  return {
    expiresAt: expiresAt.trim(),
    reason: reason.trim(),
    idempotencyKey: `lot-expiration:${lotId}:${attemptKey}`
  };
}

export function buildLotWriteoffPayload(lotId: string, quantity: number, reason: string, attemptKey: string) {
  return {
    movementType: "manual_decrease" as const,
    quantity,
    reason: reason.trim(),
    referenceType: "inventory_manual_writeoff" as const,
    idempotencyKey: `lot-adjust:${lotId}:manual_decrease:${attemptKey}`
  };
}

export function getLotHistoryLabel(entry: PortalInventoryLotHistoryEntry) {
  switch (entry.type) {
    case "manual_writeoff":
      return "Baja manual";
    case "expired_writeoff":
      return "Baja por vencimiento";
    case "manual_adjustment_out":
    case "manual_decrease":
      return "Ajuste de salida";
    case "manual_adjustment_in":
    case "manual_increase":
      return "Ajuste de ingreso";
    case "block":
      return "Bloqueo";
    case "unblock":
      return "Desbloqueo";
    case "change_expiration":
      return "Cambio de vencimiento";
    case "purchase_receipt":
      return "Ingreso";
    case "writeoff":
      return "Baja";
    default:
      return entry.type || entry.kind || "Movimiento";
  }
}

export function sanitizeLotMutationError(message: string | null | undefined, fallback: string) {
  const safeMessage = typeof message === "string" ? message.trim() : "";
  if (!safeMessage) return fallback;
  if (safeMessage.includes("_")) return fallback;
  return safeMessage;
}
