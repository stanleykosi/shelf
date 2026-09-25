"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSelectedLayoutSegments } from "next/navigation";
import { Bookmark as StudioBookmark, CircleUserRound as StudioAccount, Compass as StudioCompass, ScanLine as StudioScan, WalletCards as StudioWallet } from "@/components/studio-icons";
import { HeaderSearch } from "@/components/header-search";
import { WorkspaceNavigation, WorkspaceFooter } from "@/components/workspace-navigation";
import { activePrimarySection, type PrimarySection } from "@/lib/routes";
import { Sparkles as StudioSparkles } from "@/components/studio-icons";

const primaryNavigation: Array<{ href: string; label: string; section: PrimarySection }> = [
  { href: "/discover", label: "Discover", section: "discover" },
  { href: "/saved", label: "Saved", section: "saved" },
  { href: "/portfolio", label: "Portfolio", section: "portfolio" },
  { href: "/assistant", label: "Assistant", section: "assistant" },
];

const mobileNavigation = [
  primaryNavigation[0],
  { href: "/scan", label: "Scan", section: "scan" as const },
  primaryNavigation[1],
  primaryNavigation[2],
  primaryNavigation[3],
];

const studioNavigationIcons = {
  discover: StudioCompass,
  scan: StudioScan,
  saved: StudioBookmark,
  portfolio: StudioWallet,
  assistant: StudioSparkles,
};

function ShelfMark() {
  return <span className="shelf-mark" aria-hidden="true"><span /><span /><span /></span>;
}

export function AppHeader({ activeSection, signedIn }: { activeSection: PrimarySection | null; signedIn: boolean }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="shelf-wordmark" href="/" aria-label="Shelf home"><ShelfMark /><span>Shelf</span></Link>
        <nav className="app-primary-nav" aria-label="Primary navigation">
          {primaryNavigation.map(({ href, label, section }) => <Link aria-current={activeSection === section ? "page" : undefined} className={activeSection === section ? "active" : ""} href={href as Route} key={href}>{label}</Link>)}
        </nav>
        <div className="app-header-actions">
          <Link className="header-scan" href="/scan"><StudioScan size={16} aria-hidden="true" /><span>Scan</span></Link>
          <HeaderSearch />
          <Link className="header-account" href={signedIn ? "/account" : "/sign-in"} aria-label={signedIn ? "Account" : "Sign in"}><StudioAccount size={19} aria-hidden="true" /><span>{signedIn ? "Account" : "Sign in"}</span></Link>
        </div>
      </div>
    </header>
  );
}

export function MobileNavigation({ activeSection }: { activeSection: PrimarySection | null }) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      {mobileNavigation.map(({ href, label, section }) => {
        const NavigationIcon = studioNavigationIcons[section];
        return <Link aria-current={activeSection === section ? "page" : undefined} className={activeSection === section ? "active" : ""} href={href as Route} key={href}><NavigationIcon size={19} aria-hidden="true" /><span>{label}</span></Link>;
      })}
    </nav>
  );
}

export function AppShell({ children, signedIn }: { children: React.ReactNode; signedIn: boolean }) {
  const contentSegments = useSelectedLayoutSegments();
  // An intercepted task changes the URL while the main workspace remains in place.
  const pathname = `/${contentSegments.filter((segment) => !segment.startsWith("(")).join("/")}`;
  const landingOrDiscover = pathname === "/" || pathname === "/discover";
  const researchWorkspace = !landingOrDiscover && !pathname.startsWith("/scan");
  const activeSection = activePrimarySection(pathname);
  const researchJourney = pathname === "/scan/results" || pathname === "/learn" ||
    ["/products/", "/brands/", "/companies/", "/assets/", "/learn/"].some((prefix) => pathname.startsWith(prefix));
  const workspacePage = !landingOrDiscover && pathname !== "/scan" && !researchJourney;
  return (
    <div className={"application-shell concept-two-shell" + (researchJourney ? " journey-shell" : "") + (workspacePage ? " workspace-shell" : "")}>
      <AppHeader activeSection={activeSection} signedIn={signedIn} />
      <main className={"application-main" + (researchWorkspace ? " research-workspace" : "")} data-workspace={workspacePage ? pathname.split("/")[1] : undefined}>{workspacePage ? <WorkspaceNavigation pathname={pathname} /> : null}{children}{workspacePage ? <WorkspaceFooter /> : null}</main>
      <MobileNavigation activeSection={activeSection} />
    </div>
  );
}
