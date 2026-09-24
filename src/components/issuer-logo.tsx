"use client";

import Image from "next/image";
import { useState } from "react";
import { issuerLogoUrl } from "@/providers/issuer-logo";

export function IssuerLogo({
  imageUrl,
  name,
  source,
  large = false,
  eager = false,
}: {
  imageUrl?: string;
  name: string;
  source: "xstocks" | "prestocks";
  large?: boolean;
  eager?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const safeImageUrl = issuerLogoUrl(imageUrl, source);
  const showImage = Boolean(safeImageUrl && safeImageUrl !== failedImage);
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join("").toUpperCase();

  return (
    <span aria-hidden="true" className={large ? "issuer-logo issuer-logo-large" : "issuer-logo"}>
      {(!showImage || loadedImage !== safeImageUrl) && <span>{initials || "?"}</span>}
      {showImage && safeImageUrl && (
        <Image
          alt=""
          className={loadedImage === safeImageUrl ? undefined : "issuer-logo-pending"}
          height={large ? 72 : 52}
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailedImage(safeImageUrl)}
          onLoad={() => setLoadedImage(safeImageUrl)}
          src={safeImageUrl}
          unoptimized={source === "prestocks"}
          width={large ? 72 : 52}
        />
      )}
    </span>
  );
}
