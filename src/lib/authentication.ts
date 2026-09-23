import { state } from "@/domain/store";
import { env } from "@/lib/env";
import { readSessionToken } from "@/lib/session";

export function authenticatedUser(sessionToken: string | undefined) {
  if (!env.SESSION_TOKEN_HMAC_KEY) return undefined;
  const claims = readSessionToken(sessionToken, env.SESSION_TOKEN_HMAC_KEY!);
  const user = claims ? state.users.get(claims.userId) : undefined;
  const session = claims ? state.sessions.get(claims.sessionId) : undefined;
  const sessionIsCurrent =
    user?.magicIssuer === claims?.issuer &&
    user?.sessionVersion === claims?.sessionVersion &&
    session !== undefined &&
    session.userId === claims?.userId &&
    !session.revokedAt &&
    new Date(session.expiresAt) > new Date();

  if (!user || !sessionIsCurrent) return undefined;

  user.role = env.OWNER_MAGIC_ISSUER === user.magicIssuer ? "owner" : "member";
  return user;
}

export function hasAuthenticatedSession(sessionToken: string | undefined) {
  if (!env.SESSION_TOKEN_HMAC_KEY) return false;
  return Boolean(readSessionToken(sessionToken, env.SESSION_TOKEN_HMAC_KEY!));
}
