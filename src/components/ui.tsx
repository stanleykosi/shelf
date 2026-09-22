import Link from "next/link";
import type { Route } from "next";

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children ? <div className="lede">{children}</div> : null}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <article className={`card ${className}`.trim()}>{children}</article>;
}

export function CtaLink({
  id,
  href,
  children,
  secondary = false,
}: {
  id: string;
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`button ${secondary ? "secondary" : ""}`}
      data-cta={id}
      href={href as Route}
    >
      {children}
    </Link>
  );
}

export function SupportAction({
  id,
  contact,
  children,
  subject,
}: {
  id: string;
  contact?: string;
  children: React.ReactNode;
  subject?: string;
}) {
  if (!contact) {
    return (
      <span>
        <button className="secondary" data-cta={id} disabled>
          {children}
        </button>
        <span className="hint">Support contact is not configured.</span>
      </span>
    );
  }

  const url = new URL(contact);
  if (subject && url.protocol === "mailto:") url.searchParams.set("subject", subject);

  return (
    <a className="button secondary" data-cta={id} href={url.toString()}>
      {children}
    </a>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className="muted">{children}</p>
      {action ? <div className="actions">{action}</div> : null}
    </Card>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p className="error" role="alert">
      {message}
    </p>
  ) : null;
}

export function ResultMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="result" role="status" aria-live="polite">
      {children}
    </div>
  );
}
