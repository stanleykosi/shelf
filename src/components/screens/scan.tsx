"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Barcode, Camera, CameraOff, Link as LinkIcon, ReceiptText, Search, ShieldCheck, SwitchCamera, Upload } from "lucide-react";
import type { RecognitionMatch } from "@/domain/types";
import { apiRequest } from "@/lib/api-client";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import { beginScanSession, proposeProduct, scanErrorMessage } from "@/lib/scan-session";
import { prepareScanImage } from "@/lib/scan-image";
import { ScanProductSearch } from "@/components/scan-product-search";

const methods = ["camera", "upload", "screenshot", "barcode", "receipt", "link", "search"] as const;
type Method = typeof methods[number];
type CameraState = "idle" | "requesting" | "active" | "denied" | "unavailable";
type BarcodeDetectorApi = { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
type BarcodeDetectorConstructor = { new(options: { formats: string[] }): BarcodeDetectorApi; getSupportedFormats(): Promise<string[]> };

export function ScanScreen() {
  const params = useSearchParams();
  const requested = params.get("method");
  const mode: Method = methods.includes(requested as Method) ? requested as Method : "camera";
  return <ScanWorkspace key={mode} mode={mode} />;
}

function ScanWorkspace({ mode }: { mode: Method }) {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [camera, setCamera] = useState<CameraState>("idle");
  const [canSwitch, setCanSwitch] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [barcode, setBarcode] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const cameraGeneration = useRef(0);
  const imageGeneration = useRef(0);
  const processingRef = useRef(false);

  const stopCamera = useCallback(() => {
    cameraGeneration.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    // Remove the legacy persisted recognition evidence; never read or migrate raw labels.
    try { sessionStorage.removeItem("shelf:scan-results"); } catch { /* Storage is optional. */ }
    const onlineChanged = () => setOffline(!navigator.onLine);
    const backgrounded = () => { if (document.hidden) { stopCamera(); setCamera("idle"); } };
    onlineChanged();
    window.addEventListener("online", onlineChanged);
    window.addEventListener("offline", onlineChanged);
    document.addEventListener("visibilitychange", backgrounded);
    return () => {
      stopCamera();
      imageGeneration.current += 1;
      requestRef.current?.abort();
      window.removeEventListener("online", onlineChanged);
      window.removeEventListener("offline", onlineChanged);
      document.removeEventListener("visibilitychange", backgrounded);
    };
  }, [stopCamera]);

  useEffect(() => {
    if (camera !== "active" || mode !== "barcode") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    async function startDetection() {
      if (!Detector) { setMessage("Live barcode reading is unavailable in this browser. Enter the digits below."); return; }
      try {
        const supported = await Detector.getSupportedFormats();
        const formats = ["ean_13", "ean_8", "upc_a", "upc_e"].filter((format) => supported.includes(format));
        if (!formats.length) throw new Error("unsupported");
        const detector = new Detector({ formats });
        async function detect() {
          if (cancelled || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (cancelled) return;
            const code = found.find((entry) => /^\d{8,14}$/.test(entry.rawValue));
            if (code) { setBarcode(code.rawValue); setConsent(false); stopCamera(); setCamera("idle"); setMessage("Barcode captured. Check the digits, then find the product."); return; }
          } catch { /* A frame may not be ready yet; manual entry remains available. */ }
          if (!cancelled) timer = setTimeout(detect, 400);
        }
        void detect();
      } catch { if (!cancelled) setMessage("Live barcode reading is unavailable. Enter the digits below."); }
    }
    void startDetection();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [camera, mode, stopCamera]);

  async function openCamera(nextFacing = facing) {
    stopCamera();
    const generation = cameraGeneration.current;
    setImage(null); setConsent(false); setError(""); setCamera("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("NO_CAMERA");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing }, audio: false });
      if (generation !== cameraGeneration.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setFacing(nextFacing); setCamera("active");
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      if (generation === cameraGeneration.current) setCanSwitch(devices.filter((device) => device.kind === "videoinput").length > 1);
    } catch (failure) {
      if (generation !== cameraGeneration.current) return;
      setCamera(failure instanceof DOMException && failure.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) { setError("Wait for the camera preview, then capture again."); return; }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) { setError("Capture is unavailable. Upload an image instead."); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", .85)); setConsent(false); setError("");
    stopCamera(); setCamera("idle");
  }

  async function chooseImage(file?: File) {
    if (!file || busy) return;
    stopCamera(); setCamera("idle"); setConsent(false); setError(""); setPreparing(true);
    const generation = ++imageGeneration.current;
    try {
      const prepared = await prepareScanImage(file);
      if (generation === imageGeneration.current) { setImage(prepared); setMessage(""); }
    } catch (failure) {
      if (generation === imageGeneration.current) { setImage(null); setError(failure instanceof Error ? failure.message : "Choose another image."); }
    } finally { if (generation === imageGeneration.current) setPreparing(false); }
  }

  async function identify() {
    if (processingRef.current || offline || !consent || (mode !== "barcode" && mode !== "link" && !image)) return;
    processingRef.current = true; setBusy(true); setError(""); setMessage("");
    const controller = new AbortController(); requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 30_000);
    const kind = mode === "barcode" ? "barcode" : mode === "link" ? "link" : "image";
    const input = kind === "barcode" ? { gtin: barcode } : kind === "link" ? { url } : {
      mode: mode === "receipt" || mode === "screenshot" ? mode : "photo", imageDataUrl: image,
    };
    const body = { ...input,
      aiProcessingConsentAccepted: consent, aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
      acknowledgeAiProcessing: consent,
    };
    try {
      const matches = await apiRequest<RecognitionMatch[]>(`discovery/${kind}`, { method: "POST", body: JSON.stringify(body), signal: controller.signal });
      if (controller.signal.aborted) return;
      beginScanSession(matches, mode); setImage(null); setConsent(false); stopCamera();
      router.push("/scan/results");
    } catch (failure) {
      if (controller.signal.aborted) setMessage(controller.signal.reason === "timeout" ? "Identification timed out. Try again or search manually." : "Identification cancelled. Processing already started by the provider may still finish.");
      else setError(scanErrorMessage(failure));
    } finally { clearTimeout(timeout); processingRef.current = false; setBusy(false); requestRef.current = null; }
  }

  function selectMethod(method: Method) { router.replace(`/scan?method=${method}`, { scroll: false }); }
  const visual = ["camera", "upload", "screenshot", "receipt"].includes(mode);
  const title = image ? "Check your image" : mode === "receipt" ? "Read a receipt" : mode === "barcode" ? "Find by barcode" : mode === "link" ? "Use an approved link" : mode === "search" ? "Search the reviewed catalog" : "Start with what you see";

  return <div className="scan-page scan-intake">
    <header className="scan-page-heading"><p className="scan-context">Scan / Product identification</p><h1>Identify a product</h1><p>Use your camera, upload an image, or search manually.</p></header>
    <nav className="scan-mobile-shortcuts" aria-label="Quick identification methods">
      <button className="scan-secondary" disabled={busy} aria-pressed={mode === "camera"} onClick={() => selectMethod("camera")}><Camera size={17} aria-hidden="true" />Camera</button>
      <button className="scan-secondary" disabled={busy} aria-pressed={mode === "upload" || mode === "screenshot"} onClick={() => selectMethod("upload")}><Upload size={17} aria-hidden="true" />Upload</button>
      <button className="scan-secondary" disabled={busy} aria-pressed={mode === "search"} onClick={() => selectMethod("search")}><Search size={17} aria-hidden="true" />Search</button>
    </nav>
    <div className="scan-workspace">
      <section className="scan-input" aria-labelledby="scan-input-title">
        <div className="scan-section-heading"><h2 id="scan-input-title">{title}</h2></div>
        {visual || mode === "barcode" ? <>
          <div className={"scan-media" + (camera === "active" || camera === "requesting" ? " is-camera" : "") + (image ? " has-preview" : "")}
            onDragOver={(event) => { event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (visual) void chooseImage(event.dataTransfer.files[0]); }}>
            <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" hidden={camera !== "active"} />
            {image ? <Image src={image} alt="Your image, kept only for this identification request" width={800} height={600} unoptimized /> : camera !== "active" ? <div className="scan-media-prompt" aria-live="polite">
              {camera === "denied" || camera === "unavailable" ? <CameraOff size={28} aria-hidden="true" /> : mode === "upload" || mode === "screenshot" || mode === "receipt" ? <Upload size={28} aria-hidden="true" /> : <Camera size={28} aria-hidden="true" />}
              <h3>{preparing ? "Preparing image" : camera === "requesting" ? "Waiting for camera permission" : camera === "denied" ? "Camera access is blocked" : camera === "unavailable" ? "No camera available" : mode === "receipt" ? "Keep just the product lines" : mode === "upload" || mode === "screenshot" ? "Choose a photo or screenshot" : "Show the product"}</h3>
              <p>{camera === "denied" ? "Allow camera access in your browser’s site settings, or upload an image." : camera === "unavailable" ? "Connect a camera, upload an image, or search manually." : mode === "receipt" ? "Remove names, addresses and payment details before choosing your image." : mode === "upload" || mode === "screenshot" ? "Drop an image here, or choose one from your device." : "Keep the product name and packaging in view. Nothing is sent when you open the camera."}</p>
              {camera === "requesting" ? <button className="scan-secondary" onClick={() => { stopCamera(); setCamera("idle"); }}>Cancel camera request</button> : mode !== "upload" && mode !== "screenshot" && mode !== "receipt" ? <button className="scan-primary" data-cta="C05" onClick={() => openCamera()} disabled={busy}><Camera size={17} aria-hidden="true" />{camera === "idle" ? "Open camera" : "Try camera again"}</button> : <button className="scan-primary" data-cta="C10" onClick={() => fileRef.current?.click()} disabled={preparing || busy}><Upload size={17} aria-hidden="true" />Choose image</button>}
            </div> : null}
          </div>
          {!image && camera === "idle" && visual ? <div className="scan-capture-guidance" aria-label="Image guidance"><span>Product name in view</span><span>Even light, no glare</span><span>{mode === "receipt" ? "Remove private details" : "Keep packaging in frame"}</span></div> : null}
          <div className="scan-media-controls">
          <p className="scan-camera-status" role="status">{camera === "active" ? mode === "barcode" ? "Camera active · reading barcodes locally" : "Camera active · preview stays on your device" : camera === "requesting" ? "Your browser is asking for camera permission." : image ? "Local preview · cleared when you leave this scan" : mode === "barcode" ? "Read a barcode locally, or enter its digits below" : mode === "camera" ? "Camera preview stays on your device" : "JPEG, PNG or WebP · up to 8 MiB / 20 megapixels"}</p>
          <div className="scan-actions">
            {camera === "active" ? <>{mode !== "barcode" ? <button className="scan-primary" data-cta="C06" onClick={capture}>Capture photo</button> : null}{canSwitch ? <button className="scan-secondary" onClick={() => openCamera(facing === "environment" ? "user" : "environment")}><SwitchCamera size={17} aria-hidden="true" />Switch camera</button> : null}<button className="scan-secondary" onClick={() => { stopCamera(); setCamera("idle"); }}>Close camera</button></> : image ? <>{mode === "camera" ? <button className="scan-secondary" data-cta="C07" disabled={busy} onClick={() => openCamera()}>Retake</button> : null}<button className="scan-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>Replace image</button></> : null}
          </div>
          <input ref={fileRef} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose image file" onChange={(event) => { void chooseImage(event.target.files?.[0]); event.target.value = ""; }} />
          </div>
        </> : null}
        {mode === "search" ? <ScanProductSearch onSelect={(product) => { beginScanSession([proposeProduct(product)], "search"); router.push("/scan/results"); }} /> : null}
        {mode === "barcode" ? <label className="scan-field">Barcode digits<input value={barcode} disabled={busy} inputMode="numeric" maxLength={14} onChange={(event) => { setBarcode(event.target.value.replace(/\D/g, "")); setConsent(false); }} /><small>Keep leading zeros. Shelf looks up public product details, then requests an ownership suggestion. Camera frames are not uploaded.</small></label> : null}
        {mode === "link" ? <div className="scan-link-workspace"><LinkIcon size={26} aria-hidden="true" /><label className="scan-field">Product URL<input type="url" disabled={busy} maxLength={2048} placeholder="https://www.apple.com/iphone/" value={url} onChange={(event) => { setUrl(event.target.value); setConsent(false); }} /></label><p>Currently supported: the official Apple iPhone page. Shelf uses the product name from this approved path to request an ownership suggestion. No page image is uploaded.</p><button className="scan-text-action" onClick={() => selectMethod("screenshot")}>Use a screenshot for another website <ArrowRight size={16} /></button></div> : null}
        {(visual && image) || mode === "barcode" || mode === "link" ? <section className="scan-consent" aria-labelledby="scan-privacy-title">
          <h3 id="scan-privacy-title"><ShieldCheck size={18} aria-hidden="true" />{visual ? "Permission to identify this image" : "Permission to process product details"}</h3>
          <p id="scan-processing-summary">{visual ? "Identify sends this image to OpenRouter and its model provider for AI-assisted identification. Shelf retains neither images nor raw receipt text." : "Find product sends the resolved product name and, when available, brand to OpenRouter and its model provider for an AI-assisted ownership suggestion. This does not verify a Shelf relationship. No image is sent."}</p>
          <p className="scan-privacy-essential" id="scan-retention-summary">No-training and zero-data-retention routing is required. Providers may retain operational metadata under their privacy policies.</p>
          <details className="scan-processing-details"><summary>Processing details</summary><p>Nothing is sent to the recognition provider until you submit. Processing cannot proceed without your consent for this input. If the required privacy controls are unavailable, processing is blocked—Shelf does not silently switch providers. Cancellation is best effort once a provider has started processing.</p><p>Consent version: {AI_PROCESSING_CONSENT_VERSION}. Changing the input requires a new acknowledgement.</p></details>
          <label><input type="checkbox" checked={consent} disabled={busy} aria-describedby="scan-processing-summary scan-retention-summary" onChange={(event) => setConsent(event.target.checked)} /><span>{visual ? "I agree to this processing for this image and have removed unnecessary personal or payment details." : "I agree to this processing of the product details for this request."}</span></label>
          <p id="scan-consent-state" className="scan-consent-required" role="status">{consent ? visual ? "Consent accepted for this image. Ready to identify." : "Consent accepted for these product details. Ready to continue." : "Accept the acknowledgement to enable identification, or search manually."}</p>
        </section> : null}
        {offline ? <p className="scan-alert" role="status">You’re offline. Manual catalog search is still available; identification needs a connection.</p> : null}
        {error ? <p className="scan-alert" role="alert">{error}</p> : null}
        <p role="status" className="scan-status">{busy ? mode === "barcode" || mode === "link" ? "Identifying product details…" : "Identifying products…" : message}</p>
        {busy ? <div className="scan-actions"><button className="scan-secondary" onClick={() => requestRef.current?.abort()}>Cancel identification</button><small>Cancellation is best effort once processing has started.</small></div> : (image && visual) || mode === "barcode" || mode === "link" ? <button className="scan-primary scan-identify" aria-describedby="scan-consent-state" data-cta={mode === "barcode" ? "C09" : mode === "link" ? "C12" : mode === "receipt" ? "C11" : "C08"} disabled={offline || preparing || !consent || (mode === "barcode" && !barcode) || (mode === "link" && !url.trim())} onClick={identify}>{mode === "barcode" || mode === "link" ? "Find product" : "Identify products"}<ArrowRight size={18} aria-hidden="true" /></button> : null}
      </section>
      <aside className="scan-methods" aria-label="Identification methods">
        <h2>Your starting point</h2>
        <div className="scan-method-list">{[{ id: "camera", name: "Camera", note: "Identify what’s in front of you", icon: Camera }, { id: "upload", name: "Upload image", note: "Photos and screenshots", icon: Upload }, { id: "search", name: "Search manually", note: "Find a reviewed Product by name", icon: Search }].map(({ id, name, note, icon: Icon }) => <button key={id} disabled={busy} aria-pressed={mode === id || (id === "upload" && mode === "screenshot")} onClick={() => selectMethod(id as Method)}><Icon size={20} aria-hidden="true" /><span><strong>{name}</strong><small>{note}</small></span><ArrowRight size={16} aria-hidden="true" /></button>)}</div>
        <details className="scan-other" open={["barcode", "receipt", "link"].includes(mode) || undefined}><summary>Other ways</summary><div className="scan-method-list">{[{ id: "barcode", name: "Barcode", note: "Scan or enter the digits", icon: Barcode }, { id: "receipt", name: "Receipt", note: "Product lines, without private details", icon: ReceiptText }, { id: "link", name: "Approved link", note: "A supported product page", icon: LinkIcon }].map(({ id, name, note, icon: Icon }) => <button key={id} disabled={busy} aria-pressed={mode === id} onClick={() => selectMethod(id as Method)}><Icon size={20} aria-hidden="true" /><span><strong>{name}</strong><small>{note}</small></span></button>)}</div></details>
      </aside>
    </div>
  </div>;
}
