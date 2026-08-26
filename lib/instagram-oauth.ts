export const INSTAGRAM_OAUTH_CALLBACK_PATH = "/api/app/integrations/instagram/callback";

/**
 * Canonical server-side redirect URI for both legs of Instagram OAuth.
 */
export function resolveInstagramOauthRedirectUri(origin: string): string {
  return new URL(INSTAGRAM_OAUTH_CALLBACK_PATH, origin).toString();
}
