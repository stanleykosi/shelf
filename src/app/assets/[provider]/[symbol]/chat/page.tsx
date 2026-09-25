import { notFound } from "next/navigation";
import { IssuerChatScreen } from "@/components/screens/discovery";

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

  return <IssuerChatScreen issuer={{ provider, symbol }} />;
}
