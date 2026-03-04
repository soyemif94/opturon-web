"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { formatDate } from "@/lib/ui/format";

type TenantRow = {
  id: string;
  name: string;
  industry: string;
  status: string;
  daysActive: number;
  crm: string;
  salesTeamSize: number;
  lastActivityAt: string;
  healthScore: number;
  healthStatus: "verde" | "amarillo" | "rojo";
};

export function TenantsDataTable({ rows }: { rows: TenantRow[] }) {
  const router = useRouter();

  const statusFilters = useMemo(
    () => [
      { label: "Activos", value: "active" },
      { label: "Trial", value: "trial" },
      { label: "En riesgo", value: "at_risk" },
      { label: "Cancelados", value: "cancelled" }
    ],
    []
  );

  return (
    <DataTable
      columns={[
        { key: "name", header: "Empresa", sortable: true, cell: (row) => <span className="font-medium">{row.name}</span> },
        { key: "industry", header: "Rubro", sortable: true },
        {
          key: "status",
          header: "Estado",
          sortable: true,
          cell: (row) => <Badge variant="muted">{row.status}</Badge>
        },
        { key: "daysActive", header: "Dias activos", sortable: true },
        { key: "crm", header: "CRM", sortable: true },
        { key: "salesTeamSize", header: "Equipo", sortable: true },
        {
          key: "lastActivityAt",
          header: "Ult. actividad",
          sortable: true,
          cell: (row) => (row.lastActivityAt ? formatDate(row.lastActivityAt) : "-")
        },
        {
          key: "healthScore",
          header: "Health",
          sortable: true,
          cell: (row) => (
            <Badge variant={row.healthStatus === "verde" ? "success" : row.healthStatus === "amarillo" ? "warning" : "danger"}>
              {row.healthStatus} ({row.healthScore})
            </Badge>
          )
        }
      ]}
      data={rows}
      rowKey={(row) => row.id}
      initialSort={{ key: "healthScore", dir: "desc" }}
      filters={[{ key: "status", label: "Estado", options: statusFilters }]}
      searchPlaceholder="Buscar empresa o rubro"
      searchKeys={["name", "industry"]}
      stickyHeader
      onRowClick={(row) => router.push(`/ops/tenants/${row.id}`)}
      renderRowActions={(row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                ...
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/ops/tenants/${row.id}`)}>Abrir ficha</DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await navigator.clipboard.writeText(row.id);
                toast.success("Tenant ID copiado");
              }}
            >
              Copiar tenant_id
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/app?demo=1&tenantId=${row.id}`)}>Ver portal demo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  );
}
