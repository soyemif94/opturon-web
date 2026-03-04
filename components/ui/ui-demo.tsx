"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { useCommandPalette } from "@/components/ui/command-palette";
import { CommandPopover, Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonLine } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

const templateItems = [
  { id: "t1", label: "Saludo", description: "Hola, gracias por escribir a Opturon." },
  { id: "t2", label: "Seguimiento", description: "Te contacto para continuar con la propuesta." },
  { id: "t3", label: "Cierre", description: "Queres que avancemos con implementacion?" }
];

const demoRows = [
  { id: "r1", name: "Acme SRL", status: "active", owner: "Maria", createdAt: "2026-03-01T10:20:00.000Z" },
  { id: "r2", name: "Nordic Labs", status: "trial", owner: "Juan", createdAt: "2026-02-25T12:10:00.000Z" },
  { id: "r3", name: "ClinicOne", status: "at_risk", owner: "Carla", createdAt: "2026-01-20T08:45:00.000Z" }
];

export function UiDemo({ scope }: { scope: "app" | "ops" }) {
  const palette = useCommandPalette();
  const [tab, setTab] = useState("kit");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mockInbox, setMockInbox] = useState(false);
  const [mockConversation, setMockConversation] = useState(false);

  const filteredTemplates = useMemo(
    () => templateItems.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase().trim())),
    [query]
  );

  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">UI Demo - {scope.toUpperCase()}</h1>
          <p className="text-xs text-muted">Validacion visual del UI kit base para SaaS.</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted">
          <span>Abrir buscador</span>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox Command Palette</CardTitle>
          <CardDescription>QA de modo global/inbox/conversation.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              palette.setContext({
                forceInboxMode: mockInbox || mockConversation,
                conversationId: mockConversation ? "conv_demo_01" : undefined,
                contactId: mockConversation ? "contact_demo_01" : undefined,
                dealId: mockConversation ? "deal_demo_01" : undefined
              });
              palette.open();
            }}
          >
            Open Command Palette
          </Button>
          <Button variant={mockInbox ? "primary" : "secondary"} onClick={() => setMockInbox((prev) => !prev)}>
            Mock inbox mode
          </Button>
          <Button variant={mockConversation ? "primary" : "secondary"} onClick={() => setMockConversation((prev) => !prev)}>
            Mock conversation mode
          </Button>
          <div className="text-xs text-muted">
            Hotkey: <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> / <Kbd>Cmd</Kbd> + <Kbd>K</Kbd>
          </div>
          <div className="w-full text-xs text-muted">
            Comandos base y contextuales: inbox filters, toggle bot, assign, hot, close, templates, products y stages.
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="kit">Componentes</TabsTrigger>
          <TabsTrigger value="table">DataTable</TabsTrigger>
          <TabsTrigger value="states">Estados</TabsTrigger>
        </TabsList>

        <TabsContent value="kit" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader action={<Badge variant="outline">Card action</Badge>}>
              <CardTitle>Card + forms + toast</CardTitle>
              <CardDescription>Base visual shared en Inbox / App / Ops.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="muted">Muted</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => toast.success("Guardado", "Los cambios se aplicaron correctamente.")}>Toast success</Button>
                <Button variant="destructive" onClick={() => toast.error("Error de guardado", "Reintenta en unos segundos.")}>
                  Toast error
                </Button>
                <Button variant="secondary" onClick={() => toast.loading("Sincronizando...", "Conectando con API.")}>
                  Toast loading
                </Button>
              </div>

              <div className="grid gap-2">
                <Input placeholder="Input base" />
                <Textarea placeholder="Textarea base" />
              </div>
            </CardContent>
            <CardFooter className="flex-wrap">
              <Popover>
                <PopoverTrigger>Templates</PopoverTrigger>
                <PopoverContent>
                  <CommandPopover
                    value={query}
                    onValueChange={setQuery}
                    items={filteredTemplates}
                    onSelect={(id) => toast.success("Template seleccionado", id)}
                  />
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">Acciones</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Atajos</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => toast.success("Duplicado")}>Duplicar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.success("Archivado")}>Archivar</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.error("Eliminado")}>Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost">Abrir dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar pipeline</DialogTitle>
                  <DialogDescription>Usar modal para formularios y ajustes criticos.</DialogDescription>
                  </DialogHeader>
                  <div className="mt-3 space-y-2">
                    <Input placeholder="Nombre" />
                    <Textarea placeholder="Notas internas" />
                  </div>
                  <DialogFooter>
                    <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setDialogOpen(false)}>Guardar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Eliminar registro"
                description="Esta accion no se puede deshacer."
                variant="destructive"
                onConfirm={() => {
                  toast.success("Registro eliminado");
                }}
                trigger={<Button variant="destructive">Confirm dialog</Button>}
              />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skeleton</CardTitle>
              <CardDescription>Placeholders de carga consistentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <SkeletonAvatar />
                <div className="w-full space-y-2">
                  <SkeletonLine className="w-2/5" />
                  <SkeletonLine className="w-4/5" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
              <SkeletonCard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <DataTable
            columns={[
              { key: "name", header: "Cliente", sortable: true, cell: (row) => <span className="font-medium">{row.name}</span> },
              { key: "status", header: "Estado", sortable: true },
              { key: "owner", header: "Owner", sortable: true },
              { key: "createdAt", header: "Alta", sortable: true }
            ]}
            data={demoRows}
            rowKey={(row) => row.id}
            initialSort={{ key: "createdAt", dir: "desc" }}
            filters={[
              {
                key: "status",
                label: "Estado",
                options: [
                  { label: "Active", value: "active" },
                  { label: "Trial", value: "trial" },
                  { label: "At risk", value: "at_risk" }
                ]
              }
            ]}
            searchPlaceholder="Buscar cliente"
            searchKeys={["name", "owner"]}
            stickyHeader
            onRowClick={(row) => toast.success("Fila seleccionada", row.name)}
            renderRowActions={(row) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    ...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast.success("Abrir", row.name)}>Abrir</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.success("Editar", row.name)}>Editar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        <TabsContent value="states" className="mt-4">
          <EmptyState
            icon="[]"
            title="No hay resultados"
            description="Esta vista se usa para estados vacios en Inbox y paneles."
            action={{ label: "Crear registro", onClick: () => toast.success("Accion disparada") }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
