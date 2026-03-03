# Propuestas 1 página (uso interno)

Estos templates son para uso comercial interno. No se renderizan en rutas públicas.

## Archivos
- `content/propuesta-1p.md` (base)
- `content/propuesta-1p-starter.md`
- `content/propuesta-1p-sales-system.md`
- `content/propuesta-1p-ops-scale.md`

## Editar templates
1. Ajustá copy y alcance directamente en los `.md`.
2. Conservá placeholders `{{...}}` cuando quieras que se completen por código.

Placeholders actuales:
- `{{CLIENTE}}`
- `{{FECHA}}`
- `{{CONSULTAS_MES}}`
- `{{EQUIPO}}`
- `{{CRM}}`
- `{{DOLOR_PRINCIPAL}}`
- `{{USD_MIN}}`
- `{{USD_MAX}}`

## Generar markdown por código
Usar `renderProposalMarkdown` en `lib/proposal.ts`.

```ts
import { renderProposalMarkdown, type ProposalInput } from "@/lib/proposal";

const input: ProposalInput = {
  cliente: "Empresa X",
  consultasMes: "100-300",
  equipo: "3 vendedores",
  crm: "Pipedrive",
  dolorPrincipal: "seguimiento inconsistente",
  usdMin: 1000,
  usdMax: 3000,
  paquete: "sales-system",
  fecha: "2026-03-03"
};

const markdown = renderProposalMarkdown(input);
```

## Exportar a PDF
1. Copiar el markdown generado.
2. Pegar en Google Docs o Notion.
3. Aplicar formato simple (títulos y negritas).
4. Exportar como PDF para envío al cliente.