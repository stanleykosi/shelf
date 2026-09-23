export type PrimarySection = "discover" | "scan" | "saved" | "portfolio";

type LegacyRedirect = {
  destination: string;
  permanent: boolean;
};

const safeQueryKeys = new Set([
  "asset",
  "availability",
  "category",
  "cursor",
  "entity",
  "from",
  "market",
  "q",
  "scope",
  "sort",
  "source",
  "status",
  "to",
  "type",
  "view",
]);

const knownStaticPaths = new Set([
  "/",
  "/discover",
  "/scan",
  "/scan/results",
  "/learn",
  "/assistant",
  "/saved",
  "/saved/share",
  "/sign-in",
  "/onboarding",
  "/onboarding/availability",
  "/account",
  "/account/wallet",
  "/account/wallet/deposit",
  "/account/wallet/send",
  "/invest/basket",
  "/portfolio",
  "/portfolio/activity",
  "/admin",
  "/admin/catalog",
  "/admin/access",
  "/admin/operations",
  "/admin/audit",
]);

const singleSegmentRoutes = new Set([
  "products",
  "brands",
  "companies",
  "learn",
  "share",
  "invest",
  "orders",
  "portfolio",
]);

function isSafePathSegment(segment: string | undefined) {
  if (!segment) return false;

  try {
    const decoded = decodeURIComponent(segment);
    return (
      decoded.length > 0 &&
      decoded !== "." &&
      decoded !== ".." &&
      !decoded.includes("/") &&
      !decoded.includes("\\") &&
      !/[\u0000-\u001f]/.test(decoded)
    );
  } catch {
    return false;
  }
}

function isKnownDynamicPath(pathname: string) {
  const segments = pathname.split("/");
  if (segments[0] !== "") return false;

  if (
    segments.length === 3 &&
    singleSegmentRoutes.has(segments[1] ?? "") &&
    isSafePathSegment(segments[2])
  ) {
    return true;
  }

  if (segments.length !== 4 || !isSafePathSegment(segments[2])) return false;

  return (
    (segments[1] === "orders" && segments[3] === "review") ||
    (segments[1] === "portfolio" && segments[3] === "sell") ||
    (segments[1] === "portfolio" && segments[2] === "activity" && isSafePathSegment(segments[3]))
  );
}

function withSafeQuery(pathname: string, source: URLSearchParams, initial?: URLSearchParams) {
  const target = initial ?? new URLSearchParams();
  for (const [key, value] of source) {
    if (safeQueryKeys.has(key) && value && !target.has(key)) target.append(key, value);
    if (key === "returnTo" && value) {
      const safeDestination = safeReturnTo(value, "");
      if (safeDestination) target.append(key, safeDestination);
    }
  }
  const query = target.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function legacyRedirectFor(
  pathname: string,
  searchParams: URLSearchParams,
): LegacyRedirect | undefined {
  if (pathname === "/markets" || pathname === "/markets/public" || pathname === "/markets/private") {
    const target = new URLSearchParams({ entity: "company" });
    if (pathname !== "/markets") {
      target.set("market", pathname.endsWith("/private") ? "private" : "public");
    }
    return {
      destination: withSafeQuery("/discover", searchParams, target),
      permanent: true,
    };
  }

  const staticRedirects: Record<string, { pathname: string; permanent: boolean }> = {
    "/shelf": { pathname: "/saved", permanent: true },
    "/shelf/share": { pathname: "/saved/share", permanent: true },
    "/wallet": { pathname: "/account/wallet", permanent: true },
    "/wallet/deposit": { pathname: "/account/wallet/deposit", permanent: true },
    "/wallet/send": { pathname: "/account/wallet/send", permanent: true },
    "/history": { pathname: "/portfolio/activity", permanent: true },
    "/settings": { pathname: "/account", permanent: true },
    "/welcome": { pathname: "/onboarding", permanent: false },
    "/eligibility": { pathname: "/onboarding/availability", permanent: false },
    "/invest/suggest": { pathname: "/invest/basket", permanent: true },
    "/admin/status": { pathname: "/admin", permanent: true },
    "/admin/invites": { pathname: "/admin/access", permanent: true },
    "/admin/orders": { pathname: "/admin/operations", permanent: true },
  };
  const redirect = staticRedirects[pathname];
  if (!redirect) return undefined;

  const initial = pathname === "/invest/suggest" ? new URLSearchParams({ source: "ai" }) : undefined;
  return {
    destination: withSafeQuery(redirect.pathname, searchParams, initial),
    permanent: redirect.permanent,
  };
}

export function isKnownAppPath(pathname: string) {
  return knownStaticPaths.has(pathname) || isKnownDynamicPath(pathname);
}

export function safeReturnTo(value: string | undefined, fallback = "/onboarding") {
  if (!value || value.length > 2_048 || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;

  let target: URL;
  try {
    target = new URL(value, "https://shelf.local");
  } catch {
    return fallback;
  }

  if (target.origin !== "https://shelf.local") return fallback;
  if (!isKnownAppPath(target.pathname)) return fallback;
  if (target.pathname === "/sign-in" || target.pathname === "/auth/callback") return fallback;

  return withSafeQuery(target.pathname, target.searchParams);
}

export function signInHref(returnTo: string) {
  return `/sign-in?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function activePrimarySection(pathname: string): PrimarySection | null {
  if (pathname === "/scan" || pathname.startsWith("/scan/")) return "scan";
  if (pathname === "/saved" || pathname.startsWith("/saved/")) return "saved";
  if (pathname === "/portfolio" || pathname.startsWith("/portfolio/")) return "portfolio";
  if (
    pathname === "/" ||
    pathname === "/discover" ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/brands/") ||
    pathname.startsWith("/companies/") ||
    pathname === "/learn" ||
    pathname.startsWith("/learn/") ||
    pathname === "/assistant"
  ) {
    return "discover";
  }
  return null;
}
