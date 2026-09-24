import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { saveIssuerDirectory } from "@/db/issuer-directory";
import { buildIssuerDirectory } from "@/domain/issuer-spotlight";
import { env } from "@/lib/env";
import { LivePreStocksProvider } from "@/providers/prestocks";
import { LiveXStocksProvider } from "@/providers/xstocks";

export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!env.WORKER_SHARED_SECRET || !supplied) return false;
  const expectedHash = createHash("sha256").update(env.WORKER_SHARED_SECRET).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const [publicFeed, privateFeed] = await Promise.allSettled([
    new LiveXStocksProvider(env.XSTOCKS_API_BASE_URL).listings(),
    new LivePreStocksProvider(env.PRESTOCKS_API_URL).listings(),
  ]);
  let refreshed = 0;

  if (publicFeed.status === "fulfilled") {
    const directory = buildIssuerDirectory({
      listings: publicFeed.value.map((asset) => ({ provider: "xstocks" as const, asset })),
      unavailable: [],
      stale: [],
    });
    await saveIssuerDirectory("xstocks", directory.listings);
    refreshed += 1;
  }

  if (privateFeed.status === "fulfilled") {
    const directory = buildIssuerDirectory({
      listings: privateFeed.value.map((asset) => ({ provider: "prestocks" as const, asset })),
      unavailable: [],
      stale: [],
    });
    await saveIssuerDirectory("prestocks", directory.listings);
    refreshed += 1;
  }

  if (refreshed !== 2) {
    return NextResponse.json({ error: "ISSUER_DIRECTORY_REFRESH_INCOMPLETE", refreshed }, { status: 503 });
  }
  return NextResponse.json({ data: { refreshed } });
}
