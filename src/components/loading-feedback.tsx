import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Spinner() {
  return <span className="shelf-spinner" aria-hidden="true" />;
}

export function LoadingStatus({ children, page = false }: { children: ReactNode; page?: boolean }) {
  return <div className={`loading-feedback${page ? " loading-feedback-page" : ""}`} role="status">
    <Spinner /><span>{children}</span>
  </div>;
}

/** Keep the action's width and accessible name while preventing duplicate submissions. */
export function PendingButton({ pending, pendingLabel = "Working…", children, className = "", disabled, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { pending: boolean; pendingLabel?: string }) {
  return <button {...props} className={`pending-button ${className}`} disabled={disabled || pending}
    aria-busy={pending} aria-label={pending ? pendingLabel : props["aria-label"]}>
    <span className="pending-button-label" aria-hidden={pending || undefined}>{children}</span>
    {pending ? <span className="pending-button-indicator"><Spinner /></span> : null}
  </button>;
}
