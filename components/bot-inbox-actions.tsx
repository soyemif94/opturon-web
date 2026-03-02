"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BotInboxActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function clearInbox() {
    setLoading(true);
    try {
      await fetch("/api/bot/inbox/clear", { method: "POST" });
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => router.refresh()}>Refresh</Button>
      <Button variant="secondary" size="sm" onClick={clearInbox} disabled={loading}>
        {loading ? "Clearing..." : "Clear inbox"}
      </Button>
    </div>
  );
}
