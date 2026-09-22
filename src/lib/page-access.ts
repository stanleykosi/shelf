type PageAccess = "public" | "member" | "owner";

const memberRoutes = new Set([
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
    memberRoutes.has(pathname) ||
    pathname.startsWith("/history/") ||
    pathname.startsWith("/orders/") ||
    pathname.startsWith("/portfolio/")
  ) {
    return "member";
  }
  return "public";
}
