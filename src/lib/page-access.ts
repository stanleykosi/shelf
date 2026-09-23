export type PageAccess = "public" | "member" | "owner";

const legacyMemberRoutes = new Set([
  "/eligibility",
  "/history",
  "/invest/basket",
  "/invest/buy",
  "/invest/sell",
  "/invest/suggest",
  "/portfolio",
  "/settings",
  "/shelf/share",
  "/wallet",
  "/wallet/deposit",
  "/wallet/send",
  "/welcome",
]);

export function pageAccess(pathname: string): PageAccess {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "owner";
  if (
    legacyMemberRoutes.has(pathname) ||
    pathname === "/saved/share" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/invest/basket" ||
    pathname.startsWith("/invest/") ||
    pathname.startsWith("/orders/") ||
    pathname === "/portfolio" ||
    pathname.startsWith("/portfolio/") ||
    pathname.startsWith("/history/")
  ) {
    return "member";
  }
  return "public";
}
