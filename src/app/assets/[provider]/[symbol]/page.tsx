import { notFound } from "next/navigation";
import { IssuerAssetScreen } from "@/components/screens/issuer-assets";

export default async function Page({ params }: {
  params: Promise<{ provider: string; symbol: string }>;
}) {
  const { provider, symbol } = await params;
  if (provider !== "xstocks" && provider !== "prestocks") notFound();
  return <IssuerAssetScreen provider={provider} symbol={symbol} />;
}
