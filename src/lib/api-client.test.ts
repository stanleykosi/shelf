import { describe, expect, it, vi } from "vitest";
import { reauthenticateForSession } from "./api-client";

describe("step-up provider selection", () => {
  it("uses Google again for a Google-authenticated session", async () => {
    const email = vi.fn(async () => "email-token");
    const google = vi.fn(async () => "google-token");

    await expect(reauthenticateForSession(
      { challengeId: "challenge-1", expiresAt: "2030-01-01T00:00:00.000Z", authMethod: "google" },
      { identityProvider: "magic", authMethod: "google", email: "member@example.com" },
      { email, google },
    )).resolves.toBe("google-token");
    expect(google).toHaveBeenCalledWith("challenge-1", "member@example.com");
    expect(email).not.toHaveBeenCalled();
  });

  it("uses email OTP only for an email-authenticated session", async () => {
    const email = vi.fn(async () => "email-token");
    const google = vi.fn(async () => "google-token");

    await expect(reauthenticateForSession(
      { challengeId: "challenge-2", expiresAt: "2030-01-01T00:00:00.000Z", authMethod: "email" },
      { identityProvider: "magic", authMethod: "email", email: "member@example.com" },
      { email, google },
    )).resolves.toBe("email-token");
    expect(email).toHaveBeenCalledWith("member@example.com", "challenge-2");
    expect(google).not.toHaveBeenCalled();
  });

  it("fails closed if the session method changes during step-up", async () => {
    await expect(reauthenticateForSession(
      { challengeId: "challenge-3", expiresAt: "2030-01-01T00:00:00.000Z", authMethod: "google" },
      { identityProvider: "magic", authMethod: "email", email: "member@example.com" },
      { email: vi.fn(), google: vi.fn() },
    )).rejects.toThrow("REAUTHENTICATION_METHOD_CHANGED");
  });
});
