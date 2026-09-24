import { z } from "zod";

const productResponse = z.object({
  status: z.number(),
  product: z.object({
    product_name: z.string().optional(),
    brands: z.string().optional(),
  }).optional(),
});

const catalogs = [
  "world.openfoodfacts.org",
  "world.openbeautyfacts.org",
  "world.openproductsfacts.org",
];

export async function lookupBarcodeProduct(gtin: string, send: typeof fetch = fetch) {
  if (!/^\d{8,14}$/.test(gtin)) throw new Error("INVALID_BARCODE");
  const responses = await Promise.allSettled(catalogs.map(async (host) => {
    const endpoint = new URL(`https://${host}/api/v2/product/${gtin}.json`);
    endpoint.searchParams.set("fields", "product_name,brands");
    const response = await send(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Shelf/1.0 (https://shelf-one-phi.vercel.app)",
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("PRODUCT_LOOKUP_UNAVAILABLE");
    return { host, data: productResponse.parse(await response.json()) };
  }));
  const found = responses.flatMap((result) =>
    result.status === "fulfilled" && result.value.data.status === 1 && result.value.data.product
      ? [{ host: result.value.host, product: result.value.data.product }]
      : [],
  ).find(({ product }) => product.product_name?.trim());
  if (found) {
    return {
      name: found.product.product_name!.trim().slice(0, 120),
      brand: found.product.brands?.split(",")[0]?.trim().slice(0, 120) ?? "",
      sourceUrl: `https://${found.host}/product/${gtin}`,
    };
  }
  if (responses.every((result) => result.status === "rejected")) {
    throw new Error("PRODUCT_LOOKUP_UNAVAILABLE");
  }
  return null;
}
