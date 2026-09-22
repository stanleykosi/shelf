import Link from "next/link";
import { CircleUserRound, Compass, Landmark, LibraryBig, WalletCards } from "lucide-react";

const navigation = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/markets", label: "Markets", icon: Landmark },
  { href: "/shelf", label: "Shelf", icon: LibraryBig },
  { href: "/portfolio", label: "Portfolio", icon: WalletCards },
] as const;

export function AppShell({
  children,
  signedIn,
  environment,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  environment: "local" | "integration" | "private-beta";
}) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Shelf home">
          <span className="brand-mark">S</span>
          Shelf
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map(({ href, label }) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="actions">
          <span className="mode-badge">
            {environment === "private-beta" ? "Private beta" : environment}
          </span>
          <Link
            className="account-link"
            href={signedIn ? "/settings" : "/sign-in"}
            aria-label={signedIn ? "Account settings" : "Sign in"}
          >
            <CircleUserRound size={22} />
          </Link>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link className={label === "Markets" ? "scan-link" : ""} href={href} key={href}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
