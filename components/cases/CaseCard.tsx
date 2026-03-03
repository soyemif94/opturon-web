import Link from "next/link";
import { GlowCard } from "@/components/ui/GlowCard";
import type { CaseItem } from "@/lib/cases";

export function CaseCard({ item }: { item: CaseItem }) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold">{item.title}</h2>
      <p className="mt-2 text-sm text-muted">{item.summary}</p>
      <Link href={`/casos/${item.slug}`} className="mt-5 inline-flex text-sm font-medium text-brandBright transition hover:text-brand">
        Ver caso tipo →
      </Link>
    </GlowCard>
  );
}

