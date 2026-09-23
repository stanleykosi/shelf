"use client";

import Image from "next/image";
import { useState } from "react";
import { issuerLogoUrl } from "@/providers/issuer-logo";

export function IssuerLogo({
  imageUrl,
  name,
  source,
  large = false,
}: {
  imageUrl?: string;
  name: string;
  source: "xstocks" | "prestocks";
  large?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const safeImageUrl = issuerLogoUrl(imageUrl, source);
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join("").toUpperCase();

  return (
    <span aria-hidden="true" className={large ? "issuer-logo issuer-logo-large" : "issuer-logo"}>
      {safeImageUrl && safeImageUrl !== failedImage ? (
        <Image
          alt=""
          height={large ? 72 : 52}
          onError={() => setFailedImage(safeImageUrl)}
          src={safeImageUrl}
          width={large ? 72 : 52}
        />
      ) : <span>{initials || "?"}</span>}
    </span>
  );
}
