"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type InboxFilterKey = "all" | "hot" | "sin_responder" | "nuevas" | "asignadas";

export type InboxContextState = {
  tenantId?: string;
  conversationId: string | null;
  contactId: string | null;
  dealId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  intent: string | null;
  stage: string | null;
  botEnabled: boolean | null;
  assignedTo: string | null;
  isHot: boolean;
  lastMessageAt: string | null;
  unreadCount: number;
  liveSuggestions: Array<{ type: "template" | "product" | "action"; id: string; label: string; score: number; text?: string }>;
  autoSuggestions: Array<{ type: "template" | "product" | "action"; id: string; label: string; score: number; text?: string }>;
};

type InboxAction =
  | "toggle_bot"
  | "assign"
  | "mark_hot"
  | "unmark_hot"
  | "close"
  | "reopen"
  | "mark_read"
  | "mark_unread"
  | "add_note"
  | "add_task"
  | "change_stage";

type InboxActionRunner = (
  action: InboxAction,
  payload?: Record<string, unknown>,
  options?: { keepOpen?: boolean }
) => Promise<boolean>;

type InboxControls = {
  runAction?: InboxActionRunner;
  applyFilter?: (filter: InboxFilterKey) => void;
  toggleOnlyUnread?: () => void;
  setSearch?: (query: string) => void;
  openConversation?: (conversationId: string) => void;
};

type InboxContextValue = {
  state: InboxContextState;
  controls: InboxControls;
  setState: (value: Partial<InboxContextState>) => void;
  setControls: (value: Partial<InboxControls>) => void;
  clearControls: () => void;
};

const initialState: InboxContextState = {
  tenantId: undefined,
  conversationId: null,
  contactId: null,
  dealId: null,
  contactName: null,
  contactPhone: null,
  intent: null,
  stage: null,
  botEnabled: null,
  assignedTo: null,
  isHot: false,
  lastMessageAt: null,
  unreadCount: 0
  ,
  liveSuggestions: [],
  autoSuggestions: []
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxContextProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<InboxContextState>(initialState);
  const [controls, setControlsRaw] = useState<InboxControls>({});

  const setState = useCallback((value: Partial<InboxContextState>) => {
    setStateRaw((prev) => ({ ...prev, ...value }));
  }, []);

  const setControls = useCallback((value: Partial<InboxControls>) => {
    setControlsRaw((prev) => ({ ...prev, ...value }));
  }, []);

  const clearControls = useCallback(() => {
    setControlsRaw({});
  }, []);

  const value = useMemo(
    () => ({
      state,
      controls,
      setState,
      setControls,
      clearControls
    }),
    [clearControls, controls, setControls, setState, state]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInboxContext() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInboxContext must be used inside InboxContextProvider.");
  return ctx;
}

export function useInboxContextOptional() {
  return useContext(InboxContext);
}
