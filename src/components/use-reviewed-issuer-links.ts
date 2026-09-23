"use client";

import { useEffect, useState } from "react";
import type { ReviewedIssuerLinks } from "@/domain/issuer-assets";
import { apiRequest } from "@/lib/api-client";

export function useReviewedIssuerLinks() {
  const [links, setLinks] = useState<ReviewedIssuerLinks | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<ReviewedIssuerLinks>("issuer/reviewed")
      .then((response) => {
        if (active) setLinks(response);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Issuer feeds unavailable");
      });
    return () => { active = false; };
  }, []);

  return { links, error };
}
