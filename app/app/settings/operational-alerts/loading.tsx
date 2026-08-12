import { Skeleton } from "@/components/ui/skeleton";

export default function OperationalAlertsLoading() {
  return (
    <div className="space-y-5" aria-label="Cargando alertas operativas" aria-busy="true">
      <Skeleton className="h-48 rounded-[28px]" />
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}
