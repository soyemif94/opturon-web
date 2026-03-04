import { InboxContextProvider } from "@/components/inbox/inbox-context";

export default function AppInboxLayout({ children }: { children: React.ReactNode }) {
  return <InboxContextProvider>{children}</InboxContextProvider>;
}

