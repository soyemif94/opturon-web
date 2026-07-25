import { hashSync } from "bcryptjs";
import {
  isBackendConfigured,
  requestPortalPasswordReset as requestBackendPortalPasswordReset,
  invalidatePortalPasswordResetToken as invalidateBackendPortalPasswordResetToken,
  resetPortalPassword as resetBackendPortalPassword,
  validatePortalPasswordResetToken as validateBackendPortalPasswordResetToken
} from "@/lib/api";
import {
  buildPasswordResetDeliveryFailureLog,
  buildPasswordResetLink,
  resolvePasswordResetBaseUrl,
  sendPasswordResetEmailViaResend
} from "@/lib/password-reset-delivery";
import { findUserByEmail } from "@/lib/saas/store";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  setPasswordOverride,
  validatePasswordResetToken
} from "@/lib/password-reset-store";

async function invalidateBackendResetDeliveryToken(token: string) {
  try {
    await invalidateBackendPortalPasswordResetToken(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("PASSWORD_RESET_TOKEN_INVALIDATION_FAILED", { message });
  }
}

export async function requestPasswordReset(email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return { ok: true };

  if (isBackendConfigured()) {
    const response = await requestBackendPortalPasswordReset(normalized);
    const delivery = response.data?.delivery;
    if (delivery?.token && delivery?.email) {
      try {
        const resetLink = buildPasswordResetLink(resolvePasswordResetBaseUrl(), delivery.token);
        await sendPasswordResetEmailViaResend({ email: delivery.email, resetLink });
      } catch (error) {
        await invalidateBackendResetDeliveryToken(delivery.token);
        console.error("portal_password_reset_delivery_failed", buildPasswordResetDeliveryFailureLog(error));
      }
    }
    return { ok: true };
  }

  const user = findUserByEmail(normalized);
  if (!user?.id) {
    return { ok: true };
  }

  const appBaseUrl = resolvePasswordResetBaseUrl();
  if (!appBaseUrl) {
    throw new Error("password_reset_base_url_not_configured");
  }

  const token = createPasswordResetToken({
    email: normalized,
    userId: user.id,
    expiresInMinutes: 30
  });

  const resetLink = buildPasswordResetLink(appBaseUrl, token);
  await sendPasswordResetEmailViaResend({ email: normalized, resetLink });
  return { ok: true };
}

export function isPasswordResetTokenValid(token: string) {
  if (isBackendConfigured()) {
    throw new Error("backend_password_reset_validation_requires_async");
  }
  return Boolean(validatePasswordResetToken(token));
}

export async function isPasswordResetTokenValidAsync(token: string) {
  if (isBackendConfigured()) {
    const response = await validateBackendPortalPasswordResetToken(token);
    return Boolean(response.data?.valid);
  }
  return Boolean(validatePasswordResetToken(token));
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (isBackendConfigured()) {
    const response = await resetBackendPortalPassword(token, password);
    return response.data;
  }

  const tokenRecord = consumePasswordResetToken(token);
  if (!tokenRecord) {
    throw new Error("invalid_or_expired_reset_token");
  }

  const passwordHash = hashSync(password, 10);
  setPasswordOverride(tokenRecord.email, passwordHash);
  return { ok: true };
}
