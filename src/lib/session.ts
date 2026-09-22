import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "shelf_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type SessionClaims = {
  userId: string;
  issuer: string;
  sessionVersion: number;
  expiresAt: string;
};

function isSessionClaims(value: unknown): value is SessionClaims {
  return Boolean(
    value &&
      typeof value === "object" &&
      "userId" in value &&
      typeof value.userId === "string" &&
      "issuer" in value &&
      typeof value.issuer === "string" &&
      "sessionVersion" in value &&
      typeof value.sessionVersion === "number" &&
      "expiresAt" in value &&
      typeof value.expiresAt === "string",
  );
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(
  claims: Omit<SessionClaims, "expiresAt">,
  secret: string,
  now = new Date(),
) {
  const payload = Buffer.from(
    JSON.stringify({
      ...claims,
      expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readSessionToken(
  token: string | undefined,
  secret: string,
  now = new Date(),
): SessionClaims | undefined {
  if (!token) return undefined;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return undefined;

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return undefined;

  try {
    const parsedClaims: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (!isSessionClaims(parsedClaims)) return undefined;
    const claims = parsedClaims;
    const expiresAt = Date.parse(claims.expiresAt);
    if (
      !claims.userId ||
      !claims.issuer ||
      !Number.isInteger(claims.sessionVersion) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now.getTime()
    ) {
      return undefined;
    }
    return claims;
  } catch {
    return undefined;
  }
}
