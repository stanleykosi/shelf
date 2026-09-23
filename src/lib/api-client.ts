import type { AccountSummary, StepUpChallenge } from "@/domain/identity";
import {
  reauthenticateWithMagicEmail,
  reauthenticateWithMagicGoogle,
} from "@/providers/magic-browser";

type ApiEnvelope<T> = { data: T };
type ApiError = { error?: { code?: string; message?: string } };

type Reauthenticators = {
  email(email: string, challengeId: string): Promise<string>;
  google(challengeId: string, email?: string): Promise<string>;
};

export async function reauthenticateForSession(
  challenge: StepUpChallenge,
  account: AccountSummary,
  authenticators: Reauthenticators,
): Promise<string> {
  if (account.authMethod && account.authMethod !== challenge.authMethod) {
    throw new Error("REAUTHENTICATION_METHOD_CHANGED");
  }
  if (challenge.authMethod === "google") {
    return authenticators.google(challenge.challengeId, account.email);
  }
  if (!account.email) throw new Error("REAUTHENTICATION_EMAIL_UNAVAILABLE");
  return authenticators.email(account.email, challenge.challengeId);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T> & ApiError;
  if (!response.ok) {
    throw new Error(payload.error?.code ?? payload.error?.message ?? "REQUEST_FAILED");
  }

  return payload.data;
}

export function authenticationIsRequired(error: unknown): boolean {
  return error instanceof Error && error.message === "AUTH_REQUIRED";
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function freshAuthorization(
  purpose: string,
  headers: Record<string, string> = {},
): Promise<string> {
  const challenge = await apiRequest<StepUpChallenge>("auth/step-up-challenge", {
    method: "POST",
    headers,
    body: JSON.stringify({ purpose, returnPath: window.location.pathname }),
  });
  const account = await apiRequest<AccountSummary>("me");
  const didToken = await reauthenticateForSession(challenge, account, {
    email: reauthenticateWithMagicEmail,
    google: reauthenticateWithMagicGoogle,
  });
  const authorization = await apiRequest<{ stepUpToken: string }>("auth/step-up", {
    method: "POST",
    headers,
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      didToken,
      purpose,
    }),
  });
  return authorization.stepUpToken;
}

export async function freshApiRequest<T>(
  path: string,
  purpose: string,
  options: RequestInit = {},
): Promise<T> {
  const stepUpToken = await freshAuthorization(purpose);
  return apiRequest<T>(path, {
    ...options,
    headers: { ...options.headers, "x-shelf-step-up": stepUpToken },
  });
}

export async function freshPostJson<T>(path: string, purpose: string, body: unknown): Promise<T> {
  return freshApiRequest<T>(path, purpose, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postAdminJson<T>(path: string, body: unknown): Promise<T> {
  const stepUpToken = await freshAuthorization("admin_action");
  return apiRequest<T>(path, {
    method: "POST",
    headers: { "x-shelf-step-up": stepUpToken },
    body: JSON.stringify(body),
  });
}
