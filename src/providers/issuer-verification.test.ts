import { describe, expect, it } from "vitest";
import { companyById } from "@/data/catalog";
import { verifyCurrentIssuerInstrument } from "./issuer-verification";

describe("execution issuer verification", () => {
  const company = companyById("company-pepsico")!;
  const now = Date.parse("2026-09-23T12:00:00.000Z");

  it("requests fresh issuer listings even when an earlier listing was current", async () => {
    let calls = 0;
    const xstocks = {
      listings: async () => {
        calls += 1;
        return calls === 1
          ? [{ companyId: company.id, mint: company.instrument!.mint, observedAt: new Date(now).toISOString(), supportsAtomicSwaps: true }]
          : [{ companyId: company.id, mint: "changed-mint", observedAt: new Date(now).toISOString(), supportsAtomicSwaps: true }];
      },
    };
    const providers = { prestocks: { listings: async () => [] }, xstocks };
    await expect(verifyCurrentIssuerInstrument(company, providers, now)).resolves.toMatchObject({
      mint: company.instrument!.mint,
    });
    await expect(verifyCurrentIssuerInstrument(company, providers, now))
      .rejects.toThrow("ISSUER_INSTRUMENT_UNAVAILABLE");
    expect(calls).toBe(2);
  });

  it("rejects a stale issuer observation", async () => {
    await expect(verifyCurrentIssuerInstrument(company, {
      xstocks: { listings: async () => [{
        companyId: company.id,
        mint: company.instrument!.mint,
        observedAt: new Date(now - 61_000).toISOString(),
        supportsAtomicSwaps: true,
      }] },
      prestocks: { listings: async () => [] },
    }, now)).rejects.toThrow("ISSUER_INSTRUMENT_UNAVAILABLE");
  });

  it("accepts a provider observation stamped after the fetch begins", async () => {
    const prestocksCompany = companyById("company-openai")!;
    await expect(verifyCurrentIssuerInstrument(prestocksCompany, {
      prestocks: { listings: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return [{
          companyId: prestocksCompany.id,
          mint: prestocksCompany.instrument!.mint,
          observedAt: new Date().toISOString(),
        }];
      } },
      xstocks: { listings: async () => [] },
    })).resolves.toMatchObject({ mint: prestocksCompany.instrument!.mint });
  });
});
