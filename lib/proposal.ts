export type ProposalPackage = "base" | "starter" | "sales-system" | "ops-scale";

export type ProposalInput = {
  cliente: string;
  consultasMes: string;
  equipo: string;
  crm: string;
  dolorPrincipal: string;
  usdMin: number;
  usdMax: number;
  fecha: string;
  paquete: ProposalPackage;
};

const templateByPackage: Record<ProposalPackage, string> = {
  base: `# Opturon — Propuesta de implementación

**Cliente:** {{CLIENTE}}  
**Fecha:** {{FECHA}}  
**Preparado por:** Opturon

## Objetivo
Implementar un sistema comercial en WhatsApp con automatización + integración CRM para mejorar seguimiento, trazabilidad y velocidad de respuesta.

## Diagnóstico
- Volumen actual estimado: **{{CONSULTAS_MES}}**.
- Equipo comercial involucrado: **{{EQUIPO}}**.
- Stack comercial / CRM actual: **{{CRM}}**.
- Dolor principal detectado: **{{DOLOR_PRINCIPAL}}**.
- Riesgo operativo: oportunidades que se enfrían por falta de sistema.

## Solución propuesta
### 1) Calificación automática
Automatizamos la primera capa de conversación para capturar intención, urgencia y datos clave de forma consistente.  
**Valor:** menos fricción en el primer contacto y mejor calidad de oportunidad para ventas.

### 2) Seguimiento estructurado
Diseñamos secuencias y estados de seguimiento para que cada conversación tenga un próximo paso definido.  
**Valor:** menor pérdida de leads por improvisación y mayor continuidad comercial.

### 3) Integración CRM + métricas
Conectamos eventos de WhatsApp con el CRM para registrar trazabilidad, hitos y performance operativa/comercial.  
**Valor:** decisiones basadas en datos reales, no en percepción.

## Alcance
- Diagnóstico operativo y diseño del flujo comercial.
- Implementación de automatizaciones en WhatsApp.
- Integración CRM según stack y viabilidad técnica.
- Definición de mensajería y plantillas de trabajo.
- Tracking de eventos y métricas clave.
- QA operativo y puesta en producción.
- Handover y documentación operativa para el equipo.

## Plan por etapas
- **Semana 1:** Diagnóstico + diseño de arquitectura comercial y técnica.
- **Semana 2:** Implementación de flujos + integración CRM.
- **Semana 3:** QA + go-live + ajustes iniciales de optimización.

## Inversión
**Inversión estimada: USD {{USD_MIN}} – USD {{USD_MAX}}**.  
El valor final depende de complejidad e integraciones. Se confirma tras auditoría.

Forma de pago sugerida (referencia): **50% inicio / 50% entrega**.

## Próximos pasos
- Confirmación de alcance y opción recomendada.
- Inicio y acceso a activos (WABA / CRM).
- Kickoff con fecha de inicio y responsables.

## Cierre
Si te parece, confirmamos la opción recomendada y coordinamos inicio.  
Nuestro foco es convertir WhatsApp en un sistema comercial predecible y escalable para tu equipo.

_Benchmarks y mejoras son orientativas; se validan con métricas reales del negocio._`,
  starter: `# Opturon — Propuesta de implementación (Starter)

**Cliente:** {{CLIENTE}}  
**Fecha:** {{FECHA}}  
**Preparado por:** Opturon

## Objetivo
Implementar una base comercial operativa en WhatsApp con automatización inicial y orden de seguimiento.

## Diagnóstico
- Volumen estimado: **{{CONSULTAS_MES}}**.
- Equipo actual: **{{EQUIPO}}**.
- CRM / herramientas: **{{CRM}}**.
- Dolor principal: **{{DOLOR_PRINCIPAL}}**.
- Riesgo: oportunidades que se enfrían por falta de proceso.

## Solución propuesta
### 1) Calificación automática base
Captura inicial de datos y clasificación de conversaciones por intención.  
**Valor:** menor tiempo de respuesta y más foco del equipo.

### 2) Seguimiento mínimo estructurado
Definimos estados simples y próximos pasos para evitar pérdida de contexto.  
**Valor:** continuidad comercial desde el primer contacto.

### 3) Métricas iniciales
Configuramos una capa básica de trazabilidad para medir respuesta y avance.  
**Valor:** visibilidad operativa desde el inicio.

## Alcance
- Diseño de flujo comercial base.
- Implementación de automatizaciones iniciales.
- Configuración de etiquetas y derivaciones.
- Mensajería operativa base.
- QA y salida a producción.
- Handover operativo breve.

## Plan por etapas
- **Semana 1:** Diagnóstico + diseño + configuración base.
- **Semana 2:** QA + go-live + ajustes iniciales.

## Inversión
**Inversión estimada: USD {{USD_MIN}} – USD {{USD_MAX}}**.  
El valor final depende de complejidad e integraciones. Se confirma tras auditoría.

Forma de pago sugerida: **50% inicio / 50% entrega**.

## Próximos pasos
- Confirmación de alcance.
- Acceso a activos (WABA / stack actual).
- Kickoff y fecha de inicio.

## Cierre
Si te parece, confirmamos esta fase inicial y coordinamos implementación.

_Benchmarks y mejoras son orientativas; se validan con métricas reales del negocio._`,
  "sales-system": `# Opturon — Propuesta de implementación (Sales System)

**Cliente:** {{CLIENTE}}  
**Fecha:** {{FECHA}}  
**Preparado por:** Opturon

## Objetivo
Implementar un sistema comercial en WhatsApp con calificación, seguimiento y trazabilidad en CRM para mejorar conversión y control operativo.

## Diagnóstico
- Volumen estimado: **{{CONSULTAS_MES}}**.
- Equipo comercial: **{{EQUIPO}}**.
- CRM actual: **{{CRM}}**.
- Dolor principal: **{{DOLOR_PRINCIPAL}}**.
- Riesgo: oportunidades que se enfrían por falta de sistema.

## Solución propuesta
### 1) Calificación automática
Estandarizamos la entrada de leads con reglas de negocio y segmentación de intención.  
**Valor:** mejor calidad de oportunidad para el equipo de ventas.

### 2) Seguimiento estructurado
Diseñamos secuencias con estados, hitos y próximos pasos para cada conversación comercial.  
**Valor:** menor fuga entre primer contacto y oportunidad.

### 3) Integración CRM + métricas
Sincronizamos eventos clave con CRM para medir calificación, avance y conversión a oportunidad.  
**Valor:** pipeline más predecible y decisiones basadas en datos.

## Alcance
- Diseño completo de flujo comercial WhatsApp.
- Implementación de automatizaciones de calificación y seguimiento.
- Integración CRM según stack y viabilidad.
- Definición de plantillas y mensajes comerciales.
- Tracking de eventos y métricas de performance.
- QA + salida a producción.
- Handover + documentación operativa.

## Plan por etapas
- **Semana 1:** Diagnóstico + diseño detallado.
- **Semana 2:** Implementación + integración CRM.
- **Semana 3:** QA + go-live + optimizaciones iniciales.

## Inversión
**Inversión estimada: USD {{USD_MIN}} – USD {{USD_MAX}}**.  
El valor final depende de complejidad e integraciones. Se confirma tras auditoría.

Forma de pago sugerida: **50% inicio / 50% entrega**.

## Próximos pasos
- Confirmación de alcance y paquete recomendado.
- Accesos a activos (WABA/CRM) y responsables.
- Kickoff con fecha de inicio.

## Cierre
Si te parece, avanzamos con la opción recomendada y coordinamos inicio.

_Benchmarks y mejoras son orientativas; se validan con métricas reales del negocio._`,
  "ops-scale": `# Opturon — Propuesta de implementación (Ops & Scale)

**Cliente:** {{CLIENTE}}  
**Fecha:** {{FECHA}}  
**Preparado por:** Opturon

## Objetivo
Escalar la operación comercial y operativa sobre WhatsApp con automatización avanzada, integración CRM y optimización continua basada en métricas.

## Diagnóstico
- Volumen estimado: **{{CONSULTAS_MES}}**.
- Equipo involucrado: **{{EQUIPO}}**.
- Stack CRM/sistemas: **{{CRM}}**.
- Dolor principal: **{{DOLOR_PRINCIPAL}}**.
- Riesgo: pérdida de oportunidades y carga operativa creciente por falta de sistema.

## Solución propuesta
### 1) Calificación y enrutamiento inteligente
Configuramos reglas para calificar, priorizar y derivar conversaciones según criterios comerciales y operativos.  
**Valor:** foco del equipo en oportunidades de mayor impacto.

### 2) Seguimiento estructurado multi-etapa
Implementamos secuencias y automatizaciones de continuidad para sostener el avance del pipeline.  
**Valor:** menor fuga comercial y mayor consistencia de ejecución.

### 3) Integración CRM + métricas avanzadas
Conectamos eventos, estados y resultados en CRM para monitorear performance y optimizar por ciclo.  
**Valor:** escalabilidad con control y mejora continua.

## Alcance
- Diseño de arquitectura comercial y operativa.
- Implementación de automatizaciones avanzadas.
- Integración CRM y sistemas asociados según stack.
- Plantillas y guías de mensajería por etapa.
- Tracking de eventos y tablero de métricas clave.
- QA + salida a producción controlada.
- Ciclo inicial de optimización post go-live.
- Handover + documentación operativa.

## Plan por etapas
- **Semana 1:** Diagnóstico + diseño de arquitectura.
- **Semana 2:** Implementación principal + integraciones.
- **Semana 3:** QA + go-live + optimizaciones iniciales.

## Inversión
**Inversión estimada: USD {{USD_MIN}} – USD {{USD_MAX}}**.  
El valor final depende de complejidad e integraciones. Se confirma tras auditoría.

Forma de pago sugerida: **50% inicio / 50% entrega**.

## Próximos pasos
- Confirmación de alcance final y objetivos.
- Accesos técnicos y responsables por área.
- Kickoff con plan de implementación.

## Cierre
Si te parece, confirmamos alcance y coordinamos inicio para ejecutar con foco en impacto y escalabilidad.

_Benchmarks y mejoras son orientativas; se validan con métricas reales del negocio._`
};

function replacePlaceholders(template: string, input: ProposalInput): string {
  return template
    .replaceAll("{{CLIENTE}}", input.cliente)
    .replaceAll("{{FECHA}}", input.fecha)
    .replaceAll("{{CONSULTAS_MES}}", input.consultasMes)
    .replaceAll("{{EQUIPO}}", input.equipo)
    .replaceAll("{{CRM}}", input.crm)
    .replaceAll("{{DOLOR_PRINCIPAL}}", input.dolorPrincipal)
    .replaceAll("{{USD_MIN}}", String(input.usdMin))
    .replaceAll("{{USD_MAX}}", String(input.usdMax));
}

export function renderProposalMarkdown(input: ProposalInput): string {
  const template = templateByPackage[input.paquete] ?? templateByPackage.base;
  return replacePlaceholders(template, input);
}