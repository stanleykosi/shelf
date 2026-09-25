import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "@/components/studio-icons";

/** Shared navigation and pacing for the pages reached from Discover and Scan. */
export function ResearchJourney({ children, kind, className = "", backHref = "/discover", backLabel = "Back to Discover" }: {
  children: ReactNode;
  kind: string;
  className?: string;
  backHref?: Route;
  backLabel?: string;
}) {
  return <div className={`journey-page journey-${kind} ${className}`}>
    <div className="journey-topline">
      <Link href={backHref}><ArrowLeft size={15} aria-hidden="true" />{backLabel}</Link>
      <span><ShieldCheck size={15} aria-hidden="true" />Follow the connection. Check the source.</span>
    </div>
    {children}
    <footer className="journey-footnote">
      <span>Familiar products. A wider perspective.</span>
      <Link href="/scan">Start another discovery <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </footer>
  </div>;
}

export function JourneyHeading({ eyebrow, title, children }: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return <header className="journey-heading">
    <p className="studio-eyebrow"><span className="studio-marker" />{eyebrow}</p>
    <h1>{title}</h1>
    {children ? <div className="journey-heading-copy">{children}</div> : null}
  </header>;
}
