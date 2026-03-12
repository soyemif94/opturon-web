import { OpsInboxWorkspace } from "@/components/ops/ops-inbox-workspace";
import { requireOpsPage } from "@/lib/saas/access";
import { listInboxConversations, readSaasData } from "@/lib/saas/store";

export default async function OpsInboxPage() {
  await requireOpsPage();
  const data = readSaasData();

  const realItems = data.tenants.flatMap((tenant) => {
    const conversations = listInboxConversations(tenant.id);
    return conversations.map((conversation, index) => ({
      id: `ops-${conversation.id}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
      contactName: conversation.contact?.name || "Sin nombre",
      contactPhone: conversation.contact?.phone,
      status:
        conversation.priority === "hot"
          ? ("urgente" as const)
          : conversation.status === "new"
            ? ("nueva" as const)
            : conversation.status === "closed"
              ? ("resuelta" as const)
              : conversation.unreadCount > 0
                ? ("esperando respuesta" as const)
                : ("activa" as const),
      attention: conversation.assignedTo ? ("humano" as const) : conversation.botEnabled ? ("bot" as const) : ("derivada" as const),
      unreadCount: conversation.unreadCount,
      priority: conversation.priority,
      slaMinutes: conversation.slaMinutes,
      lastMessageAt: conversation.lastMessageAt,
      lastMessagePreview:
        conversation.lastMessagePreview ||
        (conversation.priority === "hot"
          ? "Lead de alta prioridad en seguimiento comercial."
          : "Conversacion activa supervisada desde operaciones."),
      channelStatus: conversation.slaMinutes > 90 ? ("warning" as const) : ("ok" as const),
      assignedTo: conversation.assignedTo ? "Equipo comercial" : index % 2 === 0 ? undefined : "Mesa Ops",
      leadStage: conversation.deal?.stage || "lead",
      tags:
        conversation.contact?.tags && conversation.contact.tags.length > 0
          ? conversation.contact.tags
          : conversation.priority === "hot"
            ? ["lead caliente", "presupuesto"]
            : ["soporte"],
      alerts:
        conversation.slaMinutes > 90
          ? ["SLA en riesgo para esta conversacion"]
          : conversation.priority === "hot"
            ? ["Lead caliente requiere seguimiento humano"]
            : [],
      notes: [
        {
          id: `note-${conversation.id}`,
          text: `Seguimiento supervisor sobre la cuenta ${tenant.name}.`,
          createdAt: new Date().toISOString()
        }
      ],
      messages: [
        ...(conversation.contact
          ? [
              {
                id: `m1-${conversation.id}`,
                direction: "inbound" as const,
                text: conversation.lastMessagePreview || "Necesito ayuda con el canal y el seguimiento comercial.",
                timestamp: conversation.lastMessageAt
              }
            ]
          : []),
        {
          id: `m2-${conversation.id}`,
          direction: "system" as const,
          text: conversation.priority === "hot" ? "Supervisor detecto lead caliente y riesgo de SLA." : "Operacion monitoreando bot y atencion humana.",
          timestamp: new Date(new Date(conversation.lastMessageAt).getTime() + 2 * 60 * 1000).toISOString()
        },
        {
          id: `m3-${conversation.id}`,
          direction: "outbound" as const,
          text: "Equipo Ops listo para intervenir y reasignar si la conversacion lo requiere.",
          timestamp: new Date(new Date(conversation.lastMessageAt).getTime() + 6 * 60 * 1000).toISOString()
        }
      ]
    }));
  });

  const syntheticItems = [
    {
      id: "synthetic-tenant-support",
      tenantId: "tenant-demo-support",
      tenantName: "Clinica Norte",
      tenantStatus: "active",
      contactName: "Laura Benitez",
      contactPhone: "+54 9 11 5555 1020",
      status: "esperando respuesta" as const,
      attention: "derivada" as const,
      unreadCount: 3,
      priority: "normal" as const,
      slaMinutes: 58,
      lastMessageAt: new Date(Date.now() - 58 * 60 * 1000).toISOString(),
      lastMessagePreview: "Necesito confirmar si mi turno sigue agendado para hoy.",
      channelStatus: "warning" as const,
      assignedTo: undefined,
      leadStage: "qualified",
      tags: ["turno", "soporte"],
      alerts: ["SLA en riesgo", "Sin asignar"],
      notes: [
        {
          id: "synthetic-note-1",
          text: "Cliente sensible. Revisar demora antes de fin de hora.",
          createdAt: new Date().toISOString()
        }
      ],
      messages: [
        {
          id: "synthetic-msg-1",
          direction: "inbound" as const,
          text: "Necesito confirmar si mi turno sigue agendado para hoy.",
          timestamp: new Date(Date.now() - 58 * 60 * 1000).toISOString()
        },
        {
          id: "synthetic-msg-2",
          direction: "system" as const,
          text: "Alerta supervisor: SLA en riesgo y conversacion sin owner asignado.",
          timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      id: "synthetic-channel-error",
      tenantId: "tenant-demo-commerce",
      tenantName: "Optica Central",
      tenantStatus: "trial",
      contactName: "Nicolas Ruiz",
      contactPhone: "+54 9 291 400 3321",
      status: "urgente" as const,
      attention: "bot" as const,
      unreadCount: 1,
      priority: "hot" as const,
      slaMinutes: 14,
      lastMessageAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      lastMessagePreview: "El bot no me esta respondiendo y necesito precio ahora.",
      channelStatus: "error" as const,
      assignedTo: "Mesa Ops",
      leadStage: "proposal",
      tags: ["presupuesto", "urgente", "lead caliente"],
      alerts: ["Canal con error", "Incidencia abierta sobre automatizacion"],
      notes: [
        {
          id: "synthetic-note-2",
          text: "Escalar a equipo de canales si persiste el error de conexion.",
          createdAt: new Date().toISOString()
        }
      ],
      messages: [
        {
          id: "synthetic-msg-3",
          direction: "inbound" as const,
          text: "El bot no me esta respondiendo y necesito precio ahora.",
          timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString()
        },
        {
          id: "synthetic-msg-4",
          direction: "system" as const,
          text: "Incidencia detectada: canal con error y fallback a supervision manual.",
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        },
        {
          id: "synthetic-msg-5",
          direction: "outbound" as const,
          text: "Supervisor intervenido. Se deriva a comercial para responder manualmente.",
          timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString()
        }
      ]
    }
  ];

  const items = [...syntheticItems, ...realItems].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return <OpsInboxWorkspace items={items} />;
}
