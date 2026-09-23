import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  activePrimarySection,
  legacyRedirectFor,
  safeReturnTo,
} from "@/lib/routes";
import { pageAccess } from "@/lib/page-access";
import {
  brandBySlug,
  companyById,
  companyBySlug,
  productById,
  productBySlug,
} from "@/data/catalog";
import {
  AI_PROCESSING_CONSENT_VERSION,
  hasCurrentAiProcessingConsent,
} from "@/lib/ai-consent";

describe("frontend route architecture", () => {
  it("owns canonical routes with explicit App Router pages", () => {
    const routeFiles = [
      "page.tsx",
      "discover/page.tsx",
      "scan/page.tsx",
      "scan/results/page.tsx",
      "products/[slug]/page.tsx",
      "brands/[slug]/page.tsx",
      "companies/[slug]/page.tsx",
      "learn/page.tsx",
      "learn/[slug]/page.tsx",
      "assistant/page.tsx",
      "saved/page.tsx",
      "saved/share/page.tsx",
      "share/[token]/page.tsx",
      "sign-in/page.tsx",
      "auth/callback/page.tsx",
      "onboarding/page.tsx",
      "onboarding/availability/page.tsx",
      "account/page.tsx",
      "account/wallet/page.tsx",
      "account/wallet/deposit/page.tsx",
      "account/wallet/send/page.tsx",
      "invest/[companySlug]/page.tsx",
      "invest/basket/page.tsx",
      "orders/[id]/review/page.tsx",
      "orders/[id]/page.tsx",
      "portfolio/page.tsx",
      "portfolio/[instrumentId]/page.tsx",
      "portfolio/[instrumentId]/sell/page.tsx",
      "portfolio/activity/page.tsx",
      "portfolio/activity/[recordId]/page.tsx",
      "admin/page.tsx",
      "admin/catalog/page.tsx",
      "admin/access/page.tsx",
      "admin/operations/page.tsx",
      "admin/audit/page.tsx",
    ];

    for (const routeFile of routeFiles) {
      expect(existsSync(resolve("src/app", routeFile)), routeFile).toBe(true);
    }
    expect(existsSync(resolve("src/app/[[...path]]/page.tsx"))).toBe(false);
  });

  it("classifies canonical and legacy access boundaries", () => {
    for (const path of [
      "/",
      "/discover",
      "/scan/results",
      "/products/doritos-snack",
      "/brands/doritos",
      "/companies/pepsico",
      "/saved",
      "/share/token",
      "/assets/xstocks/PEPx",
    ]) {
      expect(pageAccess(path)).toBe("public");
    }

    for (const path of [
      "/saved/share",
      "/onboarding",
      "/account/wallet/send",
      "/invest/pepsico",
      "/orders/id/review",
      "/portfolio/activity/record-id",
      "/assets/prestocks/SPACEX/buy",
      "/wallet",
      "/history",
    ]) {
      expect(pageAccess(path)).toBe("member");
    }

    expect(pageAccess("/admin/catalog")).toBe("owner");
  });

  it("maps legacy routes one way while preserving only approved state", () => {
    expect(legacyRedirectFor("/markets", new URLSearchParams("q=apple"))).toEqual({
      destination: "/discover?entity=company&q=apple",
      permanent: true,
    });
    expect(legacyRedirectFor("/markets/private", new URLSearchParams("sort=name"))).toEqual({
      destination: "/discover?entity=company&market=private&sort=name",
      permanent: true,
    });
    expect(
      legacyRedirectFor(
        "/markets/public",
        new URLSearchParams("entity=product&market=private&q=apple"),
      ),
    ).toEqual({
      destination: "/discover?entity=company&market=public&q=apple",
      permanent: true,
    });
    expect(legacyRedirectFor("/wallet/send", new URLSearchParams("asset=usdc&amount=50"))).toEqual({
      destination: "/account/wallet/send?asset=usdc",
      permanent: true,
    });
    expect(legacyRedirectFor("/history", new URLSearchParams("status=failed&secret=x"))).toEqual({
      destination: "/portfolio/activity?status=failed",
      permanent: true,
    });
    expect(
      legacyRedirectFor(
        "/wallet/deposit",
        new URLSearchParams("returnTo=%2Finvest%2Fpepsico&amount=50"),
      ),
    ).toEqual({
      destination: "/account/wallet/deposit?returnTo=%2Finvest%2Fpepsico",
      permanent: true,
    });
    expect(legacyRedirectFor("/onboarding", new URLSearchParams())).toBeUndefined();
  });

  it("accepts only same-origin relative return destinations and safe query keys", () => {
    expect(safeReturnTo("/discover?q=apple&category=electronics")).toBe(
      "/discover?q=apple&category=electronics",
    );
    expect(safeReturnTo("/portfolio/activity?status=failed&recipient=secret")).toBe(
      "/portfolio/activity?status=failed",
    );
    expect(safeReturnTo("https://attacker.invalid/portfolio")).toBe("/onboarding");
    expect(safeReturnTo("//attacker.invalid/portfolio")).toBe("/onboarding");
    expect(safeReturnTo("/auth/callback")).toBe("/onboarding");
    expect(safeReturnTo("/unknown/private-place")).toBe("/onboarding");

    for (const destination of [
      "/products/doritos-snack",
      "/brands/doritos",
      "/companies/pepsico",
      "/learn/what-you-own",
      "/share/revocable-token",
      "/invest/pepsico",
      "/orders/order-id",
      "/orders/order-id/review",
      "/portfolio/instrument-id",
      "/portfolio/instrument-id/sell",
      "/portfolio/activity/record-id",
      "/assets/prestocks/SPACEX/buy",
      "/assets/xstocks/PEPx",
    ]) {
      expect(safeReturnTo(destination)).toBe(destination);
    }

    for (const destination of [
      "/products/",
      "/products/%",
      "/products/%2Faccount",
      "/products/doritos/extra",
      "/orders/order-id/approve",
      "/orders/order-id/review/extra",
      "/portfolio/instrument-id/unknown",
      "/portfolio/activity/record-id/extra",
      "/assets/unknown/PEPx/buy",
      "/assets/prestocks/%2Faccount/buy",
      "/assets/prestocks/SPACEX/buy/extra",
    ]) {
      expect(safeReturnTo(destination)).toBe("/onboarding");
    }
  });

  it("resolves reviewed public slugs without falling back to another entity", () => {
    expect(productBySlug("doritos-snack")?.id).toBe("product-doritos-snack");
    expect(productById("product-doritos-snack")?.slug).toBe("doritos-snack");
    expect(companyBySlug("pepsico")?.id).toBe("company-pepsico");
    expect(companyById("company-pepsico")?.slug).toBe("pepsico");
    expect(brandBySlug("doritos")?.companyRelationships[0]?.companyId).toBe("company-pepsico");
    expect(productBySlug("missing")).toBeUndefined();
    expect(companyBySlug("missing")).toBeUndefined();
    expect(brandBySlug("missing")).toBeUndefined();
  });

  it("derives mobile and desktop active state from the actual route", () => {
    expect(activePrimarySection("/")).toBe("discover");
    expect(activePrimarySection("/companies/pepsico")).toBe("discover");
    expect(activePrimarySection("/scan/results")).toBe("scan");
    expect(activePrimarySection("/saved/share")).toBe("saved");
    expect(activePrimarySection("/portfolio/activity")).toBe("portfolio");
    expect(activePrimarySection("/account")).toBeNull();
  });

  it("requires the current explicit AI-processing consent contract", () => {
    expect(
      hasCurrentAiProcessingConsent({
        aiProcessingConsentAccepted: true,
        aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
      }),
    ).toBe(true);
    expect(hasCurrentAiProcessingConsent({ aiProcessingConsentAccepted: true })).toBe(false);
    expect(
      hasCurrentAiProcessingConsent({
        aiProcessingConsentAccepted: false,
        aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
      }),
    ).toBe(false);
  });
});
