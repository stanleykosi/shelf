"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Share, WalletCards, X } from "@/components/studio-icons";

const tasks = {
  send: {
    eyebrow: "Your wallet · Solana",
    title: "Send assets",
    description: "Check the complete destination. Transfers are irreversible and do not count as sales.",
    Icon: ArrowUpRight,
  },
  sell: {
    eyebrow: "Your portfolio",
    title: "Sell to USDC",
    description: "Choose a quantity to review. Sell all uses your exact tracked amount, including any units hidden by rounding.",
    Icon: WalletCards,
  },
  share: {
    eyebrow: "A little inspiration, shared",
    title: "Share your research",
    description: "Create a seven-day snapshot. Anyone with the link can view your selection until it expires or you revoke it.",
    Icon: Share,
  },
} as const;

/** A route-backed task keeps its source page mounted and its URL shareable. */
export function TaskDialog({ task, children }: { task: keyof typeof tasks; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dismissingRef = useRef(false);
  const { eyebrow, title, description, Icon } = tasks[task];

  // Radix retains the panel for its exit animation. This fallback also handles
  // a browser or extension that disables CSS animations altogether.
  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      if (!dismissingRef.current) {
        dismissingRef.current = true;
        router.back();
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, router]);

  function finishClose() {
    if (!open && !dismissingRef.current) {
      dismissingRef.current = true;
      router.back();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="task-dialog-overlay">
          <Dialog.Content
            className="task-dialog workspace-shell"
            data-task={task}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
              headingRef.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              // There is no Radix Trigger: the opener is a real Next.js Link.
              if (openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true });
            }}
            onEscapeKeyDown={(event) => {
              // Keyboard dismissal should be immediate, without waiting for motion.
              event.preventDefault();
              router.back();
            }}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) finishClose();
            }}
          >
            <div className="task-dialog-grip" aria-hidden="true" />
            <header className="task-dialog-header">
              <span className="task-dialog-emblem"><Icon size={23} aria-hidden="true" /></span>
              <p className="task-dialog-eyebrow">{eyebrow}</p>
              <Dialog.Title ref={headingRef} tabIndex={-1}>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
              <Dialog.Close className="task-dialog-close" aria-label={`Close ${task} dialog`}>
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </header>
            <div className="task-dialog-body research-workspace">{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
