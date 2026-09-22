import { notFound } from "next/navigation";
import {
  AllocationScreen,
  AssistantScreen,
  CompanyScreen,
  DiscoverScreen,
  LearnScreen,
  ProductScreen,
  ScanResultsScreen,
  ScanScreen,
  SearchScreen,
  ShelfScreen,
} from "@/components/screens/discovery";
import {
  EligibilityScreen,
  MagicCallbackScreen,
  SettingsScreen,
  SignInScreen,
  WalletScreen,
  WelcomeScreen,
} from "@/components/screens/account";
import {
  BasketScreen,
  BuyScreen,
  HistoryScreen,
  HoldingScreen,
  OrderReviewScreen,
  OrderStatusScreen,
  PortfolioScreen,
  RecordScreen,
  SellScreen,
  TransferScreen,
} from "@/components/screens/financial";
import { AdminScreen, ShareScreen } from "@/components/screens/operations";
import { MarketScreen } from "@/components/screens/markets";

type ScreenRouterProps = {
  segments: string[];
  query: Record<string, string | string[] | undefined>;
  supportContact?: string;
};

export function ScreenRouter({ segments, query, supportContact }: ScreenRouterProps) {
  const route = `/${segments.join("/")}`;

  if (route === "/") return <DiscoverScreen />;
  if (route === "/discover") return <SearchScreen initialCategory={stringValue(query.category)} />;
  if (route === "/markets") return <MarketScreen />;
  if (route === "/markets/public") return <MarketScreen lane="public" />;
  if (route === "/markets/private") return <MarketScreen lane="private" />;
  if (route === "/scan") return <ScanScreen />;
  if (route === "/scan/results") return <ScanResultsScreen />;
  if (segments[0] === "products" && segments[1]) return <ProductScreen productId={segments[1]} />;
  if (segments[0] === "companies" && segments[1]) return <CompanyScreen companyId={segments[1]} />;
  if (route === "/shelf") return <ShelfScreen />;
  if (route === "/shelf/share") return <ShareScreen />;
  if (route === "/learn") return <LearnScreen />;
  if (segments[0] === "learn" && segments[1]) return <LearnScreen slug={segments[1]} />;
  if (route === "/assistant") return <AssistantScreen />;
  if (route === "/invest/suggest") return <AllocationScreen />;
  if (route === "/sign-in")
    return <SignInScreen returnPath={stringValue(query.returnTo)} supportContact={supportContact} />;
  if (route === "/auth/callback") return <MagicCallbackScreen />;
  if (route === "/welcome") return <WelcomeScreen />;
  if (route === "/eligibility") return <EligibilityScreen />;
  if (route === "/wallet") return <WalletScreen />;
  if (route === "/wallet/deposit") return <WalletScreen deposit />;
  if (route === "/wallet/send") return <TransferScreen />;
  if (route === "/invest/buy") return <BuyScreen companyId={stringValue(query.companyId)} />;
  if (route === "/invest/basket") return <BasketScreen market={stringValue(query.market)} />;
  if (route === "/invest/sell") return <SellScreen instrumentId={stringValue(query.assetId)} />;
  if (segments[0] === "orders" && segments[1] && segments[2] === "review")
    return <OrderReviewScreen orderId={segments[1]} />;
  if (segments[0] === "orders" && segments[1]) return <OrderStatusScreen orderId={segments[1]} />;
  if (route === "/portfolio") return <PortfolioScreen />;
  if (segments[0] === "portfolio" && segments[1])
    return <HoldingScreen instrumentId={segments[1]} />;
  if (route === "/history") return <HistoryScreen />;
  if (segments[0] === "history" && segments[1])
    return <RecordScreen recordId={segments[1]} supportContact={supportContact} />;
  if (segments[0] === "share" && segments[1]) return <ShareScreen token={segments[1]} />;
  if (route === "/settings") return <SettingsScreen supportContact={supportContact} />;
  if (route === "/admin" || route.startsWith("/admin/")) return <AdminScreen />;

  notFound();
}

function stringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
