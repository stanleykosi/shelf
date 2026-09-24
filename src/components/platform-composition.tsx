import type { ReactNode } from "react";

/** Narrative ground, not a card or a prescribed column layout. */
export function ResearchCanvas({ children }: { children: ReactNode }) {
  return <div className="platform-canvas company-canvas">{children}</div>;
}

/** A task-specific environment; its children determine the spatial hierarchy. */
export function WorkspaceFrame({ kind, children }: { kind: "assistant" | "settings"; children: ReactNode }) {
  return <div className={`platform-canvas ${kind}-workspace`}>{children}</div>;
}

/** A deliberate change of context within a research narrative. */
export function ResearchBand({ id, children }: { id: string; children: ReactNode }) {
  return <section id={id} className="platform-research-band">{children}</section>;
}
