import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "@/components/studio-icons";

/** Context stays close to the task, including routes entered directly from a link. */
export function WorkspaceNavigation({ pathname }: { pathname: string }) {
  const isAdmin = pathname.startsWith("/admin");
  const isWallet = pathname.startsWith("/account/wallet");
  const isPortfolio = pathname.startsWith("/portfolio") || pathname.startsWith("/orders") || pathname.startsWith("/invest");
  const isSharing = pathname.startsWith("/saved/") || pathname.startsWith("/share/");
  const isOrder = pathname.startsWith("/orders/");
  const isPlanning = pathname.startsWith("/invest/") || pathname.endsWith("/sell") || pathname === "/account/wallet/send";
  const currentStep = isOrder ? pathname.endsWith("/review") ? 1 : 2 : 0;
  const back = isAdmin ? { href: "/account", label: "Account" }
    : isWallet ? pathname === "/account/wallet" ? { href: "/account", label: "Account" } : { href: "/account/wallet", label: "Wallet" }
    : pathname === "/invest/basket" ? { href: "/saved", label: "Saved research" }
    : pathname.startsWith("/invest/") ? { href: "/discover", label: "Current listings" }
    : isPortfolio && pathname !== "/portfolio" ? { href: "/portfolio", label: "Portfolio" }
    : isSharing ? { href: "/saved", label: "Saved research" }
    : { href: "/discover", label: "Discover" };
  return <><div className="workspace-topline">
    <Link href={back.href as Route}><ArrowLeft size={15} aria-hidden="true" />Back to {back.label}</Link>
    <span><ShieldCheck size={15} aria-hidden="true" />{isAdmin ? "Owner workspace" : "Your research. Your decisions."}</span>
  </div>
    {isOrder || isPlanning ? <ol className="workspace-steps" aria-label="Transaction stages">
      {["Details", "Quote & review", "Outcome"].map((label, index) => <li key={label} aria-current={currentStep === index ? "step" : undefined}><span aria-hidden="true">0{index + 1}</span>{label}</li>)}
    </ol> : null}
  </>;
}

export function WorkspaceFooter() {
  return <footer className="workspace-footer"><span>Familiar products. A wider perspective.</span>
    <Link href="/learn">Build your understanding <ArrowUpRight size={15} aria-hidden="true" /></Link>
  </footer>;
}
