"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useNotification } from "@/components/notifications";

/** A clipboard action confirms success only after the browser accepts the write. */
export function CopyButton({
  value,
  label = "Copy to clipboard",
  copiedLabel = "Copied to clipboard",
  showLabel = false,
  disabled = false,
  className = "",
  cta,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
  cta?: string;
}) {
  const notify = useNotification();
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const copied = copiedValue === value;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy() {
    if (pending || disabled || !value) return;
    setPending(true);
    try {
      await navigator.clipboard.writeText(value);
      if (!mounted.current) return;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      setCopiedValue(value);
      resetTimer.current = setTimeout(() => setCopiedValue(null), 2200);
    } catch {
      if (mounted.current) {
        setCopiedValue(null);
        notify("Clipboard access was blocked. Select and copy the text manually.", "error");
      }
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`copy-button secondary ${className}`.trim()}
        aria-label={copied ? copiedLabel : label}
        title={copied ? copiedLabel : label}
        aria-busy={pending}
        data-copied={copied}
        data-cta={cta}
        disabled={disabled || pending || !value}
        onClick={() => void copy()}
      >
        <span className="copy-button-icons" aria-hidden="true">
          <DocumentDuplicateIcon className="copy-button-original" />
          <CheckIcon className="copy-button-check" />
        </span>
        {showLabel ? <span>{copied ? "Copied" : label}</span> : null}
      </button>
      <span className="copy-announcement" role="status" aria-live="polite">{copied ? copiedLabel : ""}</span>
    </>
  );
}
