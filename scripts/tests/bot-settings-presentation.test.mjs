import assert from "node:assert/strict";
import { effectiveBotPresentation, formatBillingPeriod, provisioningPresentation } from "../../lib/bot-settings-presentation.ts";

assert.equal(provisioningPresentation("not_required").label, "Lista");
assert.equal(provisioningPresentation("ready").label, "Lista");
assert.equal(provisioningPresentation("pending").label, "En proceso");
assert.equal(provisioningPresentation("blocked").label, "Pendiente");
assert.equal(provisioningPresentation("failed").label, "Requiere atención");
assert.equal(formatBillingPeriod("2026-10-09T00:00:00.000Z", "2026-11-09T00:00:00.000Z"), "09/10/2026 — 09/11/2026");
assert.equal(formatBillingPeriod(null, null), "Período vigente");
assert.equal(effectiveBotPresentation({ provisioningStatus: "ready", botActive: true, quotaAvailable: true, channelOperational: true, entitled: true }).label, "Asistente activo");
assert.equal(effectiveBotPresentation({ provisioningStatus: "ready", botActive: false, quotaAvailable: true, channelOperational: true, entitled: true }).label, "Asistente desactivado");
assert.equal(effectiveBotPresentation({ provisioningStatus: "pending", botActive: true, quotaAvailable: true, channelOperational: true, entitled: true }).label, "Configuración en proceso");
assert.equal(effectiveBotPresentation({ provisioningStatus: "ready", botActive: true, quotaAvailable: false, channelOperational: true, entitled: true }).label, "Pausado por límite de respuestas");
console.log("BOT.SETTINGS.PRESENTATION validation passed");
