const approvedProducts = new Map([["https://www.apple.com/iphone/", "iPhone"]]);

export function productNameForApprovedUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("UNSUPPORTED_PRODUCT_URL");
  }

  const hasUnexpectedParts =
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== "";

  if (hasUnexpectedParts) throw new Error("UNSUPPORTED_PRODUCT_URL");

  const productName = approvedProducts.get(url.href);
  if (!productName) throw new Error("UNSUPPORTED_PRODUCT_URL");
  return productName;
}
