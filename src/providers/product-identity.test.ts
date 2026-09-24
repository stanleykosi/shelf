import { expect, it } from "vitest";
import { lookupBarcodeProduct } from "./product-identity";

it("uses a public barcode response only as a product-name clue", async () => {
  const send: typeof fetch = async (input) => {
    const host = new URL(String(input)).hostname;
    return new Response(JSON.stringify(host === "world.openfoodfacts.org"
      ? { status: 1, product: { product_name: "Cola", brands: "Sample Brand" } }
      : { status: 0 }), { status: 200 });
  };
  await expect(lookupBarcodeProduct("3017620422003", send)).resolves.toEqual({
    name: "Cola",
    brand: "Sample Brand",
    sourceUrl: "https://world.openfoodfacts.org/product/3017620422003",
  });
});
