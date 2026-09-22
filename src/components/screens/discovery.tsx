"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { articles, companies, companyById, productById, products, sources } from "@/data/catalog";
import type { MarketFeed } from "@/domain/market-data";
import type { Category, Company, MarketHistoryPoint, RecognitionMatch } from "@/domain/types";
import type { PreStocksListing } from "@/providers/prestocks";
import type { XStocksListing } from "@/providers/xstocks";
import { apiRequest, authenticationIsRequired, postJson } from "@/lib/api-client";
import { MarketHistoryChart } from "@/components/screens/markets";
import {
  Card,
  CtaLink,
  EmptyState,
  ErrorMessage,
  Field,
  PageIntro,
  ResultMessage,
} from "@/components/ui";

const categoryLabels: Record<Category, string> = {
  groceries: "Groceries",
  beauty: "Beauty",
  electronics: "Electronics",
  clothing: "Clothing",
  household: "Household",
};

export function DiscoverScreen() {
  return (
    <>
      <PageIntro
        eyebrow="Discover what you already know"
        title="Scan a product. Discover the company."
      >
        <p>
          Trace familiar products to reviewed parent-company relationships, learn what the
          connection means, and decide whether to save or explore it.
        </p>
      </PageIntro>
      <div className="hero-actions">
        <CtaLink id="C01" href="/scan">
          Scan a product
        </CtaLink>
        <CtaLink id="C02" href="/discover?focus=search" secondary>
          Search products
        </CtaLink>
      </div>
      <section className="section">
        <div className="chips" aria-label="Browse by category">
          {(Object.keys(categoryLabels) as Category[]).map((category) => (
            <Link className="chip" href={`/discover?category=${category}`} key={category}>
              {categoryLabels[category]}
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">Two verified issuer sources</p>
        <h2>Explore public and pre-IPO exposure</h2>
        <p className="muted">
          xStocks instruments track public equities. PreStocks instruments provide tokenized
          economic exposure to private companies and do not confer ordinary shareholder rights.
        </p>
        <div className="actions">
          <CtaLink id="market-compare-home" href="/markets">
            Compare both markets
          </CtaLink>
          <CtaLink id="market-private-home" href="/markets/private" secondary>
            Explore private companies
          </CtaLink>
        </div>
        <div className="grid">
          {companies
            .filter((company) => company.instrument)
            .slice(0, 6)
            .map((company) => (
              <CompanyCard company={company} key={company.id} />
            ))}
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">A small, reviewed catalog</p>
        <h2>Start with familiar products</h2>
        <div className="grid">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} productId={product.id} />
          ))}
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">Learn without funding</p>
        <div className="grid">
          {articles.slice(0, 3).map((article) => (
            <Card key={article.slug}>
              <h3>{article.title}</h3>
              <p className="muted">Reviewed learning note · version {article.version}</p>
              <Link className="button ghost" href={`/learn/${article.slug}`}>
                Read the explainer
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function ProductCard({ productId }: { productId: string }) {
  const product = productById(productId)!;
  const company = companyById(product.companyId)!;

  return (
    <Card>
      <div className="product-art" aria-hidden="true">
        {product.brand.slice(0, 1)}
      </div>
      <span className="badge">{categoryLabels[product.category]}</span>
      <h3>{product.name}</h3>
      <p className="muted">
        {product.brand} → {company.name}
      </p>
      <Link className="button ghost" data-cta="C03" href={`/products/${product.id}`}>
        View product
      </Link>
    </Card>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const instrument = company.instrument;
  return (
    <Card>
      <span className="badge">
        {instrument?.assetClass === "pre_ipo_exposure" ? "Pre-IPO exposure" : "Public equity"}
      </span>
      <h3>{company.name}</h3>
      <p className="muted">
        {instrument?.symbol} · issued through {instrument?.issuer}
      </p>
      <Link className="button ghost" href={`/companies/${company.id}`}>
        View company
      </Link>
    </Card>
  );
}

export function SearchScreen({ initialCategory }: { initialCategory?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [results, setResults] = useState(products);
  const [companyResults, setCompanyResults] = useState(
    companies.filter((company) => company.instrument),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query });
        if (category) params.set("category", category);
        const [productMatches, companyMatches] = await Promise.all([
          apiRequest<typeof products>(`catalog/search?${params}`),
          category
            ? Promise.resolve([])
            : apiRequest<Company[]>(`catalog/companies?q=${encodeURIComponent(query)}`),
        ]);
        setResults(productMatches);
        setCompanyResults(companyMatches.filter((company) => company.instrument));
        setError(null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Search failed");
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, category]);

  function clearFilters() {
    setQuery("");
    setCategory("");
  }

  return (
    <>
      <PageIntro eyebrow="Explore" title="Find products, brands and companies">
        <p>
          Search only returns reviewed catalog identities. A similar name never creates a ticker or
          investment.
        </p>
      </PageIntro>
      <div className="card stack">
        <Field label="Product, brand or company" htmlFor="catalog-search">
          <input
            id="catalog-search"
            maxLength={120}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="category-filter">
          <select
            id="category-filter"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <button className="secondary" data-cta="C04" onClick={clearFilters}>
          Clear filters
        </button>
        <ErrorMessage message={error} />
      </div>
      <section className="section">
        {results.length ? (
          <div className="grid">
            {results.map((product) => (
              <ProductCard key={product.id} productId={product.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reviewed match"
            action={
              <CtaLink id="C01" href="/scan">
                Scan instead
              </CtaLink>
            }
          >
            Try another spelling or scan the package. Shelf will not invent an investment from an
            unknown name.
          </EmptyState>
        )}
      </section>
      <section className="section">
        <h2>Companies and investment products</h2>
        {companyResults.length ? (
          <div className="grid">
            {companyResults.map((company) => (
              <CompanyCard company={company} key={company.id} />
            ))}
          </div>
        ) : (
          <p className="muted">No reviewed company or issuer instrument matches these filters.</p>
        )}
      </section>
    </>
  );
}

function blobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function prepareImageForRecognition(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 20_000_000) {
      throw new Error("Image dimensions are too large. Crop it below 20 megapixels.");
    }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || blob.size > 3 * 1024 * 1024) {
      throw new Error("The prepared image is too large. Crop it and try again.");
    }
    return blobAsDataUrl(blob);
  } finally {
    bitmap.close();
  }
}

export function ScanScreen() {
  const [mode, setMode] = useState("camera");
  const [barcode, setBarcode] = useState("");
  const [url, setUrl] = useState("https://www.apple.com/iphone/");
  const [matches, setMatches] = useState<RecognitionMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function retakePhoto() {
    setImageDataUrl(null);
    setPreview(null);
    stopCamera();
    void openCamera();
  }

  useEffect(() => stopCamera, []);

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError(null);
    } catch {
      setError("Camera access is unavailable. Choose an image or search instead.");
    }
  }

  async function recognize(selectedMode = mode) {
    try {
      let response: RecognitionMatch[];
      if (selectedMode === "barcode") {
        response = await postJson("discovery/barcode", { gtin: barcode });
      } else if (selectedMode === "link") {
        response = await postJson("discovery/link", { url });
      } else {
        if (!imageDataUrl) throw new Error("Choose or capture an image first.");
        response = await postJson("discovery/image", {
          mode: selectedMode === "camera" || selectedMode === "upload" ? "photo" : selectedMode,
          imageDataUrl,
        });
      }
      sessionStorage.setItem("shelf:scan-results", JSON.stringify(response));
      setMatches(response);
      setError(null);
      stopCamera();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message.replaceAll("_", " ")
          : "Recognition failed",
      );
    }
  }

  async function chooseImage(file?: File) {
    if (!file) return;
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is larger than 8 MiB. Choose another image.");
      return;
    }
    try {
      const prepared = await prepareImageForRecognition(file);
      setImageDataUrl(prepared);
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "The image could not be decoded.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function captureCameraImage() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError("Open the camera and wait for the preview before capturing.");
      return;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setImageDataUrl(dataUrl);
    setPreview(dataUrl);
    setError(null);
    stopCamera();
  }

  return (
    <>
      <PageIntro eyebrow="Seven ways in" title="What are you looking at?">
        <p>
          Images are processed for this request and are not kept by Shelf. Review every match before
          saving it.
        </p>
      </PageIntro>
      <div className="chips" role="tablist" aria-label="Discovery input">
        {["camera", "barcode", "upload", "screenshot", "receipt", "link", "search"].map(
          (inputMode) => (
            <button
              className={mode === inputMode ? "" : "secondary"}
              onClick={() => setMode(inputMode)}
              role="tab"
              aria-selected={mode === inputMode}
              key={inputMode}
            >
              {inputMode[0].toUpperCase() + inputMode.slice(1)}
            </button>
          ),
        )}
      </div>
      <Card className="section stack">
        {mode === "camera" ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Camera preview"
              style={{ width: "100%", borderRadius: 12, background: "#15231f" }}
            />
            <div className="actions">
              <button data-cta="C05" onClick={openCamera}>
                Open camera
              </button>
              <button data-cta="C06" onClick={captureCameraImage}>
                Capture photo
              </button>
              <button className="secondary" data-cta="C07" onClick={retakePhoto}>
                Retake
              </button>
              <button data-cta="C08" disabled={!imageDataUrl} onClick={() => recognize("photo")}>
                Use photo
              </button>
            </div>
          </>
        ) : null}
        {mode === "barcode" ? (
          <Field
            label="Enter barcode"
            htmlFor="barcode"
            hint="Leading zeros are preserved. Shelf validates reviewed matches before showing a company."
          >
            <input
              id="barcode"
              inputMode="numeric"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ""))}
            />
            <button data-cta="C09" onClick={() => recognize("barcode")}>
              Enter barcode
            </button>
          </Field>
        ) : null}
        {["upload", "screenshot", "receipt"].includes(mode) ? (
          <>
            <Field
              label={mode === "receipt" ? "Choose a cropped receipt" : "Choose an image"}
              htmlFor="image-file"
              hint={
                mode === "receipt"
                  ? "Include product lines and exclude names or payment details."
                  : "JPEG, PNG or WebP, up to 8 MiB."
              }
            >
              <input
                id="image-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => chooseImage(event.target.files?.[0])}
              />
            </Field>
            {preview ? (
              <Image
                src={preview}
                alt="Local upload preview"
                width={640}
                height={320}
                unoptimized
                style={{ maxWidth: "100%", height: "auto", maxHeight: 320, objectFit: "contain" }}
              />
            ) : null}
            <button
              data-cta={mode === "receipt" ? "C11" : "C10"}
              disabled={!imageDataUrl}
              onClick={() => recognize(mode)}
            >
              {" "}
              {mode === "receipt" ? "Read receipt" : "Use this image"}
            </button>
          </>
        ) : null}
        {mode === "link" ? (
          <Field
            label="Approved product link"
            htmlFor="product-url"
            hint="Version one supports the reviewed Apple iPhone path. Other sites can be scanned from a screenshot."
          >
            <input
              id="product-url"
              type="url"
              maxLength={2048}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button data-cta="C12" onClick={() => recognize("link")}>
              Find products
            </button>
          </Field>
        ) : null}
        {mode === "search" ? (
          <CtaLink id="C02" href="/discover?focus=search">
            Search the catalog
          </CtaLink>
        ) : null}
        <ErrorMessage message={error} />
      </Card>
      {matches.length ? (
        <ResultMessage>
          <Link href="/scan/results">
            {matches.length} candidates are ready. Check the matches.
          </Link>
        </ResultMessage>
      ) : null}
    </>
  );
}

export function ScanResultsScreen() {
  const [matches, setMatches] = useState<RecognitionMatch[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = sessionStorage.getItem("shelf:scan-results");
    return stored ? (JSON.parse(stored) as RecognitionMatch[]) : [];
  });
  const [selected, setSelected] = useState<string[]>([]);

  async function saveSelected() {
    const productIds = matches
      .filter((match) => selected.includes(match.candidateId))
      .flatMap((match) => (match.productId ? [match.productId] : []));
    const existing = JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]") as string[];
    sessionStorage.setItem(
      "shelf:guest-items",
      JSON.stringify([...new Set([...existing, ...productIds])]),
    );
  }

  if (!matches.length) {
    return (
      <EmptyState
        title="This scan is no longer available"
        action={
          <CtaLink id="C01" href="/scan">
            Scan again
          </CtaLink>
        }
      >
        Scan again or search the reviewed catalog.
      </EmptyState>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Recognition result" title="Check the matches">
        <p>
          Each product needs your confirmation. A product match and a supported investment are
          separate facts.
        </p>
      </PageIntro>
      <div className="grid">
        {matches.map((match) => (
          <Card key={match.candidateId}>
            <span className="badge">{match.state}</span>
            <h3>{match.displayLabel}</h3>
            <p className="muted">
              Confidence: {match.confidenceBand}. Confirm against the package.
            </p>
            <div className="actions">
              <button
                data-cta="C13"
                onClick={() =>
                  setSelected((current) => [...new Set([...current, match.candidateId])])
                }
              >
                This is correct
              </button>
              <Link className="button secondary" data-cta="C14" href="/discover?focus=search">
                Change match
              </Link>
              <button
                className="ghost"
                data-cta="C15"
                onClick={() =>
                  setMatches((current) =>
                    current.filter((item) => item.candidateId !== match.candidateId),
                  )
                }
              >
                Remove result
              </button>
              {match.companyId ? (
                <Link
                  className="button ghost"
                  data-cta="C16"
                  href={`/companies/${match.companyId}`}
                >
                  View company
                </Link>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <div className="section actions">
        <button data-cta="C17" disabled={!selected.length} onClick={saveSelected}>
          Save selected
        </button>
        <Link className="button secondary" href="/shelf">
          View temporary shelf
        </Link>
      </div>
    </>
  );
}

export function ProductScreen({ productId }: { productId: string }) {
  const product = productById(productId);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  if (!product)
    return (
      <EmptyState title="Product unavailable">This catalog entry may have been retired.</EmptyState>
    );
  const company = companyById(product.companyId)!;
  const source = sources.find((item) => product.sourceIds.includes(item.id));
  const selectedProductId = product.id;

  async function toggleSave() {
    try {
      if (saved) {
        await apiRequest(`shelf/items/${selectedProductId}`, { method: "DELETE" });
        setSaved(false);
        return;
      }
      await postJson("shelf/items", { productIds: [selectedProductId] });
      setSaved(true);
      setSaveError(null);
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : "Shelf update failed");
    }
  }

  return (
    <>
      <PageIntro
        eyebrow={`${categoryLabels[product.category]} · ${product.brand}`}
        title={product.name}
      >
        <p>
          {product.brand} has a reviewed {product.relationship.replaceAll("_", " ")} relationship
          with {company.name}.
        </p>
      </PageIntro>
      <div className="grid">
        <Card>
          <div className="product-art">{product.brand[0]}</div>
          <h2>Relationship path</h2>
          <p>
            {product.name} → {product.brand} → {company.name}
          </p>
          <p className="muted">{product.region}</p>
          {source ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title} · checked {source.verifiedAt}
            </a>
          ) : null}
        </Card>
        <Card>
          <h2>Keep exploring</h2>
          <div className="actions">
            <button data-cta={saved ? "C19" : "C18"} onClick={toggleSave}>
              {saved ? "Remove from shelf" : "Save to shelf"}
            </button>
            <CtaLink id="C20" href={`/companies/${company.id}`} secondary>
              Explore company
            </CtaLink>
          </div>
          <ErrorMessage message={saveError} />
        </Card>
      </div>
    </>
  );
}

export function CompanyScreen({ companyId }: { companyId: string }) {
  const company = companyById(companyId);
  const [preStocksListing, setPreStocksListing] = useState<PreStocksListing | null>(null);
  const [xStocksListing, setXStocksListing] = useState<XStocksListing | null>(null);
  const [history, setHistory] = useState<{
    mode: "observed" | "unavailable";
    points: MarketHistoryPoint[];
  }>({ mode: "unavailable", points: [] });
  const [watched, setWatched] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [marketState, setMarketState] = useState<"current" | "stale" | "unavailable">(
    "unavailable",
  );

  useEffect(() => {
    if (!company?.instrument) return;
    apiRequest<Array<{ id: string }>>("watchlist")
      .then((items) => setWatched(items.some((item) => item.id === company.id)))
      .catch((requestError: unknown) => {
        setWatched(false);
        if (!authenticationIsRequired(requestError)) {
          setWatchlistError(
            requestError instanceof Error ? requestError.message : "Watchlist unavailable",
          );
        }
      });
    apiRequest<{ mode: "observed" | "unavailable"; points: MarketHistoryPoint[] }>(
      `markets/history/${company.id}`,
    )
      .then(setHistory)
      .catch(() => setHistory({ mode: "unavailable", points: [] }));

    if (company.instrument.provider === "prestocks") {
      apiRequest<MarketFeed<PreStocksListing>>("catalog/prestocks")
        .then((response) => {
          setPreStocksListing(
            response.listings.find((listing) => listing.mint === company.instrument?.mint) ?? null,
          );
          setMarketState(response.state);
        })
        .catch(() => setMarketState("unavailable"));
      return;
    }

    apiRequest<MarketFeed<XStocksListing>>("catalog/xstocks")
      .then((response) => {
        setXStocksListing(
          response.listings.find((listing) => listing.mint === company.instrument?.mint) ?? null,
        );
        setMarketState(response.state);
      })
      .catch(() => setMarketState("unavailable"));
  }, [company]);

  async function addToWatchlist() {
    try {
      const items = await postJson<Array<{ id: string }>>("watchlist/items", { companyId });
      setWatched(items.some((item) => item.id === companyId));
      setWatchlistError(null);
    } catch (requestError) {
      setWatchlistError(
        authenticationIsRequired(requestError)
          ? "Sign in to keep this company on your private watchlist."
          : requestError instanceof Error
            ? requestError.message
            : "Watchlist update failed",
      );
    }
  }

  if (!company)
    return (
      <EmptyState title="Company unavailable">
        This company is not in the reviewed registry.
      </EmptyState>
    );
  const relatedProducts = products.filter((product) => product.companyId === company.id);

  return (
    <>
      <PageIntro eyebrow={`${company.exchange} · ${company.ticker}`} title={company.name}>
        <p>{company.description}</p>
      </PageIntro>
      <div className="grid">
        <Card>
          <h2>{relatedProducts.length ? "Brands in the reviewed catalog" : "Registry source"}</h2>
          <p>
            {relatedProducts.length
              ? [...new Set(relatedProducts.map((product) => product.brand))].join(", ")
              : `${company.instrument?.issuer} lists this private-company exposure instrument.`}
          </p>
          <details>
            <summary data-cta="C23">View sources</summary>
            <p className="muted">
              Relationships are supported by reviewed company sources and dated evidence. Exact
              local products can vary.
            </p>
            {company.instrument ? (
              <a href={company.instrument.referenceUrl} target="_blank" rel="noreferrer">
                Open issuer source
              </a>
            ) : null}
          </details>
        </Card>
        <Card>
          {company.instrument ? (
            <span className="badge">
              {company.instrument.assetClass === "pre_ipo_exposure"
                ? "Pre-IPO exposure token"
                : "Public equity token"}
            </span>
          ) : null}
          <h2>{company.instrument ? company.instrument.symbol : "Discovery only"}</h2>
          {company.instrument ? (
            <>
              <p>
                A tokenized instrument from {company.instrument.issuer}.{" "}
                {company.instrument.assetClass === "pre_ipo_exposure"
                  ? "It provides issuer-defined economic exposure to a private company; it is not company stock and does not grant ordinary shareholder rights."
                  : "It is not an ordinary voting share."}
              </p>
              {preStocksListing ? (
                <div className="stack" aria-label="PreStocks reference market data">
                  <p>
                    <strong>Issuer mark:</strong> ${preStocksListing.markPriceUsd}
                    <br />
                    <strong>Token reference:</strong> ${preStocksListing.tokenPriceUsd}
                    <br />
                    <strong>Market signal:</strong> {preStocksListing.premiumLabel}
                  </p>
                  <p className="muted">
                    Reference data from PreStocks · {marketState}. A Jupiter quote, when available,
                    determines executable terms.
                  </p>
                </div>
              ) : company.instrument.provider === "prestocks" ? (
                <p className="muted">Current PreStocks reference pricing is unavailable.</p>
              ) : null}
              {xStocksListing ? (
                <div className="stack" aria-label="xStocks issuer metadata">
                  <p>
                    <strong>Underlying:</strong> {xStocksListing.underlyingSymbol} on{" "}
                    {xStocksListing.exchange}
                    <br />
                    <strong>Underlying session:</strong>{" "}
                    {xStocksListing.marketOpen ? "open" : xStocksListing.marketPeriod}
                  </p>
                  <p className="muted">
                    xStocks metadata · {marketState}. Jupiter determines executable secondary-market
                    terms; issuer redemption has separate eligibility and minimums.
                  </p>
                </div>
              ) : null}
              {company.instrument.lifecycle ? (
                <div className="notice">
                  <strong>{company.instrument.lifecycle.title}</strong>
                  <p>{company.instrument.lifecycle.description}</p>
                  {company.instrument.lifecycle.deadline ? (
                    <p>
                      Issuer deadline:{" "}
                      {new Date(company.instrument.lifecycle.deadline).toLocaleString()}
                      {company.instrument.lifecycle.successorSymbol
                        ? ` · referenced successor ${company.instrument.lifecycle.successorSymbol}`
                        : ""}
                    </p>
                  ) : null}
                  <a href={company.instrument.lifecycle.sourceUrl} target="_blank" rel="noreferrer">
                    Review issuer notice
                  </a>
                </div>
              ) : null}
              {company.instrument.provider === "prestocks" ? (
                <MarketHistoryChart points={history.points} mode={history.mode} />
              ) : null}
              <details>
                <summary data-cta="C24">View token details</summary>
                <p className="muted">
                  Mint: {company.instrument.mint}
                  <br />
                  Program: {company.instrument.tokenProgram}
                  <br />
                  Source: {company.instrument.provider === "prestocks" ? "PreStocks" : "xStocks"}
                </p>
              </details>
              <div className="actions">
                <button className="secondary" disabled={watched} onClick={addToWatchlist}>
                  {watched ? "On watchlist" : "Add to watchlist"}
                </button>
                {company.instrument.capabilities.buy ? (
                  <CtaLink id="C21" href={`/invest/buy?companyId=${company.id}`}>
                    Choose amount
                  </CtaLink>
                ) : null}
                <CtaLink id="C22" href={`/assistant?companyId=${company.id}`} secondary>
                  Ask about this company
                </CtaLink>
              </div>
              <ErrorMessage message={watchlistError} />
            </>
          ) : (
            <p>Not available to buy on Shelf. You can still save and learn about it.</p>
          )}
        </Card>
      </div>
      <section className="section">
        <h2>Products you may recognize</h2>
        <div className="grid">
          {relatedProducts.map((product) => (
            <ProductCard key={product.id} productId={product.id} />
          ))}
        </div>
      </section>
    </>
  );
}

export function ShelfScreen() {
  const [guestIds, setGuestIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]") as string[];
  });
  const [summary, setSummary] = useState("");
  const [name, setName] = useState("My shelf");
  const [version, setVersion] = useState(1);
  const [proposedOrder, setProposedOrder] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watchedCompanies, setWatchedCompanies] = useState<Company[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const startedWithGuestItems = useRef(guestIds.length > 0);

  useEffect(() => {
    apiRequest("me")
      .then(async () => {
        setSignedIn(true);
        const [companies, shelf] = await Promise.all([
          apiRequest<Company[]>("watchlist"),
          apiRequest<{ name: string; version: number; items: Array<{ id: string }> }>("shelf"),
        ]);
        setWatchedCompanies(companies);
        setName(shelf.name);
        setVersion(shelf.version);
        if (!startedWithGuestItems.current) setGuestIds(shelf.items.map((item) => item.id));
      })
      .catch((requestError: unknown) => {
        if (authenticationIsRequired(requestError)) {
          setSignedIn(false);
        } else {
          setError(requestError instanceof Error ? requestError.message : "Shelf unavailable");
        }
      });
  }, []);

  async function summarize() {
    const response = await postJson<{ summary: string; proposedSortIds: string[] }>(
      "ai/shelf-summary",
      { shelfVersion: version },
    );
    setSummary(response.summary);
    setProposedOrder(response.proposedSortIds);
  }

  async function renameShelf() {
    const requestedName = window.prompt("Shelf name", name)?.trim().slice(0, 60);
    if (!requestedName) return;
    const shelf = await apiRequest<{ name: string; version: number }>("shelf", {
      method: "PATCH",
      body: JSON.stringify({
        name: requestedName,
        itemOrderIds: guestIds,
        expectedVersion: version,
      }),
    });
    setName(shelf.name);
    setVersion(shelf.version);
  }

  async function removeItem(productId: string) {
    if (!signedIn) {
      const remaining = guestIds.filter((item) => item !== productId);
      setGuestIds(remaining);
      sessionStorage.setItem("shelf:guest-items", JSON.stringify(remaining));
      return;
    }
    const shelf = await apiRequest<{ version: number }>(`shelf/items/${productId}`, {
      method: "DELETE",
    });
    setGuestIds((items) => items.filter((item) => item !== productId));
    setVersion(shelf.version);
  }

  async function removeWatchedCompany(companyId: string) {
    const items = await apiRequest<Company[]>(`watchlist/items/${companyId}`, { method: "DELETE" });
    setWatchedCompanies(items);
  }

  async function applyOrganization() {
    const currentIds = new Set(guestIds);
    const sortedIds = proposedOrder.filter((id) => currentIds.has(id));
    if (sortedIds.length !== guestIds.length) {
      setError("The suggested order is stale. Generate a new summary.");
      return;
    }
    const shelf = await apiRequest<{ version: number }>("shelf", {
      method: "PATCH",
      body: JSON.stringify({ itemOrderIds: sortedIds, expectedVersion: version }),
    });
    setGuestIds(sortedIds);
    setVersion(shelf.version);
    setSummary("Organization applied. Your products and company relationships are unchanged.");
  }

  return (
    <>
      <PageIntro eyebrow="Private by default" title={name}>
        <p>
          Saved discoveries are separate from investments. Removing a product here never sells a
          holding.
        </p>
      </PageIntro>
      <div className="notice">
        {signedIn
          ? "This private shelf is saved to your account. Saved discoveries remain separate from holdings."
          : "Guest saves stay in this browser session. Sign in before closing the session if you want to keep them."}
      </div>
      <div className="section actions">
        {signedIn ? (
          <button data-cta="C25" onClick={renameShelf}>
            Rename shelf
          </button>
        ) : null}
        <CtaLink id="C26" href="/scan" secondary>
          Scan another product
        </CtaLink>
        <CtaLink id="C27" href="/invest/basket" secondary>
          Choose companies to invest in
        </CtaLink>
        {signedIn ? (
          <>
            <button className="secondary" data-cta="C28" onClick={summarize}>
              Summarize my shelf
            </button>
            <CtaLink id="C29" href="/shelf/share" secondary>
              Share by link
            </CtaLink>
          </>
        ) : (
          <CtaLink id="C31" href="/sign-in" secondary>
            Sign in to keep this shelf
          </CtaLink>
        )}
      </div>
      {summary ? (
        <ResultMessage>
          {summary}
          <div className="actions">
            <button data-cta="C32" onClick={applyOrganization}>
              Apply organization
            </button>
          </div>
        </ResultMessage>
      ) : null}
      <ErrorMessage message={error} />
      {signedIn ? (
        <section className="section">
          <p className="eyebrow">Market watchlist</p>
          <h2>Companies you are researching</h2>
          <p className="muted">
            Watching is separate from owning. Public xStocks and private PreStocks remain visibly
            labeled here.
          </p>
          {watchedCompanies.length ? (
            <div className="grid">
              {watchedCompanies.map((company) => (
                <Card
                  className={
                    company.instrument?.provider === "prestocks"
                      ? "private-market-card"
                      : "public-market-card"
                  }
                  key={company.id}
                >
                  <span className="badge">
                    {company.instrument?.provider === "prestocks"
                      ? "Private · PreStocks"
                      : "Public · xStocks"}
                  </span>
                  <h3>{company.name}</h3>
                  <p className="muted">{company.instrument?.symbol}</p>
                  <div className="actions">
                    <Link className="button" href={`/companies/${company.id}`}>
                      Research
                    </Link>
                    <button className="ghost" onClick={() => removeWatchedCompany(company.id)}>
                      Remove
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No companies watched"
              action={
                <CtaLink id="market-watch-empty" href="/markets">
                  Explore markets
                </CtaLink>
              }
            >
              Add companies from either market without placing an order.
            </EmptyState>
          )}
        </section>
      ) : null}
      <section className="section grid">
        {(guestIds.length ? guestIds : ["product-doritos-snack", "product-olay-skincare"]).map(
          (id) => (
            <Card key={id}>
              <ProductCard productId={id} />
              <button className="ghost" data-cta="C30" onClick={() => removeItem(id)}>
                Remove item
              </button>
            </Card>
          ),
        )}
      </section>
    </>
  );
}

export function LearnScreen({ slug }: { slug?: string }) {
  if (slug) {
    const article = articles.find((item) => item.slug === slug);
    if (!article)
      return (
        <EmptyState title="Explainer unavailable">
          Return to the learning library and choose another topic.
        </EmptyState>
      );
    return (
      <>
        <PageIntro eyebrow={`Reviewed ${article.reviewedAt}`} title={article.title} />
        <Card>
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="actions">
            <CtaLink id="C33" href="/discover">
              Explore related brands
            </CtaLink>
            <CtaLink id="C34" href="/assistant" secondary>
              Ask a question
            </CtaLink>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Learning library" title="Understand each layer before acting" />
      <div className="grid">
        {articles.map((article) => (
          <Card key={article.slug}>
            <h2>{article.title}</h2>
            <p className="muted">
              Version {article.version} · reviewed {article.reviewedAt}
            </p>
            <Link className="button ghost" href={`/learn/${article.slug}`}>
              Read
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}

export function AssistantScreen() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    try {
      const response = await postJson<{ answer: string }>("ai/answer", {
        question,
        includeShelf: false,
      });
      setAnswer(response.answer);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI request failed");
    }
  }

  return (
    <>
      <PageIntro eyebrow="AI assistant" title="Ask about products, companies and stock tokens">
        <p>
          AI may be wrong. Answers use reviewed Shelf sources and cannot place orders or sign
          transactions.
        </p>
      </PageIntro>
      <Card className="stack">
        <Field label="Your question" htmlFor="assistant-question">
          <textarea
            id="assistant-question"
            maxLength={2000}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </Field>
        <div className="actions">
          <button data-cta="C35" disabled={!question.trim()} onClick={ask}>
            Send question
          </button>
          <button
            className="secondary"
            data-cta="C36"
            onClick={() => setError("Response stopped. Provider cancellation is best effort.")}
          >
            Stop response
          </button>
          <button
            className="ghost"
            data-cta="C37"
            onClick={() => {
              setQuestion("");
              setAnswer("");
            }}
          >
            Clear conversation
          </button>
          <CtaLink id="C38" href="/invest/suggest" secondary>
            Suggest an allocation
          </CtaLink>
        </div>
        <ErrorMessage message={error} />
        {answer ? (
          <ResultMessage>
            {answer}
            <div className="actions">
              <CtaLink id="C39" href="/invest/suggest">
                Use this draft
              </CtaLink>
            </div>
          </ResultMessage>
        ) : null}
      </Card>
    </>
  );
}

export function AllocationScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState("30");
  const [draft, setDraft] = useState<Array<{ companyId: string; amountUsdcRaw: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function generateDraft() {
    try {
      const raw = (BigInt(budget) * 1_000_000n).toString();
      const response = await postJson<{
        allocations: Array<{ companyId: string; amountUsdcRaw: string }>;
      }>("ai/allocation-drafts", {
        budgetUsdcRaw: raw,
        companyIds: companies
          .filter((company) => company.instrument?.capabilities.buy)
          .slice(0, 5)
          .map((company) => company.id),
        includeShelf: true,
      });
      setDraft(response.allocations);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Draft failed");
    }
  }

  function updateAllocation(companyId: string, amount: string) {
    setDraft((current) =>
      current.map((item) =>
        item.companyId === companyId ? { ...item, amountUsdcRaw: amount } : item,
      ),
    );
  }

  function applyDraft() {
    sessionStorage.setItem("shelf:allocation-draft", JSON.stringify(draft));
    router.push("/invest/basket");
  }

  return (
    <>
      <PageIntro eyebrow="Editable proposal" title="Build an allocation proposal">
        <p>
          This is not a return prediction or suitability assessment. Shelf uses only verified
          supported candidates you explicitly selected.
        </p>
      </PageIntro>
      <Card className="stack">
        <Field label="Budget in USDC" htmlFor="allocation-budget">
          <input
            id="allocation-budget"
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </Field>
        <label>
          <input type="checkbox" /> Use my shelf context
        </label>
        <button data-cta="C40" onClick={generateDraft}>
          Generate draft
        </button>
        <ErrorMessage message={error} />
      </Card>
      {draft.length ? (
        <section className="section stack">
          <div className="notice">
            Limited catalog and token issuer risks apply. Familiarity is not valuation.
          </div>
          {draft.map((item) => (
            <Card key={item.companyId}>
              <h3>{companyById(item.companyId)?.name}</h3>
              <Field label="Allocation in raw USDC" htmlFor={`draft-${item.companyId}`}>
                <input
                  id={`draft-${item.companyId}`}
                  data-cta="C41"
                  inputMode="numeric"
                  value={item.amountUsdcRaw}
                  onChange={(event) => updateAllocation(item.companyId, event.target.value)}
                />
              </Field>
            </Card>
          ))}
          <button data-cta="C42" onClick={applyDraft}>
            Apply to basket
          </button>
        </section>
      ) : null}
    </>
  );
}
