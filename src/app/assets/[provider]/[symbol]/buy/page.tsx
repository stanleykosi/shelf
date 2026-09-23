import { notFound } from "next/navigation";
import { IssuerBuyScreen } from "@/components/screens/issuer-assets";
import { requirePageUser } from "@/lib/page-auth";

export default async function Page({ params }: {
  params: Promise<{ provider: string; symbol: string }>;
}) {
  const { provider, symbol } = await params;
  if (provider !== "xstocks" && provider !== "prestocks") notFound();
  await requirePageUser(`/assets/${provider}/${encodeURIComponent(symbol)}/buy`);
  return <IssuerBuyScreen provider={provider} symbol={symbol} />;
}
