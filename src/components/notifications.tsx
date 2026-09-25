"use client";

import { useCallback, useId } from "react";
import { Toaster, toast } from "sonner";
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@/components/loading-feedback";

/** One notification per interaction surface; a repeat action replaces its previous message. */
export function useNotification() {
  const id = useId();
  return useCallback((message: string, kind: "success" | "error" | "info" = "info") => {
    if (!message) { toast.dismiss(id); return; }
    const title = kind === "success" ? "All set" : kind === "error" ? "Needs attention" : "Shelf update";
    toast[kind](title, { id, description: message, duration: kind === "error" ? 7000 : 4500 });
  }, [id]);
}

export function Notifications() {
  return <Toaster position="bottom-right" closeButton visibleToasts={3} duration={4500}
    offset={24} mobileOffset={{ bottom: 88, left: 18, right: 18 }}
    toastOptions={{ className: "shelf-toast" }}
    icons={{ success: <CheckCircleIcon />, error: <ExclamationCircleIcon />, info: <InformationCircleIcon />,
      close: <XMarkIcon />, loading: <Spinner /> }} />;
}
