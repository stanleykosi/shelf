"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { TextMorph } from "torph/react";
import { useLinkStatus } from "next/link";

/** A single motion treatment for real status changes, with Torph's reduced-motion support. */
function FeedbackText({ children }: { children: string }) {
  return <TextMorph className="feedback-morph" duration={250}
    ease="cubic-bezier(0.19, 1, 0.22, 1)" scale={false} respectReducedMotion>{children}</TextMorph>;
}

export function Spinner() {
  return <span className="shelf-spinner" aria-hidden="true" />;
}

/** Keep route guards outside streaming boundaries so redirects retain their HTTP status. */
export function NavigationProgress() {
  const { pending } = useLinkStatus();
  return <span className="navigation-progress" data-pending={pending}
    aria-hidden={!pending} role={pending ? "status" : undefined}
    aria-label={pending ? "Loading page" : undefined}><Spinner /></span>;
}

export function LoadingStatus({ children, page = false }: { children: string; page?: boolean }) {
  return <div className={`loading-feedback${page ? " loading-feedback-page" : ""}`} role="status" aria-live="polite" aria-atomic="true">
    <Spinner />
    <span aria-hidden="true"><FeedbackText>{children}</FeedbackText></span>
    <span className="feedback-sr-only">{children}</span>
  </div>;
}

/** Reserve both labels' space so morphing text never moves adjacent actions. */
export function PendingButton({ pending, pendingLabel = "Working…", children, icon, className = "", disabled, ...props }:
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { pending: boolean; pendingLabel?: string; children: string; icon?: ReactNode }) {
  const label = pending ? pendingLabel : children;
  return <button {...props} className={`pending-button ${className}`} disabled={disabled || pending}
    aria-busy={pending} aria-label={pending ? pendingLabel : props["aria-label"] ?? children}>
    <span className="pending-button-content" aria-hidden="true">
      <span className="pending-button-icon">
        {pending ? <Spinner /> : icon}
      </span>
      <span className="pending-button-label">
        <span className="pending-button-measure">{children}</span>
        <span className="pending-button-measure">{pendingLabel}</span>
        <FeedbackText>{label}</FeedbackText>
      </span>
    </span>
  </button>;
}
