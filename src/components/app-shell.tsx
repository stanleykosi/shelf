"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  CircleUserRound,
  Compass,
  ScanLine,
  Search,
  WalletCards,
} from "lucide-react";
import { activePrimarySection, type PrimarySection } from "@/lib/routes";

const primaryNavigation: Array<{
  href: string;
  label: string;
  section: PrimarySection;
  icon: typeof Compass;
}> = [
  { href: "/", label: "Discover", section: "discover", icon: Compass },
  { href: "/saved", label: "Saved", section: "saved", icon: Bookmark },
  { href: "/portfolio", label: "Portfolio", section: "portfolio", icon: WalletCards },
];

const mobileNavigation = [
  primaryNavigation[0],
  { href: "/scan", label: "Scan", section: "scan" as const, icon: ScanLine },
  primaryNavigation[1],
  primaryNavigation[2],
];

export function AppShell({
  children,
  signedIn,
  environment,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  environment: "local" | "integration" | "private-beta";
}) {
  const pathname = usePathname();
  const activeSection = activePrimarySection(pathname);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Shelf home">
          <span className="brand-mark">S</span>
          Shelf
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryNavigation.map(({ href, label, section }) => (
            <Link
              aria-current={activeSection === section ? "page" : undefined}
              className={activeSection === section ? "active" : undefined}
              href={href as Route}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="actions shell-actions">
          <Link
            aria-current={activeSection === "scan" ? "page" : undefined}
            className="button shell-scan-action"
            href="/scan"
          >
            <ScanLine size={18} aria-hidden="true" />
            Scan a product
          </Link>
          <Link className="shell-search-action" href="/discover" aria-label="Search Shelf">
            <Search size={20} aria-hidden="true" />
          </Link>
          <span className="mode-badge">
            {environment === "private-beta" ? "Private beta" : environment}
          </span>
          <Link
            className="account-link"
            href={signedIn ? "/account" : "/sign-in"}
            aria-label={signedIn ? "Account" : "Sign in"}
          >
            <CircleUserRound size={22} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {mobileNavigation.map(({ href, label, section, icon: Icon }) => (
          <Link
            aria-current={activeSection === section ? "page" : undefined}
            className={`${section === "scan" ? "scan-link" : ""}${
              activeSection === section ? " active" : ""
            }`}
            href={href as Route}
            key={href}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
