"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import {
  articles,
  brands,
  companyById,
  productById,
  sources,
} from "@/data/catalog";
import type { Category, Company, RecognitionMatch } from "@/domain/types";
import { apiRequest, authenticationIsRequired, postJson } from "@/lib/api-client";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import { useReviewedIssuerLinks } from "@/components/use-reviewed-issuer-links";
import { IssuerLogo } from "@/components/issuer-logo";
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
          AI suggests the company behind a product. Shelf then looks for that company in the
          current xStocks and PreStocks issuer feeds.
        </p>
      </PageIntro>
      <div className="hero-actions">
        <CtaLink id="C01" href="/scan">
          Scan a product
        </CtaLink>
        <CtaLink id="C02" href="/discover?entity=product" secondary>
          Find a product’s company
        </CtaLink>
      </div>
      <section className="section">
        <h2>Browse product categories</h2>
        <p className="muted">
          Explore reviewed product families and save them to your shelf. Check current issuer
          listings separately before considering an investment.
        </p>
        <div className="chips" aria-label="Product categories">
          {(Object.keys(categoryLabels) as Category[]).map((category) => (
            <Link key={category} className="button secondary" href={`/discover?category=${category}`}>
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
          Product ownership suggested by AI is separate from either issuer’s token listing.
        </p>
        <div className="actions">
          <CtaLink id="market-compare-home" href="/discover?entity=company">
            Compare both markets
          </CtaLink>
          <CtaLink id="market-private-home" href="/discover?entity=company&market=private" secondary>
            Explore private companies
          </CtaLink>
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
  const product = productById(productId);
  if (!product) return null;

  return (
    <Card>
      <span className="badge">Previously saved product</span>
      <h3>{product.name}</h3>
      <p className="muted">Search this product again to check its current company and issuer listing.</p>
      <Link className="button ghost" data-cta="C03" href={`/products/${product.slug}`}>
        View saved product
      </Link>
    </Card>
  );
}

export function ProductScreen({ productId }: { productId: string }) {
  const product = productById(productId);
  const { links: reviewedIssuerLinks, error: issuerError } = useReviewedIssuerLinks();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    let active = true;
    apiRequest<{ items: Array<{ id: string }> }>("shelf")
      .then((shelf) => {
        if (!active) return;
        setSignedIn(true);
        setSaved(shelf.items.some((item) => item.id === product.id));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (authenticationIsRequired(reason)) {
          const guestIds = JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]") as string[];
          setSignedIn(false);
          setSaved(guestIds.includes(product.id));
        } else {
          setSaveError(reason instanceof Error ? reason.message : "Shelf unavailable");
        }
      });
    return () => { active = false; };
  }, [product]);

  if (!product) {
    return <EmptyState title="Product unavailable">This catalog entry may have been retired.</EmptyState>;
  }

  const company = companyById(product.companyId);
  const liveListings = company ? reviewedIssuerLinks?.byCompany[company.id] ?? [] : [];
  const issuerFeedIncomplete = Boolean(reviewedIssuerLinks?.unavailable.length || reviewedIssuerLinks?.stale.length);
  const brand = brands.find((candidate) => candidate.name === product.brand);
  const source = sources.find((item) => product.sourceIds.includes(item.id));

  async function toggleSave() {
    if (!product || signedIn === null || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (signedIn) {
        if (saved) {
          await apiRequest(`shelf/items/${product.id}`, { method: "DELETE" });
        } else {
          await postJson("shelf/items", { productIds: [product.id] });
        }
      } else {
        const guestIds = JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]") as string[];
        const nextIds = saved
          ? guestIds.filter((id) => id !== product.id)
          : [...new Set([...guestIds, product.id])];
        sessionStorage.setItem("shelf:guest-items", JSON.stringify(nextIds));
      }
      setSaved(!saved);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Shelf update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow={`${categoryLabels[product.category]} · ${product.brand}`} title={product.name}>
        <p>
          This reviewed product family is connected to {company?.name ?? "a company"} through
          its brand. Exact local products and ownership can vary by region.
        </p>
      </PageIntro>
      <div className="grid">
        <Card>
          <div className="product-art" aria-hidden="true">{product.brand[0]}</div>
          <h2>Reviewed relationship</h2>
          <p>{product.name} → {brand ? <Link href={`/brands/${brand.slug}`}>{product.brand}</Link> : product.brand} → {company?.name}</p>
          <p className="muted">{product.region}</p>
          {source ? <a href={source.url} target="_blank" rel="noreferrer">
            {source.title} · checked {source.verifiedAt}
          </a> : null}
        </Card>
        <Card>
          <h2>Keep exploring</h2>
          <p className="muted">Saving records a product discovery. It does not buy an asset or verify a current issuer listing.</p>
          <h3>Current issuer assets</h3>
          {!reviewedIssuerLinks && !issuerError ? <p className="muted" role="status">Checking xStocks and PreStocks…</p> : null}
          {issuerError || (!liveListings.length && issuerFeedIncomplete)
            ? <p className="muted">Issuer availability cannot be confirmed right now.</p>
            : null}
          {reviewedIssuerLinks && !liveListings.length && !issuerFeedIncomplete
            ? <p className="muted">No current xStocks or PreStocks asset matches this reviewed company.</p>
            : null}
          {liveListings.map(({ provider, asset }) => (
            <div className="reviewed-issuer-link" key={asset.companyId}>
              <p><strong>{asset.name}</strong> · {asset.symbol} · {provider === "xstocks" ? "Public · xStocks" : "Private · PreStocks"}</p>
              <p className="muted">Issuer mint: <code className="breakable-code">{asset.mint}</code></p>
              <Link className="button secondary" href={`/assets/${provider}/${encodeURIComponent(asset.symbol)}` as Route}>
                View current issuer asset
              </Link>
            </div>
          ))}
          <div className="actions">
            <button data-cta={saved ? "C19" : "C18"} disabled={signedIn === null || saving} onClick={toggleSave}>
              {saving ? "Updating shelf…" : saved ? "Remove from shelf" : "Save to shelf"}
            </button>
            {company ? <CtaLink id="C20" href={`/discover?q=${encodeURIComponent(company.name)}` as Route} secondary>
              Search this company
            </CtaLink> : null}
            <CtaLink id="product-shelf-link" href="/saved" secondary>View shelf</CtaLink>
          </div>
          {signedIn === false ? <p className="muted">Guest saves stay in this browser session. Sign in to keep them.</p> : null}
          <ErrorMessage message={saveError} />
          {signedIn === null && saveError ? (
            <button className="ghost" onClick={() => window.location.reload()}>
              Retry shelf connection
            </button>
          ) : null}
        </Card>
      </div>
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
  const [aiConsent, setAiConsent] = useState(false);
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
        if (!aiConsent) throw new Error("AI processing consent is required.");
        response = await postJson("discovery/barcode", {
          gtin: barcode,
          aiProcessingConsentAccepted: true,
          aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
          acknowledgeAiProcessing: true,
        });
      } else if (selectedMode === "link") {
        if (!aiConsent) throw new Error("AI processing consent is required.");
        response = await postJson("discovery/link", {
          url,
          aiProcessingConsentAccepted: true,
          aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
          acknowledgeAiProcessing: true,
        });
      } else {
        if (!imageDataUrl) throw new Error("Choose or capture an image first.");
        if (!aiConsent) throw new Error("AI processing consent is required.");
        response = await postJson("discovery/image", {
          mode: selectedMode === "camera" || selectedMode === "upload" ? "photo" : selectedMode,
          imageDataUrl,
          aiProcessingConsentAccepted: aiConsent,
          aiProcessingConsentVersion: aiConsent ? AI_PROCESSING_CONSENT_VERSION : "",
          acknowledgeAiProcessing: aiConsent,
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
        {["camera", "barcode", "upload", "screenshot", "receipt", "link"].includes(mode) ? (
          <label className="notice">
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(event) => setAiConsent(event.target.checked)}
            />{" "}
            I agree to send this {mode === "link"
              ? "product name from the approved link"
              : mode === "barcode" ? "barcode to Open Food Facts and the returned product name" : "image"}
            {" "}to OpenRouter for recognition and an ownership suggestion. Shelf does not retain
            the image, but the provider processes submitted content under its privacy policies.
            I have removed unnecessary personal or payment details.
          </label>
        ) : null}
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
              <button
                data-cta="C08"
                disabled={!imageDataUrl || !aiConsent}
                onClick={() => recognize("photo")}
              >
                Use photo
              </button>
            </div>
          </>
        ) : null}
        {mode === "barcode" ? (
          <Field
            label="Enter barcode"
            htmlFor="barcode"
            hint="Leading zeros are preserved. Shelf looks up a product name in public product databases, then asks AI for a likely owner."
          >
            <input
              id="barcode"
              inputMode="numeric"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ""))}
            />
            <button data-cta="C09" disabled={!aiConsent} onClick={() => recognize("barcode")}>
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
              disabled={!imageDataUrl || !aiConsent}
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
            hint="Only the approved Apple iPhone path is supported. Other sites can be scanned from a screenshot."
          >
            <input
              id="product-url"
              type="url"
              maxLength={2048}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button data-cta="C12" disabled={!aiConsent} onClick={() => recognize("link")}>
              Find products
            </button>
          </Field>
        ) : null}
        {mode === "search" ? (
          <CtaLink id="C02" href="/discover?focus=search">
            Search a product or company
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
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveSelected() {
    const chosen = matches.filter((match) => selected.includes(match.candidateId));
    const companyIds = [...new Set(chosen.flatMap((match) =>
      match.companyId ? [match.companyId] : [],
    ))];
    if (!companyIds.length) {
      setSaveError("No issuer asset was found. Search by company name to correct the match.");
      return;
    }
    try {
      const signedIn = await apiRequest("me").then(() => true).catch(() => false);
      if (signedIn) {
        for (const companyId of companyIds) {
          await postJson("watchlist/items", { companyId });
        }
        setSaveMessage("Saved to your private watchlist.");
      } else {
        const existing = JSON.parse(sessionStorage.getItem("shelf:guest-issuer-assets") ?? "[]") as string[];
        sessionStorage.setItem("shelf:guest-issuer-assets",
          JSON.stringify([...new Set([...existing, ...companyIds])]));
        setSaveMessage("Saved in this browser session. Sign in to keep it on your watchlist.");
      }
      setSaveError(null);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Could not save this asset");
    }
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
        Scan again or search the current issuer feeds.
      </EmptyState>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Recognition result" title="Check the matches">
        <p>
          AI suggested a product owner. Confirm that relationship yourself. xStocks and PreStocks
          supply the token identity only; a fresh Jupiter route is checked later.
        </p>
      </PageIntro>
      <div className="grid">
        {matches.map((match) => (
          <Card key={match.candidateId}>
            <span className="badge">{match.state === "matched" ? "Issuer token found" : "No issuer token found"}</span>
            <h3>{match.displayLabel}</h3>
            <p className="muted">
              Likely owner: {match.ownerName ?? "Unknown"}. AI ownership suggestion; check it
              independently before investing.
            </p>
            {match.productIdentitySource ? (
              <p className="muted">
                Product name from{" "}
                <a href={match.productIdentitySource} target="_blank" rel="noreferrer">
                  the public product database
                </a>. Community data may be incomplete or incorrect.
              </p>
            ) : null}
            {match.issuer && match.symbol ? (
              <p className="muted">
                {match.issuer === "xstocks" ? "Public · xStocks" : "Private · PreStocks"}
                {" "}· {match.symbol} · mint {match.mint}
              </p>
            ) : null}
            {match.issuer && match.matchedIssuerName ? (
              <div className="scan-issuer-identity">
                <IssuerLogo imageUrl={match.logoUrl} name={match.matchedIssuerName} source={match.issuer} />
                <p className="muted">Matched issuer listing: {match.matchedIssuerName}</p>
              </div>
            ) : null}
            {match.feedUnavailable ? <p className="notice">An issuer feed was unavailable, so this scan may have missed a token.</p> : null}
            {match.feedStale ? <p className="notice">Issuer data is stale. A purchase requires a fresh recheck.</p> : null}
            {!match.issuer ? <p className="muted">No matching issuer asset was confirmed. Search the company name to check the live feeds.</p> : null}
            <div className="actions">
              <button
                data-cta="C13"
                disabled={!match.issuer || !match.symbol}
                onClick={() =>
                  setSelected((current) => [...new Set([...current, match.candidateId])])
                }
              >
                This is correct
              </button>
              <Link className="button secondary" data-cta="C14"
                href={`/discover?focus=search${match.ownerName ? `&q=${encodeURIComponent(match.ownerName)}` : ""}` as Route}>
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
              {match.issuer && match.symbol ? (
                <Link
                  className="button ghost"
                  data-cta="C16"
                  href={`/assets/${match.issuer}/${encodeURIComponent(match.symbol)}` as Route}
                >
                  View issuer asset
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
        <Link className="button secondary" href="/saved">
          View temporary saved items
        </Link>
      </div>
      {saveMessage ? <ResultMessage>{saveMessage}</ResultMessage> : null}
      <ErrorMessage message={saveError} />
    </>
  );
}

export function ShelfScreen() {
  const [guestIds, setGuestIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(sessionStorage.getItem("shelf:guest-items") ?? "[]") as string[];
  });
  const [summary, setSummary] = useState("");
  const [guestIssuerIds, setGuestIssuerIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(sessionStorage.getItem("shelf:guest-issuer-assets") ?? "[]") as string[];
  });
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
        const pendingIssuerIds = JSON.parse(
          sessionStorage.getItem("shelf:guest-issuer-assets") ?? "[]",
        ) as string[];
        const failedIssuerIds: string[] = [];
        for (const companyId of pendingIssuerIds) {
          try {
            await postJson("watchlist/items", { companyId });
          } catch {
            failedIssuerIds.push(companyId);
          }
        }
        sessionStorage.setItem("shelf:guest-issuer-assets", JSON.stringify(failedIssuerIds));
        setGuestIssuerIds(failedIssuerIds);
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
            <CtaLink id="C29" href="/saved/share" secondary>
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
                    <Link className="button" href={(
                      company.id.startsWith("issuer:") && company.instrument
                        ? `/assets/${company.instrument.provider}/${encodeURIComponent(company.instrument.symbol)}`
                        : `/companies/${company.slug}`
                    ) as Route}>
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
                <CtaLink id="market-watch-empty" href="/discover?focus=search">
                  Explore companies
                </CtaLink>
              }
            >
              Add companies from either market without placing an order.
            </EmptyState>
          )}
        </section>
      ) : null}
      <section className="section grid">
        {guestIds.map(
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
      {!signedIn && guestIssuerIds.length ? (
        <section className="section">
          <h2>Issuer assets saved this session</h2>
          <div className="grid">
            {guestIssuerIds.map((companyId) => {
              const [, provider, symbol] = companyId.split(":");
              return <Card key={companyId}>
                <p>{provider === "xstocks" ? "Public · xStocks" : "Private · PreStocks"} · {symbol}</p>
                <div className="actions">
                  <Link className="button" href={`/assets/${provider}/${encodeURIComponent(symbol)}` as Route}>Research</Link>
                  <button className="ghost" onClick={() => {
                    const next = guestIssuerIds.filter((id) => id !== companyId);
                    setGuestIssuerIds(next);
                    sessionStorage.setItem("shelf:guest-issuer-assets", JSON.stringify(next));
                  }}>Remove</button>
                </div>
              </Card>;
            })}
          </div>
        </section>
      ) : null}
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
          <CtaLink id="C38" href="/invest/basket?source=ai" secondary>
            Suggest an allocation
          </CtaLink>
        </div>
        <ErrorMessage message={error} />
        {answer ? (
          <ResultMessage>
            {answer}
            <div className="actions">
              <CtaLink id="C39" href="/invest/basket?source=ai">
                Use this draft
              </CtaLink>
            </div>
          </ResultMessage>
        ) : null}
      </Card>
    </>
  );
}
