import { notFound } from "next/navigation";
import { IssuerAssistantScreen } from "@/components/screens/issuer-assistant";

export default async function Page({ params }: {
  params: Promise<{ provider: string; symbol: string }>;
}) {
  const { provider, symbol } = await params;
  if (
    (provider !== "xstocks" && provider !== "prestocks") ||
    !/^[A-Za-z0-9.-]{1,32}$/.test(symbol)
  ) {
    notFound();
  }

  return <IssuerAssistantScreen issuer={{ provider, symbol }} />;
}
