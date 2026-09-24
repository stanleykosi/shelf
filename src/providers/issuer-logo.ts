type IssuerSource = "xstocks" | "prestocks";

export function issuerLogoUrl(value: unknown, source: IssuerSource): string | undefined {
  if (typeof value !== "string") return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.search || url.hash) {
      return undefined;
    }

    if (source === "xstocks") {
      const isIssuerLogo = url.hostname === "xstocks-metadata.backed.fi" &&
        /^\/logos\/tokens\/[A-Za-z0-9.-]+\.png$/.test(url.pathname);
      return isIssuerLogo ? url.href : undefined;
    }

    const isIssuerLogo = ["prestocks.com", "www.prestocks.com"].includes(url.hostname) &&
      /^\/logos\/[A-Za-z0-9-]+\.png$/.test(url.pathname);
    return isIssuerLogo ? `https://prestocks.com${url.pathname}` : undefined;
  } catch {
    return undefined;
  }
}
