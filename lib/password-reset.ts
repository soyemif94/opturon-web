import { hashSync } from "bcryptjs";
import { findUserByEmail } from "@/lib/saas/store";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  setPasswordOverride,
  validatePasswordResetToken
} from "@/lib/password-reset-store";

function getAppBaseUrl() {
  return String(
    process.env.PASSWORD_RESET_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      ""
  )
    .trim()
    .replace(/\/$/, "");
}

async function sendResetEmail(input: { email: string; resetLink: string }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESET_EMAIL_FROM || "").trim();

  if (!apiKey || !from) {
    throw new Error("password_reset_email_not_configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Restablece tu contraseña de Opturon",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2>Restablece tu contraseña</h2>
          <p>Recibimos una solicitud para cambiar tu contraseña de Opturon.</p>
          <p>
            <a href="${input.resetLink}" style="display:inline-block;padding:12px 18px;background:#c05000;color:#fff;text-decoration:none;border-radius:10px;">
              Crear nueva contraseña
            </a>
          </p>
          <p>Este enlace vence en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`password_reset_email_failed_${response.status}:${body}`);
  }
}

export async function requestPasswordReset(email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return { ok: true };

  const user = findUserByEmail(normalized);
  if (!user?.id) {
    return { ok: true };
  }

  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    throw new Error("password_reset_base_url_not_configured");
  }

  const token = createPasswordResetToken({
    email: normalized,
    userId: user.id,
    expiresInMinutes: 30
  });

  const resetLink = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendResetEmail({ email: normalized, resetLink });
  return { ok: true };
}

export function isPasswordResetTokenValid(token: string) {
  return Boolean(validatePasswordResetToken(token));
}

export function resetPasswordWithToken(token: string, password: string) {
  const tokenRecord = consumePasswordResetToken(token);
  if (!tokenRecord) {
    throw new Error("invalid_or_expired_reset_token");
  }

  const passwordHash = hashSync(password, 10);
  setPasswordOverride(tokenRecord.email, passwordHash);
  return { ok: true };
}
