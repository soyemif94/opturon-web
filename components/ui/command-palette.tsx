"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, MessageSquare, Package, Search, Shield, Users } from "lucide-react";
import { useInboxContextOptional } from "@/components/inbox/inbox-context";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { canEditWorkspace, canManageUsers, canManageWorkspace } from "@/lib/app-permissions";
import type { GlobalRole, TenantRole } from "@/lib/saas/types";
import { cn } from "@/lib/ui/cn";
import { timeAgo } from "@/lib/ui/format";
import { toast } from "@/components/ui/toast";

export type CommandPaletteContextValue = {
  tenantId?: string;
  conversationId?: string;
  contactId?: string;
  dealId?: string;
  forceInboxMode?: boolean;
};

type PaletteScope = "app" | "ops";
type PaletteMode = "global" | "inbox" | "conversation";
type Subview = "root" | "templates" | "products" | "stages";
type CommandGroup = "conversation" | "messaging" | "contact" | "deal" | "navigation" | "search" | "inbox" | "suggested";

type RuntimeContext = CommandPaletteContextValue & {
  scope: PaletteScope;
  isStaff: boolean;
  userId?: string;
  globalRole?: GlobalRole;
  tenantRole?: TenantRole;
};

type PreviewData = {
  title: string;
  description?: string;
  impact?: string;
  body?: string;
  meta?: Array<{ label: string; value: string }>;
};

type PaletteItem = {
  id: string;
  group: CommandGroup;
  label: string;
  description?: string;
  keywords?: string[];
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  preview?: (ctx: RuntimeContext) => PreviewData;
  run: (ctx: RuntimeContext, options?: { keepOpen?: boolean }) => void | Promise<void>;
};

type LastAction = { label: string; timestamp: number; status: "loading" | "success" | "error" };

type ProviderValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  context: CommandPaletteContextValue;
  setContext: (value: CommandPaletteContextValue) => void;
};

const ProviderCtx = createContext<ProviderValue | null>(null);

function useProviderCtx() {
  const ctx = useContext(ProviderCtx);
  if (!ctx) throw new Error("Command palette must be used within CommandPaletteProvider.");
  return ctx;
}

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function fuzzyScore(item: { label: string; description?: string; keywords?: string[] }, query: string) {
  if (!query) return 1;
  const q = normalize(query);
  const label = normalize(item.label);
  const desc = normalize(item.description || "");
  const keywords = normalize((item.keywords || []).join(" "));
  if (label.startsWith(q)) return 120;
  if (label.includes(q)) return 90;
  if (keywords.includes(q)) return 70;
  if (desc.includes(q)) return 50;
  return 0;
}

const DEAL_STAGE_LABELS: Record<string, string> = {
  lead: "prospecto",
  qualified: "calificado",
  proposal: "propuesta",
  won: "ganado",
  lost: "perdido"
};

function dealStageLabel(stage: string) {
  return DEAL_STAGE_LABELS[stage] || stage;
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold underline underline-offset-2">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function splitShortcut(shortcut?: string) {
  return shortcut ? shortcut.split(" ").filter(Boolean) : [];
}

async function patchInbox(conversationId: string, action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch(`/api/app/inbox/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  return response.ok;
}

function actionKey(userId?: string, conversationId?: string | null) {
  return `${userId || "anon"}:${conversationId || "global"}`;
}

export function CommandPaletteProvider({
  children,
  scope,
  tenantId,
  isStaff,
  userId,
  globalRole,
  tenantRole
}: {
  children: ReactNode;
  scope: PaletteScope;
  tenantId?: string;
  isStaff?: boolean;
  userId?: string;
  globalRole?: GlobalRole;
  tenantRole?: TenantRole;
}) {
  const [open, setOpen] = useState(false);
  const [context, setContextState] = useState<CommandPaletteContextValue>({ tenantId });

  const setContext = useCallback((value: CommandPaletteContextValue) => {
    setContextState((prev) => ({ ...prev, ...value }));
  }, []);

  useEffect(() => {
    setContextState((prev) => ({ ...prev, tenantId }));
  }, [tenantId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const openHotkey = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);
      if (openHotkey) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ProviderCtx.Provider value={{ open, setOpen, context, setContext }}>
      {children}
      <CommandPalette scope={scope} isStaff={Boolean(isStaff)} userId={userId} globalRole={globalRole} tenantRole={tenantRole} />
    </ProviderCtx.Provider>
  );
}

export function useCommandPalette() {
  const { open, setOpen, setContext } = useProviderCtx();
  return {
    isOpen: open,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    setContext
  };
}

export function CommandPaletteContextSetter({ value }: { value: CommandPaletteContextValue }) {
  const { setContext } = useProviderCtx();
  useEffect(() => {
    setContext(value);
  }, [setContext, value]);
  return null;
}

export function CommandPalette({
  scope,
  isStaff,
  userId,
  globalRole,
  tenantRole
}: {
  scope: PaletteScope;
  isStaff: boolean;
  userId?: string;
  globalRole?: GlobalRole;
  tenantRole?: TenantRole;
}) {
  const { open, setOpen, context } = useProviderCtx();
  const inbox = useInboxContextOptional();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [subview, setSubview] = useState<Subview>("root");
  const [searchItems, setSearchItems] = useState<PaletteItem[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku?: string; price?: number; stockQty?: number }>>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [lastActions, setLastActions] = useState<Record<string, LastAction>>({});

  const runtime = useMemo<RuntimeContext>(
    () => ({
      ...context,
      conversationId: inbox?.state.conversationId || context.conversationId,
      contactId: inbox?.state.contactId || context.contactId,
      dealId: inbox?.state.dealId || context.dealId,
      scope,
      isStaff,
      userId,
      globalRole,
      tenantRole
    }),
    [context, globalRole, inbox?.state.contactId, inbox?.state.conversationId, inbox?.state.dealId, isStaff, scope, tenantRole, userId]
  );
  const canEdit = canEditWorkspace(runtime);
  const canManage = canManageWorkspace(runtime);
  const canManageTeam = canManageUsers(runtime);

  const mode: PaletteMode = useMemo(() => {
    if (!pathname.startsWith("/app/inbox") && !context.forceInboxMode) return "global";
    if (runtime.conversationId) return "conversation";
    return "inbox";
  }, [context.forceInboxMode, pathname, runtime.conversationId]);

  const lastActionKey = actionKey(runtime.userId, runtime.conversationId);
  const lastAction = lastActions[lastActionKey];

  const setActionStatus = useCallback(
    (label: string, status: LastAction["status"]) => {
      setLastActions((prev) => ({
        ...prev,
        [lastActionKey]: { label, status, timestamp: Date.now() }
      }));
    },
    [lastActionKey]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setSubview("root");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || scope !== "app" || subview !== "root" || query.trim().length < 2) {
      setSearchItems([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const next: PaletteItem[] = [];
        const inboxResponse = await fetch(`/api/app/inbox?filter=all&q=${encodeURIComponent(query)}`);
        if (inboxResponse.ok) {
          const json = await inboxResponse.json();
          (json.conversations || []).slice(0, 5).forEach((row: any) => {
            next.push({
              id: `search-conv-${row.id}`,
              group: "search",
              label: `Conversacion: ${row.contact?.name || "Sin nombre"}`,
              description: row.contact?.phone || row.contact?.email || row.id,
              icon: <Search className="h-4 w-4" />,
              preview: () => ({
                title: `Abrir conversacion`,
                description: row.contact?.name || row.id,
                impact: "Navega al hilo de esta conversacion."
              }),
              run: async () => {
                router.push(`/app/inbox/${row.id}`);
              }
            });
          });
        }

        const catalogResponse = await fetch("/api/app/catalog");
        if (catalogResponse.ok) {
          const json = await catalogResponse.json();
          (json.products || [])
            .filter((p: any) => `${p.name} ${p.sku || ""}`.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .forEach((p: any) => {
              next.push({
                id: `search-product-${p.id}`,
                group: "search",
                label: `Producto: ${p.name}`,
                description: p.sku ? `SKU ${p.sku}` : "Catalogo",
                icon: <Package className="h-4 w-4" />,
                preview: () => ({
                  title: p.name,
                  description: "Producto del catalogo",
                  meta: [
                    { label: "Precio", value: `$${p.price || 0}` },
                    { label: "Stock", value: String(p.stockQty || 0) }
                  ]
                }),
                run: async () => {
                  router.push(`/app/catalog/${p.id}`);
                }
              });
            });
        }
        setSearchItems(next);
      } finally {
        setLoadingSearch(false);
      }
    }, 240);
    return () => clearTimeout(timer);
  }, [open, query, router, scope, subview]);

  useEffect(() => {
    if (!open || subview !== "products" || scope !== "app") return;
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/app/catalog");
      if (!response.ok || cancelled) return;
      const json = await response.json();
      setProducts((json.products || []).slice(0, 50));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, scope, subview]);

  const runInboxAction = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      if (!runtime.conversationId) return false;
      if (inbox?.controls.runAction) return inbox.controls.runAction(action as any, payload || {});
      return patchInbox(runtime.conversationId, action, payload);
    },
    [inbox?.controls, runtime.conversationId]
  );

  const rootItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      {
        id: "nav-inbox",
        group: mode === "inbox" || mode === "conversation" ? "inbox" : "navigation",
        label: "Ir a Inbox",
        description: "/app/inbox",
        icon: <MessageSquare className="h-4 w-4" />,
        shortcut: "G I",
        preview: () => ({ title: "Ir a Inbox", description: "Vista principal de conversaciones." }),
        run: async () => router.push("/app/inbox")
      },
      {
        id: "nav-catalog",
        group: "navigation",
        label: "Ir a Catalogo",
        description: "/app/catalog",
        icon: <Package className="h-4 w-4" />,
        shortcut: "G C",
        preview: () => ({ title: "Ir a Catalogo", description: "Gestion de productos." }),
        run: async () => router.push("/app/catalog")
      },
      {
        id: "nav-orders",
        group: "navigation",
        label: "Ir a Pedidos",
        description: "/app/orders",
        icon: <Package className="h-4 w-4" />,
        preview: () => ({ title: "Ir a Pedidos", description: "Listado operativo de pedidos del portal." }),
        run: async () => router.push("/app/orders")
      },
      ...(canManage ? [{ id: "nav-faq", group: "navigation" as const, label: "Ir a FAQ", description: "/app/faqs", run: async () => router.push("/app/faqs") }] : []),
      ...(canManage ? [{ id: "nav-business", group: "navigation" as const, label: "Ir a Negocio", description: "/app/business", run: async () => router.push("/app/business") }] : []),
      ...(canManageTeam ? [{
        id: "nav-users",
        group: "navigation" as const,
        label: "Ir a Usuarios",
        description: "/app/users",
        icon: <Users className="h-4 w-4" />,
        run: async () => router.push("/app/users")
      }] : []),
      {
        id: "ops-tenants",
        group: "navigation",
        label: "Ir a Clientes",
        description: "/ops/tenants",
        icon: <Building2 className="h-4 w-4" />,
        disabled: !isStaff,
        run: async () => router.push("/ops/tenants")
      },
      {
        id: "ops-dashboard",
        group: "navigation",
        label: "Ir a Dashboard Ops",
        description: "/ops",
        icon: <Shield className="h-4 w-4" />,
        disabled: !isStaff,
        run: async () => router.push("/ops")
      }
    ];

    if (mode === "inbox") {
      items.push(
        {
          id: "inbox-search",
          group: "inbox",
          label: "Buscar conversaciones",
          description: "Escribi nombre, telefono o email",
          preview: () => ({ title: "Buscar conversaciones", description: "Filtra el listado de conversaciones." }),
          run: async () => inputRef.current?.focus()
        },
        {
          id: "inbox-filter-hot",
          group: "inbox",
          label: "Filter Hot",
          preview: () => ({ title: "Filtrar Hot", impact: "Mostrara solo conversaciones prioritarias." }),
          run: async () => inbox?.controls.applyFilter?.("hot")
        },
        {
          id: "inbox-filter-unreplied",
          group: "inbox",
          label: "Filter Unreplied",
          preview: () => ({ title: "Filtrar sin responder", impact: "Mostrara solo conversaciones pendientes." }),
          run: async () => inbox?.controls.applyFilter?.("sin_responder")
        },
        {
          id: "inbox-filter-assigned",
          group: "inbox",
          label: "Filter Assigned to me",
          preview: () => ({ title: "Filtrar asignadas", impact: "Mostrara conversaciones asignadas al usuario actual." }),
          run: async () => inbox?.controls.applyFilter?.("asignadas")
        },
        {
          id: "inbox-only-unread",
          group: "inbox",
          label: "Alternar solo no leidas",
          preview: () => ({ title: "Solo no leidas", impact: "Alterna vista para enfocarte en pendientes." }),
          run: async () => inbox?.controls.toggleOnlyUnread?.()
        }
      );
    }

    if (mode === "conversation" && runtime.conversationId) {
      items.push(
        {
          id: "conv-toggle-bot",
          group: "conversation",
          label: inbox?.state.botEnabled ? "Desactivar bot" : "Activar bot",
          description: "Alternar bot automatico",
          disabled: !canEdit,
          preview: () => ({
            title: inbox?.state.botEnabled ? "Apagar bot" : "Encender bot",
            description: "Control de automatizacion en esta conversacion.",
            impact: inbox?.state.botEnabled
              ? "Esto apagara el bot en esta conversacion."
              : "Esto encendera el bot en esta conversacion."
          }),
          run: async () => {
            const ok = await runInboxAction("toggle_bot", { botEnabled: !inbox?.state.botEnabled });
            if (!ok) throw new Error("toggle_bot_failed");
          }
        },
        {
          id: "conv-handoff",
          group: "conversation",
          label: "Handoff a humano",
          description: "Bot OFF y asignar a usuario actual",
          disabled: !canEdit,
          preview: () => ({
            title: "Derivar a humano",
            impact: "Apagara el bot y asignara la conversacion al agente actual."
          }),
          run: async (ctx) => {
            const botOk = await runInboxAction("toggle_bot", { botEnabled: false });
            if (!botOk) throw new Error("handoff_toggle_failed");
            if (ctx.userId) {
              const assignOk = await runInboxAction("assign", { assignedTo: ctx.userId });
              if (!assignOk) throw new Error("handoff_assign_failed");
            }
          }
        },
        {
          id: "conv-assign-me",
          group: "conversation",
          label: "Asignarme",
          description: "Asignar conversacion al usuario actual",
          disabled: !canEdit,
          preview: () => ({ title: "Asignar a mi usuario", impact: "La conversacion quedara bajo tu responsabilidad." }),
          run: async (ctx) => {
            if (!ctx.userId) throw new Error("missing_user");
            const ok = await runInboxAction("assign", { assignedTo: ctx.userId });
            if (!ok) throw new Error("assign_failed");
          }
        },
        {
          id: "conv-reassign",
          group: "conversation",
          label: "Reassign...",
          description: "Asignar por ID de usuario",
          disabled: !canEdit,
          preview: () => ({ title: "Reasignar conversacion", description: "Solicitara un ID de usuario destino." }),
          run: async () => {
            const value = window.prompt("User ID destino:");
            if (!value) return;
            const ok = await runInboxAction("assign", { assignedTo: value });
            if (!ok) throw new Error("reassign_failed");
          }
        },
        {
          id: "conv-hot-toggle",
          group: "conversation",
          label: inbox?.state.isHot ? "Unmark Hot" : "Mark Hot",
          disabled: !canEdit,
          preview: () => ({
            title: inbox?.state.isHot ? "Quitar prioridad Hot" : "Marcar prioridad Hot",
            impact: "Actualiza la prioridad de la conversacion en la bandeja."
          }),
          run: async () => {
            const ok = await runInboxAction(inbox?.state.isHot ? "unmark_hot" : "mark_hot");
            if (!ok) throw new Error("hot_failed");
          }
        }
      );

      items.push(
        {
          id: "conv-close-toggle",
          group: "conversation",
          label: "Cerrar conversacion",
          disabled: !canEdit,
          preview: () => ({ title: "Cerrar conversacion", impact: "La conversacion pasara a estado cerrado." }),
          run: async () => {
            const ok = await runInboxAction("close");
            if (!ok) throw new Error("close_failed");
          }
        },
        {
          id: "conv-reopen",
          group: "conversation",
          label: "Reabrir conversacion",
          disabled: !canEdit,
          preview: () => ({ title: "Reabrir conversacion", impact: "La conversacion volvera a estado abierto." }),
          run: async () => {
            const ok = await runInboxAction("reopen");
            if (!ok) throw new Error("reopen_failed");
          }
        },
        {
          id: "conv-unread-toggle",
          group: "conversation",
          label: (inbox?.state.unreadCount ?? 0) > 0 ? "Mark as read" : "Mark as unread",
          disabled: !canEdit,
          preview: () => ({
            title: (inbox?.state.unreadCount ?? 0) > 0 ? "Marcar como leida" : "Marcar como no leida",
            impact: "Actualiza el estado de lectura para priorizacion."
          }),
          run: async () => {
            const ok = await runInboxAction((inbox?.state.unreadCount ?? 0) > 0 ? "mark_read" : "mark_unread");
            if (!ok) throw new Error("read_state_failed");
          }
        },
        {
          id: "msg-templates",
          group: "messaging",
          label: "Enviar plantilla...",
          disabled: !canEdit,
          preview: () => ({ title: "Enviar plantilla", description: "Abrira una lista de respuestas rapidas." }),
          run: async () => setSubview("templates")
        },
        {
          id: "msg-products",
          group: "messaging",
          label: "Insert product...",
          disabled: !canEdit,
          preview: () => ({ title: "Insertar producto", description: "Abrira el catalogo para seleccionar producto." }),
          run: async () => setSubview("products")
        },
        {
          id: "msg-request-email",
          group: "messaging",
          label: "Request email",
          disabled: !canEdit,
          preview: () => ({ title: "Solicitar email", body: "Para avanzar, compartime un email de contacto." }),
          run: async () => {}
        },
        {
          id: "msg-request-address",
          group: "messaging",
          label: "Request address",
          disabled: !canEdit,
          preview: () => ({ title: "Solicitar direccion", body: "Podrias compartir direccion completa para validar envio?" }),
          run: async () => {}
        },
        {
          id: "msg-request-budget",
          group: "messaging",
          label: "Request budget",
          disabled: !canEdit,
          preview: () => ({ title: "Solicitar presupuesto", body: "Que presupuesto estimado tenes para esta compra?" }),
          run: async () => {}
        },
        {
          id: "contact-note",
          group: "contact",
          label: "Add note...",
          disabled: !canEdit,
          preview: () => ({ title: "Agregar nota", description: "Abrira un input rapido para nota interna." }),
          run: async () => {
            const text = window.prompt("Texto de nota:");
            if (!text) return;
            const ok = await runInboxAction("add_note", { text });
            if (!ok) throw new Error("note_failed");
          }
        },
        {
          id: "contact-task",
          group: "contact",
          label: "Create task...",
          disabled: !canEdit,
          preview: () => ({ title: "Crear tarea", description: "Abrira input rapido de tarea." }),
          run: async () => {
            const title = window.prompt("Titulo de tarea:");
            if (!title) return;
            const ok = await runInboxAction("add_task", { title });
            if (!ok) throw new Error("task_failed");
          }
        },
        {
          id: "deal-stage",
          group: "deal",
          label: "Mover etapa...",
          disabled: !runtime.dealId || !canEdit,
          preview: () => ({ title: "Mover etapa", description: "Abrira el selector de etapa del deal actual." }),
          run: async () => setSubview("stages")
        },
        {
          id: "deal-won",
          group: "deal",
          label: "Marcar como ganado",
          disabled: !runtime.dealId || !canEdit,
          preview: () => ({ title: "Marcar como ganado", impact: "El deal quedara cerrado como ganado." }),
          run: async () => {
            const ok = await runInboxAction("change_stage", { stage: "won" });
            if (!ok) throw new Error("won_failed");
          }
        },
        {
          id: "deal-lost",
          group: "deal",
          label: "Marcar como perdido",
          disabled: !runtime.dealId || !canEdit,
          preview: () => ({ title: "Marcar como perdido", impact: "El deal quedara cerrado como perdido." }),
          run: async () => {
            const ok = await runInboxAction("change_stage", { stage: "lost" });
            if (!ok) throw new Error("lost_failed");
          }
        }
      );
    }

    if (scope === "ops") return items.filter((item) => item.group === "navigation");

    const live = inbox?.state.autoSuggestions || [];
    if (live.length) {
      live.forEach((suggestion) => {
        items.push({
          id: `suggested-${suggestion.type}-${suggestion.id}`,
          group: "suggested",
          label:
            suggestion.type === "template"
              ? `Plantilla sugerida: ${suggestion.label}`
              : suggestion.type === "product"
                ? `Producto sugerido: ${suggestion.label}`
                : `Accion sugerida: ${suggestion.label}`,
          description: `Puntaje ${suggestion.score}`,
          preview: () => ({
            title: suggestion.label,
            description: "Sugerencia por ultimo mensaje inbound.",
            impact: "Resultado sugerido automaticamente por matching de tags."
          }),
          run: async () => {
            if (suggestion.type === "template" && suggestion.text) {
              inbox?.controls.setSearch?.(suggestion.label);
              toast.success("Plantilla sugerida lista para usar");
            } else if (suggestion.type === "product") {
              toast.success("Producto sugerido", suggestion.label);
            } else {
              toast.success("Accion sugerida", suggestion.label);
            }
          }
        });
      });
    }

    return items;
  }, [
    inbox?.controls,
    inbox?.state.botEnabled,
    inbox?.state.isHot,
    inbox?.state.unreadCount,
    canEdit,
    canManage,
    canManageTeam,
    isStaff,
    mode,
    router,
    runInboxAction,
    runtime.contactId,
    runtime.conversationId,
    runtime.dealId,
    scope,
    inbox?.state.autoSuggestions
  ]);

  const subviewItems = useMemo<PaletteItem[]>(() => {
    if (subview === "templates") {
      const templates = [
        { id: "tpl-greeting", label: "Saludo inicial", body: "Hola, gracias por escribirnos. Te respondo en breve." },
        { id: "tpl-pricing", label: "Consulta de precio", body: "Te paso precio y stock actualizado en este momento." },
        { id: "tpl-delivery", label: "Consulta envio", body: "Confirmame zona para cotizar envio y tiempos." }
      ];
      return templates.map((tpl) => ({
        id: tpl.id,
        group: "messaging",
        label: tpl.label,
        description: "Plantilla",
        preview: () => ({
          title: tpl.label,
          description: "Vista previa de la plantilla",
          body: tpl.body,
          impact: "Insertara este mensaje en el composer."
        }),
        run: async () => {}
      }));
    }

    if (subview === "products") {
      return products.map((product) => ({
        id: `prod-${product.id}`,
        group: "messaging",
        label: product.name,
        description: product.sku ? `SKU ${product.sku}` : "Producto",
        preview: () => ({
          title: product.name,
          description: "Producto del catalogo",
          meta: [
            { label: "Precio", value: `$${product.price || 0}` },
            { label: "Stock", value: String(product.stockQty || 0) }
          ],
          impact: "Insertara informacion del producto en la conversacion."
        }),
        run: async () => {}
      }));
    }

    if (subview === "stages") {
      return ["lead", "qualified", "proposal", "won", "lost"].map((stage) => ({
        id: `stage-${stage}`,
        group: "deal",
        label: `Mover a ${dealStageLabel(stage)}`,
        preview: () => ({
          title: "Cambio de etapa",
          description: `Mover a: ${dealStageLabel(stage)}`,
          impact: "Actualizara el pipeline del deal asociado."
        }),
        run: async () => {
          const ok = await runInboxAction("change_stage", { stage });
          if (!ok) throw new Error("stage_failed");
        }
      }));
    }

    return [];
  }, [products, runInboxAction, subview]);

  const sourceItems = subview === "root" ? [...rootItems, ...searchItems] : subviewItems;
  const filteredItems = useMemo(
    () =>
      sourceItems
        .map((item) => ({ ...item, score: fuzzyScore(item, query) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score),
    [query, sourceItems]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredItems.length, query, subview]);

  const executeItem = useCallback(
    async (item: PaletteItem, options?: { keepOpen?: boolean }) => {
      const keepOpen = Boolean(options?.keepOpen);
      setActionStatus(item.label, "loading");
      try {
        await item.run(runtime, { keepOpen });
        setActionStatus(item.label, "success");
        if (item.group !== "navigation" && item.group !== "search") toast.success("Accion aplicada");
        if (!keepOpen && subview === "root") setOpen(false);
      } catch {
        setActionStatus(item.label, "error");
        toast.error("No se pudo aplicar, reintenta");
      }
    },
    [runtime, setActionStatus, setOpen, subview]
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(filteredItems.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = filteredItems[activeIndex];
        if (!item || item.disabled) return;
        void executeItem(item, { keepOpen: event.shiftKey });
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (subview !== "root") setSubview("root");
        else setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, executeItem, filteredItems, open, setOpen, subview]);

  const grouped = useMemo(() => {
    const map = new Map<CommandGroup, typeof filteredItems>();
    filteredItems.forEach((item) => {
      const bucket = map.get(item.group) || [];
      bucket.push(item);
      map.set(item.group, bucket);
    });
    return map;
  }, [filteredItems]);

  const groupOrder: CommandGroup[] = ["suggested", "conversation", "messaging", "contact", "deal", "inbox", "navigation", "search"];
  const groupLabel: Record<CommandGroup, string> = {
    suggested: "Sugeridas (ultimo inbound)",
    conversation: "Acciones de conversacion",
    messaging: "Acciones de mensajes",
    contact: "Acciones del contacto",
    deal: "Acciones del deal / pipeline",
    inbox: "Modo inbox",
    navigation: "Navegacion",
    search: "Busqueda"
  };

  const activeItem = filteredItems[activeIndex];
  const preview = activeItem?.preview?.(runtime);
  let flat = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-[900px] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-popover p-0 shadow-xl">
        {mode === "conversation" ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--border)] px-3 py-2">
            <Badge variant="muted">Conversacion: {inbox?.state.contactName || inbox?.state.contactPhone || runtime.conversationId}</Badge>
            {inbox?.state.intent ? <Badge variant="outline">Intencion: {inbox.state.intent}</Badge> : null}
            {inbox?.state.stage ? <Badge variant="outline">Etapa: {dealStageLabel(inbox.state.stage)}</Badge> : null}
            <Badge variant={inbox?.state.botEnabled ? "success" : "warning"}>Bot {inbox?.state.botEnabled ? "activo" : "pausado"}</Badge>
          </div>
        ) : null}

        <div className="border-b border-[color:var(--border)] p-3">
          {subview !== "root" ? (
            <button
              type="button"
              onClick={() => setSubview("root")}
              className="mb-2 rounded-xl border border-[color:var(--border)] px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
            >
              Back
            </button>
          ) : null}
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={subview === "root" ? "Buscar comandos..." : "Buscar en subvista..."}
            className="h-11 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
          />
        </div>

        <div className={cn("p-2", mode === "conversation" ? "grid grid-cols-1 gap-2 md:grid-cols-[1fr_320px]" : "") }>
          <div role="listbox" aria-label="Command palette results" className="max-h-[420px] overflow-y-auto">
            {loadingSearch ? <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p> : null}
            {!loadingSearch && filteredItems.length === 0 ? (
              <EmptyState className="min-h-[140px]" title="Sin resultados" description="Proba otros terminos." icon="[]" />
            ) : null}

            {groupOrder.map((group) => {
              const items = grouped.get(group);
              if (!items?.length) return null;
              return (
                <div key={group} className="mb-2">
                  <p className="px-3 py-2 text-xs text-muted-foreground">{groupLabel[group]}</p>
                  <div className="space-y-1">
                    {items.map((item) => {
                      flat += 1;
                      const active = flat === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          disabled={item.disabled}
                          onMouseEnter={() => setActiveIndex(flat)}
                          onClick={() => {
                            if (!item.disabled) void executeItem(item, { keepOpen: false });
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left outline-none transition-colors",
                            "hover:bg-muted focus:bg-muted",
                            active ? "bg-muted" : "",
                            item.disabled ? "opacity-50" : ""
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{highlight(item.label, query)}</p>
                            {item.description ? <p className="text-xs text-muted-foreground">{highlight(item.description, query)}</p> : null}
                          </div>
                          <div className="ml-3 flex items-center gap-1">
                            {item.icon ? <span className="text-muted-foreground">{item.icon}</span> : null}
                            {splitShortcut(item.shortcut).map((key) => (
                              <Kbd key={`${item.id}-${key}`}>{key}</Kbd>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {mode === "conversation" ? (
            <aside className="hidden h-full min-h-[240px] rounded-2xl border border-[color:var(--border)] bg-card p-3 md:block">
              {preview ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{preview.title}</h3>
                  {preview.description ? <p className="text-xs text-muted-foreground">{preview.description}</p> : null}
                  {preview.impact ? (
                    <div>
                      <p className="text-xs font-medium">Impacto</p>
                      <p className="text-xs text-muted-foreground">{preview.impact}</p>
                    </div>
                  ) : null}
                  {preview.body ? <p className="line-clamp-6 text-xs text-muted-foreground">{preview.body}</p> : null}
                  {preview.meta?.length ? (
                    <div className="space-y-1">
                      {preview.meta.map((meta) => (
                        <div key={`${meta.label}-${meta.value}`} className="flex justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{meta.label}</span>
                          <span>{meta.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                  Selecciona un comando para ver preview.
                </div>
              )}
            </aside>
          ) : null}
        </div>

        <div className="border-t border-[color:var(--border)] px-3 py-2 text-xs text-muted-foreground">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd><span>Navegar</span></div>
            <div className="flex items-center gap-1"><Kbd>Enter</Kbd><span>Ejecutar</span></div>
            <div className="flex items-center gap-1"><Kbd>Shift</Kbd><Kbd>Enter</Kbd><span>Ejecutar y mantener abierto</span></div>
            <div className="flex items-center gap-1"><Kbd>Esc</Kbd><span>{subview === "root" ? "Cerrar" : "Volver"}</span></div>
          </div>
          <p>
            {lastAction
              ? lastAction.status === "error"
                ? `Ultima accion fallo: ${lastAction.label}`
                : `Ultima accion: ${lastAction.label} · ${timeAgo(lastAction.timestamp)}`
              : "Ultima accion: sin historial"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
