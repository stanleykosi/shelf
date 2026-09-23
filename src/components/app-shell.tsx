"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
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

export function AppHeader({ activeSection, environment, signedIn }: { activeSection: PrimarySection | null; environment: "local" | "integration" | "private-beta"; signedIn: boolean }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="shelf-wordmark" href="/" aria-label="Shelf home"><ShelfMark /><span>Shelf</span></Link>
        <nav className="app-primary-nav" aria-label="Primary navigation">
          {primaryNavigation.map(({ href, label, section }) => <Link aria-current={activeSection === section ? "page" : undefined} className={activeSection === section ? "active" : ""} href={href as Route} key={href}>{label}</Link>)}
        </nav>
        <div className="app-header-actions">
          <Link className="header-scan" href="/scan"><ScanLine size={16} aria-hidden="true" /><span>Scan</span></Link>
          <Link className="header-search" href="/discover?focus=search" aria-label="Search Shelf"><Search size={18} aria-hidden="true" /><span>Search</span><kbd>⌘K</kbd></Link>
          <span className="environment-status"><i aria-hidden="true" />{environment === "private-beta" ? "beta" : environment}</span>
          <Link className="header-account" href={signedIn ? "/account" : "/sign-in"} aria-label={signedIn ? "Account" : "Sign in"}><CircleUserRound size={19} aria-hidden="true" /><span>{signedIn ? "Account" : "Sign in"}</span></Link>
        </div>
      </div>
    </header>
  );
}

export function MobileNavigation({ activeSection }: { activeSection: PrimarySection | null }) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      {mobileNavigation.map(({ href, label, section, icon: Icon }) => <Link aria-current={activeSection === section ? "page" : undefined} className={activeSection === section ? "active" : ""} href={href as Route} key={href}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>)}
    </nav>
  );
}

export function AppShell({ children, signedIn, environment }: { children: React.ReactNode; signedIn: boolean; environment: "local" | "integration" | "private-beta" }) {
  const activeSection = activePrimarySection(usePathname());
  return (
    <div className="application-shell">
      <AppHeader activeSection={activeSection} environment={environment} signedIn={signedIn} />
      <main className="application-main">{children}</main>
      <MobileNavigation activeSection={activeSection} />
    </div>
  );
}
