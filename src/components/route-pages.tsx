import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Route } from "next";
import { preload } from "react-dom";
import {
  AssistantScreen,
  LearnScreen,
  ProductScreen,
  ScanResultsScreen,
  ScanScreen,
  ShelfScreen,
} from "@/components/screens/discovery";
import {
  ConceptDiscoverScreen,
  ConceptHomeScreen,
} from "@/components/screens/concept-discovery";
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
import {
  articles,
  brandBySlug,
  companyById,
  companyByInstrumentId,
  companyBySlug,
  productById,
  productBySlug,
} from "@/data/catalog";
import { readIssuerDirectory } from "@/db/issuer-directory";
import { selectFeaturedCompanies, type DirectoryListing } from "@/domain/issuer-spotlight";
import { state } from "@/domain/store";
import { env } from "@/lib/env";
import { requirePageUser } from "@/lib/page-auth";
import { legacyRedirectFor, safeReturnTo } from "@/lib/routes";

type Query = Record<string, string | string[] | undefined>;
type AsyncQuery = Promise<Query>;
type AsyncParams<T> = Promise<T>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toSearchParams(query: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}

function withQuery(pathname: string, query: Query) {
  const params = toSearchParams(query).toString();
  return params ? `${pathname}?${params}` : pathname;
}

export function HomePage() {
  return <ConceptHomeScreen />;
}

export async function DiscoverPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  if (first(query.source) === "issuer") {
    const currentQuery = { ...query };
    delete currentQuery.source;
    permanentRedirect(withQuery("/discover", { ...currentQuery, focus: "search" }) as Route);
  }
  if (!first(query.q)) {
    preload("/api/v1/issuer/directory", { as: "fetch", crossOrigin: "anonymous" });
  }
  const startsWithFeatured = !first(query.q) && first(query.view) !== "all" &&
    !first(query.sector) && !first(query.market) && !first(query.sort) &&
    Number(first(query.page) ?? 1) === 1;
  let initialFeatured: DirectoryListing[] = [];
  if (startsWithFeatured) {
    try {
      const directory = await readIssuerDirectory();
      if (directory && !directory.stale.length && !directory.unavailable.length) {
        initialFeatured = selectFeaturedCompanies(directory.listings);
      }
    } catch {
      // The browser can still load the public directory endpoint when PostgreSQL is unavailable.
    }
  }
  return (
    <ConceptDiscoverScreen
      initialFeatured={initialFeatured}
      key={first(query.q) ?? ""}
      initialMarket={first(query.market)}
      initialPage={first(query.page)}
      initialQuery={first(query.q)}
      initialSector={first(query.sector)}
      initialSort={first(query.sort)}
      initialView={first(query.view)}
    />
  );
}

export function ScanPage() {
  return <ScanScreen />;
}

export function ScanResultsPage() {
  return <ScanResultsScreen />;
}

export async function ProductPage({ params }: { params: AsyncParams<{ slug: string }> }) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (product) return <ProductScreen productId={product.id} />;
  const legacyProduct = productById(slug);
  if (legacyProduct) permanentRedirect(`/products/${legacyProduct.slug}`);
  notFound();
}

export async function BrandPage({ params }: { params: AsyncParams<{ slug: string }> }) {
  const { slug } = await params;
  const brand = brandBySlug(slug);
  if (!brand) notFound();
  permanentRedirect(`/discover?q=${encodeURIComponent(brand.name)}`);
}

export async function CompanyPage({ params }: { params: AsyncParams<{ slug: string }> }) {
  const { slug } = await params;
  const company = companyBySlug(slug);
  if (!company) {
    const legacyCompany = companyById(slug);
    if (legacyCompany) permanentRedirect(`/companies/${legacyCompany.slug}`);
    notFound();
  }
  permanentRedirect(`/discover?q=${encodeURIComponent(company.name)}`);
}

export function LearnPage() {
  return <LearnScreen />;
}

export async function LearningArticlePage({ params }: { params: AsyncParams<{ slug: string }> }) {
  const { slug } = await params;
  if (!articles.some((article) => article.slug === slug)) notFound();
  return <LearnScreen slug={slug} />;
}

export function AssistantPage() {
  return <AssistantScreen />;
}

export function SavedPage() {
  return <ShelfScreen />;
}

export async function SavedSharePage() {
  await requirePageUser("/saved/share");
  return <ShareScreen />;
}

export async function SharedSnapshotPage({ params }: { params: AsyncParams<{ token: string }> }) {
  const { token } = await params;
  return <ShareScreen token={token} />;
}

export async function SignInPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  return (
    <SignInScreen
      returnPath={safeReturnTo(first(query.returnTo))}
      supportContact={env.SUPPORT_CONTACT}
    />
  );
}

export function AuthCallbackPage() {
  return <MagicCallbackScreen />;
}

export async function OnboardingPage() {
  await requirePageUser("/onboarding");
  return <WelcomeScreen />;
}

export async function AvailabilityPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  const returnTo = safeReturnTo(first(query.returnTo), "/account");
  await requirePageUser(`/onboarding/availability?returnTo=${encodeURIComponent(returnTo)}`);
  return <EligibilityScreen />;
}

export async function AccountPage() {
  await requirePageUser("/account");
  return <SettingsScreen supportContact={env.SUPPORT_CONTACT} />;
}

export async function WalletPage() {
  await requirePageUser("/account/wallet");
  return <WalletScreen />;
}

export async function DepositPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  await requirePageUser(withQuery("/account/wallet/deposit", query));
  return <WalletScreen deposit />;
}

export async function SendPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  await requirePageUser(withQuery("/account/wallet/send", query));
  return <TransferScreen />;
}

export async function InvestmentPage({ params }: { params: AsyncParams<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const company = companyBySlug(companySlug);
  if (!company) {
    const legacyCompany = companyById(companySlug);
    if (legacyCompany) permanentRedirect(`/invest/${legacyCompany.slug}`);
    notFound();
  }
  if (company.instrument) {
    redirect(`/assets/${company.instrument.provider}/${encodeURIComponent(company.instrument.symbol)}/buy` as Route);
  }
  notFound();
}

export async function BasketPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  await requirePageUser(withQuery("/invest/basket", query));
  return <BasketScreen market={first(query.market)} />;
}

export async function OrderReviewPage({ params }: { params: AsyncParams<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/orders/${id}/review`);
  if (state.orders.get(id)?.userId !== user.id) notFound();
  return <OrderReviewScreen orderId={id} />;
}

export async function OrderStatusPage({ params }: { params: AsyncParams<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/orders/${id}`);
  if (state.orders.get(id)?.userId !== user.id) notFound();
  return <OrderStatusScreen orderId={id} />;
}

export async function PortfolioPage() {
  await requirePageUser("/portfolio");
  return <PortfolioScreen />;
}

export async function HoldingPage({ params }: { params: AsyncParams<{ instrumentId: string }> }) {
  const { instrumentId } = await params;
  const user = await requirePageUser(`/portfolio/${instrumentId}`);
  if (!user.holdings.some((holding) => holding.instrumentId === instrumentId)) notFound();
  return <HoldingScreen instrumentId={instrumentId} />;
}

export async function SellPage({ params }: { params: AsyncParams<{ instrumentId: string }> }) {
  const { instrumentId } = await params;
  const user = await requirePageUser(`/portfolio/${instrumentId}/sell`);
  if (!user.holdings.some((holding) => holding.instrumentId === instrumentId)) notFound();
  return <SellScreen instrumentId={instrumentId} />;
}

export async function ActivityPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  await requirePageUser(withQuery("/portfolio/activity", query));
  return <HistoryScreen />;
}

export async function ActivityRecordPage({ params }: { params: AsyncParams<{ recordId: string }> }) {
  const { recordId } = await params;
  const user = await requirePageUser(`/portfolio/activity/${recordId}`);
  if (!user.records.some((record) => record.id === recordId)) notFound();
  return <RecordScreen recordId={recordId} supportContact={env.SUPPORT_CONTACT} />;
}

export async function AdminPage() {
  await requirePageUser("/admin", true);
  return <AdminScreen />;
}

export async function AdminCatalogPage() {
  await requirePageUser("/admin/catalog", true);
  return <AdminScreen />;
}

export async function AdminAccessPage() {
  await requirePageUser("/admin/access", true);
  return <AdminScreen />;
}

export async function AdminOperationsPage() {
  await requirePageUser("/admin/operations", true);
  return <AdminScreen />;
}

export async function AdminAuditPage() {
  await requirePageUser("/admin/audit", true);
  return <AdminScreen />;
}

export async function LegacyRedirectPage({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams: AsyncQuery;
}) {
  const redirectRule = legacyRedirectFor(pathname, toSearchParams(await searchParams));
  if (!redirectRule) notFound();
  if (redirectRule.permanent) permanentRedirect(redirectRule.destination as Route);
  redirect(redirectRule.destination as Route);
}

export async function LegacyHistoryRecordPage({ params }: { params: AsyncParams<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/portfolio/activity/${id}`);
}

export async function LegacyBuyPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  const companyId = first(query.companyId);
  const company = companyId ? companyById(companyId) : undefined;
  if (!company) notFound();
  permanentRedirect(`/invest/${company.slug}`);
}

export async function LegacySellPage({ searchParams }: { searchParams: AsyncQuery }) {
  const query = await searchParams;
  const instrumentId = first(query.assetId);
  if (!instrumentId || !companyByInstrumentId(instrumentId)) notFound();
  permanentRedirect(`/portfolio/${instrumentId}/sell`);
}

export const MarketsLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/markets", ...props });
export const PublicMarketsLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/markets/public", ...props });
export const PrivateMarketsLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/markets/private", ...props });
export const ShelfLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/shelf", ...props });
export const ShelfShareLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/shelf/share", ...props });
export const WalletLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/wallet", ...props });
export const DepositLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/wallet/deposit", ...props });
export const SendLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/wallet/send", ...props });
export const HistoryLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/history", ...props });
export const SettingsLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/settings", ...props });
export const WelcomeLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/welcome", ...props });
export const EligibilityLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/eligibility", ...props });
export const SuggestLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/invest/suggest", ...props });
export const AdminStatusLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/admin/status", ...props });
export const AdminInvitesLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/admin/invites", ...props });
export const AdminOrdersLegacyPage = (props: { searchParams: AsyncQuery }) =>
  LegacyRedirectPage({ pathname: "/admin/orders", ...props });
