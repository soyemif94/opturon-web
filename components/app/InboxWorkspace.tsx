"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/app/inbox/ChatPanel";
import { InboxConnectionEmptyState } from "@/components/app/inbox/InboxConnectionEmptyState";
import { ConversationList } from "@/components/app/inbox/ConversationList";
import { InboxLayout } from "@/components/app/inbox/InboxLayout";
import { ProfilePanel } from "@/components/app/inbox/ProfilePanel";
import type { BotDomainOverride, BotFlowLock, ConversationRowData, DetailPayload, FilterKey } from "@/components/app/inbox/types";
import { useInboxContext } from "@/components/inbox/inbox-context";
import { getSuggestions, type SuggestionItem } from "@/lib/suggestions/getSuggestions";
import { normalizeText } from "@/lib/search/normalize";
import { toast } from "@/components/ui/toast";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import { shouldShowInboxChannelEmptyState } from "@/lib/whatsapp-channel-state";

type InboxListResponse = {
  readOnly: boolean;
  conversations: ConversationRowData[];
  channelState?: WhatsAppConnectionStatus;
};

type SellerOption = {
  id: string;
  name: string;
  role: string;
};

const DEFAULT_FILTER: FilterKey = "all";

export function InboxWorkspace({
  initialConversationId,
  demo,
  tenantId,
  currentUserId
}: {
  initialConversationId?: string;
  demo?: boolean;
  tenantId?: string;
  currentUserId?: string;
}) {
  const inbox = useInboxContext();
  const setInboxState = inbox.setState;
  const setInboxControls = inbox.setControls;
  const clearInboxControls = inbox.clearControls;
  const [filter, setFilter] = useState<FilterKey>(DEFAULT_FILTER);
  const [visibility, setVisibility] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ConversationRowData[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialConversationId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [channelState, setChannelState] = useState<WhatsAppConnectionStatus | null>(null);
  const [archivingSelection, setArchivingSelection] = useState(false);
  const [restoringSelection, setRestoringSelection] = useState(false);
  const [composer, setComposer] = useState("");
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [dealStage, setDealStage] = useState("lead");
  const [assignTo, setAssignTo] = useState("");
  const [sellerOptions, setSellerOptions] = useState<SellerOption[]>([]);
  const [assigningSeller, setAssigningSeller] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [autoSuggestions, setAutoSuggestions] = useState<SuggestionItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: string; name: string; price: number; stock: number; tags: string[] }>>([]);
  const autoSuggestCacheRef = useRef<Map<string, SuggestionItem[]>>(new Map());
  const rowsSnapshotRef = useRef("");
  const detailSnapshotRef = useRef("");
  const rowsRequestSeqRef = useRef(0);
  const detailRequestSeqRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const autoReadInFlightRef = useRef<string | null>(null);

  const querySuffix = useMemo(() => {
    const params = new URLSearchParams();
    if (demo) params.set("demo", "1");
    if (tenantId) params.set("tenantId", tenantId);
    return params.toString();
  }, [demo, tenantId]);

  function appendQuery(path: string, seed?: Record<string, string>) {
    const params = new URLSearchParams(seed || {});
    if (querySuffix) {
      const extra = new URLSearchParams(querySuffix);
      extra.forEach((value, key) => params.set(key, value));
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }

  function intentTags(intent?: string | null) {
    const text = (intent || "").toLowerCase();
    if (text.includes("venta") || text.includes("precio") || text.includes("presupuesto")) {
      return ["precio", "presupuesto", "promo", "descuento", "costo"];
    }
    if (text.includes("envio") || text.includes("delivery")) {
      return ["envio", "direccion", "zona", "entrega"];
    }
    return [];
  }

  function stageTags(stage?: string | null) {
    if (!stage) return [];
    if (stage === "lead" || stage === "qualified") return ["email", "presupuesto", "contacto"];
    if (stage === "proposal") return ["presupuesto", "pago", "cierre"];
    return [];
  }

  function rankAutoSuggestions(base: SuggestionItem[], options: { intent?: string | null; stage?: string | null; industry?: string | null }) {
    const iTags = intentTags(options.intent);
    const sTags = stageTags(options.stage);
    const industry = (options.industry || "").toLowerCase();
    return base
      .map((item) => {
        let boosted = item.score;
        const label = item.label.toLowerCase();
        if (iTags.some((tag) => label.includes(tag))) boosted += 2;
        if (industry && label.includes(industry)) boosted += 1;
        if (sTags.some((tag) => label.includes(tag))) boosted += 1;
        return { ...item, score: boosted };
      })
      .sort((a, b) => b.score - a.score);
  }

  async function loadRows(options?: { silent?: boolean }) {
    const requestSeq = ++rowsRequestSeqRef.current;
    if (!options?.silent) setRowsLoading(true);
    try {
      const response = await fetch(
        appendQuery("/api/app/inbox", {
          filter,
          visibility
        }),
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`inbox_list_failed_${response.status}`);
      }
      const json = (await response.json()) as InboxListResponse;
      if (!json || !Array.isArray(json.conversations)) {
        throw new Error("invalid_inbox_list_shape");
      }
      let nextRows = [...(json.conversations || [])].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      if (onlyUnread) nextRows = nextRows.filter((row) => row.unreadCount > 0);
      const nextReadOnly = Boolean(json.readOnly);
      const nextSnapshot = JSON.stringify({
        readOnly: nextReadOnly,
        channelState: json.channelState || null,
        selectedId,
        rows: nextRows
      });
      const changed = rowsSnapshotRef.current !== nextSnapshot;

      if (changed && requestSeq === rowsRequestSeqRef.current) {
        rowsSnapshotRef.current = nextSnapshot;
        setReadOnly(nextReadOnly);
        setRows(nextRows);
        setChannelState(json.channelState || null);
        if (!selectedId && nextRows.length) setSelectedId(nextRows[0].id);
        if (selectedId && !nextRows.some((item) => item.id === selectedId)) setSelectedId(nextRows[0]?.id);
        setSelectedIds((current) => current.filter((id) => nextRows.some((item) => item.id === id)));
      }

      setRowsError(null);
      setRowsLoaded(true);
    } catch (error) {
      if (!options?.silent) {
        setRowsError(error instanceof Error ? error.message : "No se pudo cargar el inbox");
      }
    } finally {
      if (!options?.silent) setRowsLoading(false);
    }
  }

  async function loadDetail(conversationId: string, options?: { silent?: boolean }) {
    const requestSeq = ++detailRequestSeqRef.current;
    if (!options?.silent) setDetailLoading(true);
    try {
      const response = await fetch(appendQuery(`/api/app/inbox/${conversationId}`), { cache: "no-store" });
      if (!response.ok) return;
      const json = (await response.json()) as DetailPayload;
      const nextReadOnly = Boolean(json.readOnly);
      const nextSnapshot = JSON.stringify(json);
      const changed = detailSnapshotRef.current !== nextSnapshot;

        if (changed && requestSeq === detailRequestSeqRef.current) {
        detailSnapshotRef.current = nextSnapshot;
        setDetail(json);
        setReadOnly(nextReadOnly);
        if (json.deal?.stage) setDealStage(json.deal.stage);
        setAssignTo(json.conversation?.assignedSellerUserId || "");
        const latestMessage = Array.isArray(json.messages) && json.messages.length > 0 ? json.messages[json.messages.length - 1] : null;
        if (json.conversation?.id) {
          setRows((prev) =>
            prev.map((row) =>
              row.id === json.conversation.id
                ? {
                    ...row,
                    lastMessageAt: latestMessage?.timestamp || json.conversation.lastMessageAt || row.lastMessageAt,
                    lastMessagePreview: latestMessage?.text || row.lastMessagePreview
                  }
                : row
            )
          );
        }
      }
    } finally {
      if (!options?.silent) setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, onlyUnread, visibility]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRows();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (demo || readOnly) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled || pollInFlightRef.current) {
        if (!cancelled) timer = setTimeout(() => void tick(), 5000);
        return;
      }

      pollInFlightRef.current = true;
      try {
        await loadRows({ silent: true });
        if (selectedId) {
          await loadDetail(selectedId, { silent: true });
        }
      } finally {
        pollInFlightRef.current = false;
        if (!cancelled) timer = setTimeout(() => void tick(), 5000);
      }
    };

    timer = setTimeout(() => void tick(), 5000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, readOnly, selectedId, tenantId]);

  useEffect(() => {
    if (!selectedId || readOnly) return;
    const selectedRow = rows.find((row) => row.id === selectedId);
    if (!selectedRow || selectedRow.unreadCount <= 0) return;
    if (autoReadInFlightRef.current === selectedId) return;

    autoReadInFlightRef.current = selectedId;
    setRows((prev) => prev.map((row) => (row.id === selectedId ? { ...row, unreadCount: 0 } : row)));
    setDetail((prev) =>
      prev && prev.conversation.id === selectedId
        ? { ...prev, conversation: { ...prev.conversation, unreadCount: 0 } }
        : prev
    );

    void mutateConversation(selectedId, "mark_read").finally(() => {
      if (autoReadInFlightRef.current === selectedId) {
        autoReadInFlightRef.current = null;
      }
    });
  }, [readOnly, rows, selectedId]);

  const lastInboundMessage = useMemo(() => {
    return [...(detail?.messages || [])].reverse().find((message) => message.direction === "inbound");
  }, [detail?.messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/app/orders/meta", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const json = await response.json().catch(() => null);
      if (cancelled || !json || !Array.isArray(json.sellers)) return;
      setSellerOptions(
        json.sellers
          .filter((seller: any) => seller && seller.id && seller.role !== "viewer")
          .map((seller: any) => ({
            id: String(seller.id),
            name: String(seller.name || seller.id),
            role: String(seller.role || "seller")
          }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch(appendQuery("/api/app/catalog"));
      if (!response.ok || cancelled) return;
      const json = await response.json();
      const mapped = (json.products || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        stock: Number(product.stockQty || 0),
        tags: Array.isArray(product.tags)
          ? product.tags
          : [product.name, product.category || "", product.sku || "", "producto", "stock", "precio"].filter(Boolean)
      }));
      setCatalogProducts(mapped);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    const latestInbound = lastInboundMessage?.text || "";
    const intentText = detail?.aiEvents?.[0]?.text || "";
    const sourceText = composer.trim() || latestInbound || intentText;
    if (!sourceText) {
      setSuggestions([]);
      setInboxState({ liveSuggestions: [] });
      return;
    }

    const timer = setTimeout(() => {
      const templates = (detail?.quickReplies || []).map((item, idx) => ({
        id: `tpl-${idx}-${item.intent}`,
        name: item.intent,
        text: item.text,
        tags: [item.intent, ...item.text.split(" ").slice(0, 6)]
      }));

      const actions = [
        { id: "act-request-budget", label: "Pedir presupuesto", tags: ["precio", "presupuesto", "costo", "valor"] },
        { id: "act-request-address", label: "Pedir direccion", tags: ["envio", "direccion", "zona", "barrio"] },
        { id: "act-request-email", label: "Pedir email", tags: ["email", "correo", "contacto"] }
      ];

      const next = getSuggestions({
        text: sourceText,
        templates,
        products: catalogProducts,
        actions
      });
      setSuggestions(next.slice(0, 5));
      setInboxState({ liveSuggestions: next.slice(0, 5) });
    }, 200);

    return () => clearTimeout(timer);
  }, [catalogProducts, composer, detail, lastInboundMessage?.id, lastInboundMessage?.timestamp, setInboxState]);

  function buildAutoSuggestions(force = false) {
    const conversationId = detail?.conversation.id || selectedId;
    const inboundId = lastInboundMessage?.id;
    const inboundText = lastInboundMessage?.text || "";
    if (!conversationId || !inboundId || !inboundText) {
      setAutoSuggestions([]);
      setInboxState({ autoSuggestions: [] });
      return;
    }

    const cacheKey = `${conversationId}:${inboundId}`;
    if (!force && autoSuggestCacheRef.current.has(cacheKey)) {
      const cached = autoSuggestCacheRef.current.get(cacheKey) || [];
      setAutoSuggestions(cached);
      setInboxState({ autoSuggestions: cached });
      return;
    }

    const templates = (detail?.quickReplies || []).map((item, idx) => ({
      id: `tpl-auto-${idx}-${item.intent}`,
      name: item.intent,
      text: item.text,
      tags: [item.intent, ...normalizeText(item.text).slice(0, 6)]
    }));

    const fallbackTemplates = [
      { id: "tpl-generic-hours", name: "Horario", text: "Nuestro horario de atencion es de lunes a viernes de 9 a 18 hs.", tags: ["horario", "atencion", "hora"] },
      { id: "tpl-generic-payment", name: "Formas de pago", text: "Aceptamos efectivo, transferencia y tarjetas.", tags: ["pago", "tarjeta", "transferencia"] },
      { id: "tpl-generic-call", name: "Agendar llamada", text: "Si queres, coordinamos una llamada de 10 minutos.", tags: ["llamada", "agendar", "contacto"] }
    ];

    const actions = [
      { id: "act-request-budget", label: "Pedir presupuesto", tags: ["precio", "presupuesto", "costo", "valor"] },
      { id: "act-request-address", label: "Pedir direccion", tags: ["envio", "direccion", "zona", "barrio"] },
      { id: "act-request-email", label: "Pedir email", tags: ["email", "correo", "contacto"] }
    ];

    const base = getSuggestions({
      text: `${inboundText} ${detail?.aiEvents?.[0]?.text || ""} ${detail?.deal?.stage || ""} ${detail?.contact?.industry || ""}`,
      templates: templates.length ? templates : fallbackTemplates,
      products: catalogProducts,
      actions
    });

    let ranked = rankAutoSuggestions(base, {
      intent: detail?.aiEvents?.[0]?.text || null,
      stage: detail?.deal?.stage || null,
      industry: detail?.contact?.industry || null
    });

    if (!ranked.length) {
      ranked = fallbackTemplates.map((tpl, idx) => ({
        type: "template" as const,
        id: tpl.id,
        label: tpl.name,
        text: tpl.text,
        score: 3 - idx
      }));
    }

    const topTemplates = ranked.filter((item) => item.type === "template").slice(0, 3);
    const topProducts = ranked.filter((item) => item.type === "product").slice(0, 2);
    const topActions = ranked.filter((item) => item.type === "action").slice(0, 1);
    const finalList = [...topTemplates, ...topProducts, ...topActions].slice(0, 6);

    autoSuggestCacheRef.current.set(cacheKey, finalList);
    setAutoSuggestions(finalList);
    setInboxState({ autoSuggestions: finalList });
  }

  useEffect(() => {
    if (!detail?.conversation?.id || !lastInboundMessage?.id) {
      setAutoSuggestions([]);
      setInboxState({ autoSuggestions: [] });
      return;
    }
    const timer = setTimeout(() => {
      buildAutoSuggestions(false);
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.conversation?.id, lastInboundMessage?.id, lastInboundMessage?.timestamp, detail?.aiEvents?.[0]?.text, detail?.deal?.stage, setInboxState]);

  useEffect(() => {
    const selectedRow = selectedId ? rows.find((row) => row.id === selectedId) : undefined;
    setInboxState({
      tenantId,
      conversationId: detail?.conversation.id || selectedId || null,
      contactId: detail?.contact?.id || null,
      dealId: detail?.deal?.id || null,
      contactName: detail?.contact?.name || selectedRow?.contact?.name || null,
      contactPhone: detail?.contact?.phone || selectedRow?.contact?.phone || null,
      intent: detail?.aiEvents?.[0]?.text || null,
      stage: detail?.deal?.stage || null,
      botEnabled: detail?.conversation?.botEnabled ?? null,
      assignedTo: detail?.conversation?.assignedSellerName || detail?.conversation?.assignedTo || null,
      isHot: (detail?.conversation?.priority || selectedRow?.priority) === "hot",
      lastMessageAt: detail?.conversation?.lastMessageAt || selectedRow?.lastMessageAt || null,
      unreadCount: selectedRow?.unreadCount || 0
      ,
      liveSuggestions: suggestions,
      autoSuggestions
    });
  }, [autoSuggestions, detail, rows, selectedId, setInboxState, suggestions, tenantId]);

  async function mutateConversation(conversationId: string, action: string, payload: Record<string, unknown> = {}) {
    if (readOnly) return false;

    const response = await fetch(appendQuery(`/api/app/inbox/${conversationId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) return false;

    await loadRows();
    if (selectedId === conversationId) await loadDetail(conversationId);
    return true;
  }

  function applyAssignedSellerLocally(conversationId: string, seller: SellerOption) {
    setRows((prev) => {
      const nextRows = prev
        .map((row) =>
          row.id === conversationId
            ? {
                ...row,
                assignedTo: seller.name,
                assignedSellerUserId: seller.id,
                assignedSellerName: seller.name,
                assignedSellerRole: seller.role
              }
            : row
        );

      if (filter === "asignadas" && currentUserId && seller.id !== currentUserId) {
        return nextRows.filter((row) => row.id !== conversationId);
      }

      return nextRows;
    });

    setDetail((prev) =>
      prev && prev.conversation.id === conversationId
        ? {
            ...prev,
            conversation: {
              ...prev.conversation,
              assignedTo: seller.name,
              assignedSellerUserId: seller.id,
              assignedSellerName: seller.name,
              assignedSellerRole: seller.role
            },
            assignee: {
              id: seller.id,
              name: seller.name
            },
            assignedSeller: {
              id: seller.id,
              name: seller.name,
              role: seller.role
            }
          }
        : prev
    );

    setInboxState({ assignedTo: seller.name });
  }

  async function assignSeller(conversationId: string, sellerUserId: string) {
    const seller = sellerOptions.find((item) => item.id === sellerUserId);
    if (!conversationId || !seller || readOnly || assigningSeller) return false;

    setAssigningSeller(true);
    try {
      const response = await fetch(appendQuery(`/api/app/inbox/${conversationId}/assign-seller`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerUserId })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "assign_seller_failed"));
      }

      applyAssignedSellerLocally(conversationId, seller);
      if (selectedId === conversationId && filter === "asignadas" && currentUserId && seller.id !== currentUserId) {
        setSelectedId(undefined);
        setDetail(null);
      }
      void loadRows({ silent: true });
      if (selectedId === conversationId) {
        void loadDetail(conversationId, { silent: true });
      }
      return true;
    } catch (error) {
      toast.error("No se pudo reasignar la conversacion", error instanceof Error ? error.message : "unknown_error");
      return false;
    } finally {
      setAssigningSeller(false);
    }
  }

  async function runOptimisticAction(action: string, payload: Record<string, unknown> = {}) {
    if (!selectedId || !detail) return false;
    const snapshotDetail = detail;
    const snapshotRows = rows;

    if (action === "toggle_bot") {
      const next = Boolean(payload.botEnabled);
      setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, botEnabled: next } } : prev));
      setInboxState({ botEnabled: next });
    }
    if (action === "mark_hot") {
      setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, priority: "hot" } } : prev));
      setInboxState({ isHot: true });
    }
    if (action === "unmark_hot") {
      setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, priority: "normal" } } : prev));
      setInboxState({ isHot: false });
    }
    if (action === "close") {
      setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, status: "closed" } } : prev));
    }
    if (action === "reopen") {
      setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, status: "open" } } : prev));
    }
    if (action === "assign") {
      const nextAssign = typeof payload.assignedTo === "string" ? payload.assignedTo : null;
      setDetail((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, assignedTo: nextAssign || undefined } } : prev));
      setInboxState({ assignedTo: nextAssign });
    }
    if (action === "set_bot_domain_override") {
      const nextOverride = typeof payload.botDomainOverride === "string" ? (payload.botDomainOverride as BotDomainOverride) : "automatic";
      setDetail((prev) =>
        prev ? { ...prev, conversation: { ...prev.conversation, botDomainOverride: nextOverride } } : prev
      );
    }
    if (action === "set_bot_flow_lock") {
      const nextLock = typeof payload.botFlowLock === "string" ? (payload.botFlowLock as BotFlowLock) : "automatic";
      setDetail((prev) =>
        prev ? { ...prev, conversation: { ...prev.conversation, botFlowLock: nextLock } } : prev
      );
    }
    if (action === "mark_read") {
      setInboxState({ unreadCount: 0 });
    }
    if (action === "mark_unread") {
      setInboxState({ unreadCount: Math.max(1, inbox.state.unreadCount) });
    }

    const ok = await mutateConversation(selectedId, action, payload);
    if (!ok) {
      setDetail(snapshotDetail);
      setRows(snapshotRows);
      setInboxState({
        botEnabled: snapshotDetail.conversation.botEnabled,
        isHot: snapshotDetail.conversation.priority === "hot",
        assignedTo: snapshotDetail.conversation.assignedTo || null
      });
    }
    return ok;
  }

  async function archiveSelectedConversations() {
    if (readOnly || selectedIds.length === 0 || archivingSelection) return;

    const currentSelection = [...selectedIds];
    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(`Se ocultaran ${currentSelection.length} conversaciones del inbox. El historial y los pedidos seguiran intactos.`);
    if (!confirmed) return;

    setArchivingSelection(true);
    try {
      const response = await fetch(appendQuery("/api/app/inbox/archive"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationIds: currentSelection })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "inbox_archive_failed"));

      const archivedIds = Array.isArray(json?.archivedConversationIds) ? json.archivedConversationIds : currentSelection;
      const remaining = rows.filter((row) => !archivedIds.includes(row.id));
      setRows(remaining);
      setSelectedIds([]);
      if (selectedId && archivedIds.includes(selectedId)) {
        setSelectedId(remaining[0]?.id);
        if (!remaining.length) {
          setSelectedId(undefined);
          setDetail(null);
        }
      }
      toast.success("Conversaciones ocultadas", "Ya no aparecen en el inbox, pero el historial sigue preservado.");
      await loadRows();
    } catch (error) {
      toast.error("No se pudieron ocultar las conversaciones", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setArchivingSelection(false);
    }
  }

  async function restoreSelectedConversations() {
    if (readOnly || selectedIds.length === 0 || restoringSelection) return;

    const currentSelection = [...selectedIds];
    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(`Se restauraran ${currentSelection.length} conversaciones al inbox activo.`);
    if (!confirmed) return;

    setRestoringSelection(true);
    try {
      const response = await fetch(appendQuery("/api/app/inbox/restore"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationIds: currentSelection })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "inbox_restore_failed"));

      const restoredIds = Array.isArray(json?.restoredConversationIds) ? json.restoredConversationIds : currentSelection;
      const remaining = rows.filter((row) => !restoredIds.includes(row.id));
      setRows(remaining);
      setSelectedIds([]);
      if (selectedId && restoredIds.includes(selectedId)) {
        setSelectedId(remaining[0]?.id);
        if (!remaining.length) {
          setSelectedId(undefined);
          setDetail(null);
        }
      }
      toast.success("Conversaciones restauradas", "Ya vuelven a aparecer en el inbox activo.");
      await loadRows();
    } catch (error) {
      toast.error("No se pudieron restaurar las conversaciones", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setRestoringSelection(false);
    }
  }

  useEffect(() => {
    setInboxControls({
      applyFilter: (nextFilter) => setFilter(nextFilter as FilterKey),
      toggleOnlyUnread: () => setOnlyUnread((prev) => !prev),
      setSearch: (query) => setSearch(query),
      openConversation: (conversationId) => setSelectedId(conversationId),
      runAction: async (action, payload) => {
        const ok = await runOptimisticAction(action, payload || {});
        if (!ok) toast.error("No se pudo aplicar la accion");
        return ok;
      }
    });
    return () => clearInboxControls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearInboxControls, detail, rows, selectedId, setInboxControls]);

  async function sendMessage(value: string) {
    const text = value.trim();
    if (!selectedId || !text || readOnly || !detail) return;

    const optimisticId = `optimistic-msg-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      direction: "outbound",
      text,
      timestamp: new Date().toISOString(),
      status: "sent",
      optimistic: true
    };

    setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev));
    setComposer("");

    try {
      const response = await fetch(appendQuery("/api/app/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, text })
      });
      if (!response.ok) throw new Error("message_failed");
      await loadRows();
      await loadDetail(selectedId);
    } catch {
      setDetail((prev) => (prev ? { ...prev, messages: prev.messages.filter((item) => item.id !== optimisticId) } : prev));
      toast.error("No se pudo enviar el mensaje", "Reintenta en unos segundos.");
    }
  }

  async function runAction(action: "toggle_bot" | "mark_hot" | "close" | "assign" | "change_stage" | "set_bot_domain_override") {
    if (!selectedId || !detail) return;
    const payload: Record<string, unknown> = {};
    if (action === "toggle_bot") payload.botEnabled = !detail.conversation.botEnabled;
    if (action === "assign") payload.assignedTo = assignTo || undefined;
    if (action === "change_stage") payload.stage = dealStage;

    const ok = action === "change_stage" ? await mutateConversation(selectedId, action, payload) : await runOptimisticAction(action, payload);
    if (!ok) toast.error("No se pudo guardar el cambio");
  }

  async function takeConversation() {
    if (!selectedId || !currentUserId || readOnly) return;
    setAssignTo(currentUserId);
    const ok = await assignSeller(selectedId, currentUserId);
    if (!ok) toast.error("No se pudo tomar la conversacion");
  }

  async function reassignConversation() {
    if (!selectedId || !assignTo) return;
    const ok = await assignSeller(selectedId, assignTo);
    if (ok) {
      toast.success("Conversacion reasignada", "El owner se actualizo al instante en el inbox.");
    }
  }

  async function changeBotDomainOverride(nextOverride: BotDomainOverride) {
    if (!selectedId || !detail) return;
    const ok = await runOptimisticAction("set_bot_domain_override", { botDomainOverride: nextOverride });
    if (!ok) toast.error("No se pudo actualizar el modo del bot");
  }

  async function changeBotFlowLock(nextLock: BotFlowLock) {
    if (!selectedId || !detail) return;
    const ok = await runOptimisticAction("set_bot_flow_lock", { botFlowLock: nextLock });
    if (!ok) toast.error("No se pudo actualizar el flujo del bot");
  }

  async function addNote() {
    const text = noteText.trim();
    if (!selectedId || !detail || !text || readOnly) return;
    const optimisticNote = { id: `note-${Date.now()}`, text, createdAt: new Date().toISOString() };
    setDetail((prev) => (prev ? { ...prev, notes: [optimisticNote, ...prev.notes] } : prev));
    setNoteText("");
    const ok = await mutateConversation(selectedId, "add_note", { text });
    if (!ok) {
      setDetail((prev) => (prev ? { ...prev, notes: prev.notes.filter((item) => item.id !== optimisticNote.id) } : prev));
      setNoteText(text);
      toast.error("No se pudo guardar la nota");
    }
  }

  async function addTask() {
    const title = taskTitle.trim();
    if (!selectedId || !detail || !title || readOnly) return;
    const optimisticTask = { id: `task-${Date.now()}`, title, status: "todo", dueDate: undefined };
    setDetail((prev) => (prev ? { ...prev, tasks: [optimisticTask, ...prev.tasks] } : prev));
    setTaskTitle("");
    const ok = await mutateConversation(selectedId, "add_task", { title });
    if (!ok) {
      setDetail((prev) => (prev ? { ...prev, tasks: prev.tasks.filter((item) => item.id !== optimisticTask.id) } : prev));
      setTaskTitle(title);
      toast.error("No se pudo guardar la tarea");
    }
  }

  async function rowAction(id: string, action: "mark_hot" | "close") {
    const ok = await mutateConversation(id, action);
    if (!ok) toast.error("No se pudo ejecutar la accion rapida");
  }

  function applySuggestion(item: SuggestionItem) {
    if (item.type === "template") {
      setComposer(item.text || item.label);
      return;
    }
    if (item.type === "product") {
      const product = catalogProducts.find((p) => p.id === item.id);
      const snippet = product
        ? `${product.name} - $${product.price} (stock: ${product.stock})`
        : item.label;
      setComposer((prev) => `${prev}${prev ? "\n" : ""}${snippet}`);
      return;
    }
    if (item.type === "action") {
      if (item.id === "act-mark-hot") {
        void runOptimisticAction("mark_hot");
        return;
      }
      if (item.id === "act-close-conversation") {
        void runOptimisticAction("close");
        return;
      }
      if (item.id === "act-request-budget") setComposer("Para recomendarte mejor, me compartis tu presupuesto estimado?");
      if (item.id === "act-request-address") setComposer("Podrias pasarme direccion completa para validar envio?");
      if (item.id === "act-request-email") setComposer("Compartime un email de contacto para enviarte la propuesta.");
    }
  }

  const conversationUrl = selectedId
    ? `/app/inbox/${selectedId}${demo && tenantId ? `?demo=1&tenantId=${tenantId}` : ""}`
    : undefined;
  const orderHref = detail?.relatedOrder?.id ? `/app/orders?orderId=${encodeURIComponent(detail.relatedOrder.id)}` : undefined;
  const shouldRenderChannelEmptyState = Boolean(channelState && rows.length === 0 && shouldShowInboxChannelEmptyState(channelState));

  return (
    <div className="flex min-h-[calc(100vh-180px)] flex-col gap-3 text-sm xl:min-h-[calc(100vh-132px)]">
      <header className="shrink-0">
        <h1 className="text-base font-semibold">Inbox</h1>
        <p className="text-xs text-muted">Conversaciones, contexto comercial y seguimiento operativo.</p>
      </header>

      {readOnly ? (
        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-200">
          Modo demo read-only activo.
        </div>
      ) : null}

      {shouldRenderChannelEmptyState && channelState ? (
        <InboxConnectionEmptyState status={channelState} />
      ) : (
        <InboxLayout
          hasDetail={Boolean(selectedId)}
          onBackToList={selectedId ? () => setSelectedId(undefined) : undefined}
          left={
            <ConversationList
              rows={rows}
              loading={rowsLoading}
              hasLoaded={rowsLoaded}
              errorMessage={rowsError}
              selectedId={selectedId}
              filter={filter}
              search={search}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onSelect={setSelectedId}
              onMarkHot={(id) => void rowAction(id, "mark_hot")}
              onClose={(id) => void rowAction(id, "close")}
              readOnly={readOnly}
              onClearFilters={() => {
                setFilter(DEFAULT_FILTER);
                setSearch("");
                setOnlyUnread(false);
              }}
              onRetry={() => void loadRows()}
              visibility={visibility}
              onVisibilityChange={(value) => {
                setVisibility(value);
                setSelectedIds([]);
              }}
              selectedIds={selectedIds}
              onToggleSelect={(id) =>
                setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
              }
              onSelectVisible={(ids) => setSelectedIds(ids)}
              onClearSelection={() => setSelectedIds([])}
              onArchiveSelected={() => void archiveSelectedConversations()}
              archiveBusy={archivingSelection}
              onRestoreSelected={() => void restoreSelectedConversations()}
              restoreBusy={restoringSelection}
            />
          }
          center={
            <ChatPanel
              detail={detail}
              loading={detailLoading}
              composer={composer}
              onComposerChange={setComposer}
              onSend={() => void sendMessage(composer)}
              readOnly={readOnly}
              onSelectTemplate={(text) => setComposer(text)}
              suggestions={suggestions}
              onSelectSuggestion={applySuggestion}
              autoSuggestions={autoSuggestions}
              onRegenerateAutoSuggestions={() => buildAutoSuggestions(true)}
              onToggleBot={() => void runAction("toggle_bot")}
              onTakeConversation={() => void takeConversation()}
              onArchive={() => void runAction("close")}
              onBotFlowLockChange={(value) => void changeBotFlowLock(value)}
              onBotDomainOverrideChange={(value) => void changeBotDomainOverride(value)}
            />
          }
          right={
            <ProfilePanel
              detail={detail}
              loading={detailLoading}
              readOnly={readOnly}
              dealStage={dealStage}
              onDealStageChange={setDealStage}
              onSaveDealStage={() => void runAction("change_stage")}
              assignTo={assignTo}
              onAssignToChange={setAssignTo}
              sellerOptions={sellerOptions}
              assigningSeller={assigningSeller}
              onAssign={() => void reassignConversation()}
              onToggleBot={() => void runAction("toggle_bot")}
              onMarkHot={() => void runAction("mark_hot")}
              onClose={() => void runAction("close")}
              noteText={noteText}
              onNoteTextChange={setNoteText}
              onAddNote={() => void addNote()}
              taskTitle={taskTitle}
              onTaskTitleChange={setTaskTitle}
              onAddTask={() => void addTask()}
              historyHref={conversationUrl}
              orderHref={orderHref}
            />
          }
        />
      )}
    </div>
  );
}
