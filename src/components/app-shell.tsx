"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, CircleUserRound, Compass, ScanLine, Search, WalletCards } from "lucide-react";
import { activePrimarySection, type PrimarySection } from "@/lib/routes";

const primaryNavigation: Array<{ href: string; label: string; section: PrimarySection; icon: typeof Compass }> = [
  { href: "/discover", label: "Discover", section: "discover", icon: Compass },
  { href: "/saved", label: "Saved", section: "saved", icon: Bookmark },
  { href: "/portfolio", label: "Portfolio", section: "portfolio", icon: WalletCards },
];

const mobileNavigation = [
  primaryNavigation[0],
  { href: "/scan", label: "Scan", section: "scan" as const, icon: ScanLine },
  primaryNavigation[1],
  primaryNavigation[2],
];

function ShelfMark() {
  return <span className="shelf-mark" aria-hidden="true"><span /><span /><span /></span>;
}

export function AppHeader({ activeSection, environment, signedIn, conceptTwo = false }: { activeSection: PrimarySection | null; environment: "local" | "integration" | "private-beta"; signedIn: boolean; conceptTwo?: boolean }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="shelf-wordmark" href={conceptTwo ? "/?concept=2" : "/"} aria-label="Shelf home"><ShelfMark /><span>Shelf</span></Link>
        <nav className="app-primary-nav" aria-label="Primary navigation">
          {primaryNavigation.map(({ href, label, section }) => <Link aria-current={activeSection === section ? "page" : undefined} className={activeSection === section ? "active" : ""} href={(conceptTwo && section === "discover" ? href + "?concept=2" : href) as Route} key={href}>{label}</Link>)}
        </nav>
        <div className="app-header-actions">
          <Link className="header-scan" href="/scan"><ScanLine size={16} aria-hidden="true" /><span>Scan</span></Link>
          <Link className="header-search" href={conceptTwo ? "/discover?concept=2&focus=search" : "/discover?focus=search"} aria-label="Search Shelf"><Search size={18} aria-hidden="true" /><span>Search</span><kbd>⌘K</kbd></Link>
          <span className="environment-status"><i aria-hidden="true" />{environment === "private-beta" ? "beta" : environment}</span>
          <Link className="header-account" href={signedIn ? "/account" : "/sign-in"} aria-label={signedIn ? "Account" : "Sign in"}><CircleUserRound size={19} aria-hidden="true" /><span>{signedIn ? "Account" : "Sign in"}</span></Link>
        </div>
      </div>
    </header>
  );
}

export function MobileNavigation({ activeSection, conceptTwo = false }: { activeSection: PrimarySection | null; conceptTwo?: boolean }) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      {mobileNavigation.map(({ href, label, section, icon: Icon }) => <Link aria-current={activeSection === section ? "page" : undefined} className={activeSection === section ? "active" : ""} href={(conceptTwo && section === "discover" ? href + "?concept=2" : href) as Route} key={href}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>)}
    </nav>
  );
}

export function AppShell({ children, signedIn, environment }: { children: React.ReactNode; signedIn: boolean; environment: "local" | "integration" | "private-beta" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const comparisonPage = pathname === "/" || pathname === "/discover";
  const conceptTwo = (comparisonPage && searchParams.get("concept") === "2") || pathname === "/scan" || pathname === "/scan/results";
  const activeSection = activePrimarySection(pathname);
  function comparisonHref(concept: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (concept === "2") params.set("concept", "2");
    else params.delete("concept");
    return (pathname + (params.size ? "?" + params.toString() : "")) as Route;
  }
  return (
    <div className={"application-shell" + (conceptTwo ? " concept-two-shell" : "")}>
      {comparisonPage ? <nav className="concept-comparison" aria-label="Design comparison">
        <span>Design study</span>
        <Link href={comparisonHref("1")} aria-current={!conceptTwo ? "page" : undefined}>01 <span>Concept 1</span></Link>
        <Link href={comparisonHref("2")} aria-current={conceptTwo ? "page" : undefined}>02 <span>Concept 2</span></Link>
      </nav> : null}
      <AppHeader activeSection={activeSection} environment={environment} signedIn={signedIn} conceptTwo={conceptTwo} />
      <main className="application-main">{children}</main>
      <MobileNavigation activeSection={activeSection} conceptTwo={conceptTwo} />
    </div>
  );
}
