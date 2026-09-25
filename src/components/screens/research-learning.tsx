"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  articles,
  companyById,
  companyBySlug,
  productById,
  productBySlug,
} from "@/data/catalog";
import { apiRequest, authenticationIsRequired } from "@/lib/api-client";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import { ResearchJourney, JourneyHeading } from "@/components/research-journey";
import { ArrowUpRight, ShieldCheck } from "@/components/studio-icons";
import { PendingButton, LoadingStatus } from "@/components/loading-feedback";
import { CopyButton } from "@/components/copy-button";
import { useNotification } from "@/components/notifications";
import {
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  ChartPieIcon,
  ChevronDownIcon,
  CircleStackIcon,
  InformationCircleIcon,
  LightBulbIcon,
  LockClosedIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StopIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  CtaLink,
  EmptyState,
  ErrorMessage,
  Field,
} from "@/components/ui";

const topics = [
  { name: "Products & relationships", slugs: ["brands-and-companies"] },
  {
    name: "Understanding exposure",
    slugs: ["stock-tokens", "pre-ipo-exposure", "price-differences"],
  },
  {
    name: "Wallet & transactions",
    slugs: ["usdc-and-solana", "fees", "splits-and-dividends"],
  },
];

export function LearnScreen({ slug }: { slug?: string }) {
  const [query, setQuery] = useState("");
  if (slug) {
    const article = articles.find((item) => item.slug === slug);
    if (!article)
      return (
        <EmptyState
          title="Explainer unavailable"
          action={
            <CtaLink id="learn-return" href="/learn">
              Learning library
            </CtaLink>
          }
        >
          Choose another reviewed topic from the library.
        </EmptyState>
      );
    return (
      <ResearchJourney kind="article" backHref="/learn" backLabel="Learning library">
        <JourneyHeading
          eyebrow={`Reviewed ${article.reviewedAt} · Version ${article.version}`}
          title={article.title}
        />
        <div className="learning-article-layout"><aside className="learning-margin-note"><ShieldCheck size={23} aria-hidden="true" /><p className="studio-eyebrow">Research notes</p><p>Build understanding, one connection at a time.</p><span>Reviewed {article.reviewedAt}</span></aside><article className="research-section learning-article-body" aria-label={article.title}>
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="muted">
            Shelf educational guidance. This is not a recommendation to buy or
            sell an instrument.
          </p>
        </article></div>
        <section className="research-section">
          <h2>Continue your research</h2>
          <div className="actions">
            <CtaLink id="C34" href="/assistant" secondary>
              Ask a research question
            </CtaLink>
            <CtaLink id="learn-discover" href="/discover" secondary>
              Explore products and companies
            </CtaLink>
          </div>
        </section>
      </ResearchJourney>
    );
  }
  const matching = articles.filter((article) =>
    `${article.title} ${article.body.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase().trim())
  );
  return (
    <ResearchJourney kind="library">
      <JourneyHeading eyebrow="Learning library" title="Understand each layer.">
        <p>
          Products, companies, exposure and ownership. Reviewed explainers for
          the decisions in between.
        </p>
      </JourneyHeading>
      <Field label="Find a topic" htmlFor="learn-search">
        <input
          id="learn-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Relationships, fees, pricing…"
        />
      </Field>
      {topics.map((topic) => {
        const entries = matching.filter((article) =>
          topic.slugs.includes(article.slug)
        );
        return entries.length ? (
          <section className="research-section" key={topic.name}>
            <h2>{topic.name}</h2>
            <div className="research-rows">
              {entries.map((article) => (
                <article className="research-row" key={article.slug}>
                  <div>
                    <h3>
                      <Link href={`/learn/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>
                    <p className="muted">
                      Reviewed {article.reviewedAt} · Version {article.version}
                    </p>
                  </div>
                  <Link
                    className="button ghost"
                    href={`/learn/${article.slug}`}
                    aria-label={`Read ${article.title}`}
                  >
                    Read <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null;
      })}
      {!matching.length ? (
        <EmptyState title="No matching topics">
          Try a broader term, such as fees or companies.
        </EmptyState>
      ) : null}
    </ResearchJourney>
  );
}

type ResearchAnswer = {
  answer: string;
  sourceIds: string[];
  uncertainty: string[];
};

type ResearchTurn = {
  id: number;
  question: string;
  context: string;
  status: "pending" | "complete" | "failed" | "stopped";
  answer?: ResearchAnswer;
  error?: string;
};

const researchPrompts = [
  { label: "Follow the connection", question: "How are brands and companies connected?", icon: CircleStackIcon },
  { label: "Understand what you own", question: "How is an instrument different from a share?", icon: ChartPieIcon },
  { label: "Make the terms make sense", question: "What should I understand about USDC and Solana?", icon: LightBulbIcon },
];

function AssistantEmblem({ small = false }: { small?: boolean }) {
  return <span className={`chat-emblem${small ? " chat-emblem-small" : ""}`} aria-hidden="true"><SparklesIcon /></span>;
}

/** Render provider text as text; source IDs become links only through the reviewed catalog. */
function AnswerSources({ sourceIds }: { sourceIds: string[] }) {
  return <ul className="chat-citations">{Array.from(new Set(sourceIds)).map((id) => {
    const article = articles.find((item) => `article:${item.slug}` === id);
    return <li key={id}>{article
      ? <Link href={`/learn/${article.slug}`}><BookOpenIcon aria-hidden="true" />{article.title}<ArrowUpRightIcon aria-hidden="true" /></Link>
      : <span>{id} · Check this reference independently.</span>}
    </li>;
  })}</ul>;
}

export function AssistantScreen() {
  const params = useSearchParams();
  const product = productById(params.get("product") ?? "") ?? productBySlug(params.get("product") ?? "");
  const company = companyById(params.get("company") ?? "") ?? companyBySlug(params.get("company") ?? "");
  const [includeContext, setIncludeContext] = useState(true);
  const [question, setQuestion] = useState(() => {
    const prompts: Record<string, string> = {
      ownership: "How are brands and companies connected?",
      exposure: "How is an instrument different from a share?",
      wallet: "What should I understand about USDC and Solana?",
    };
    return prompts[params.get("prompt") ?? ""] ?? "";
  });
  const [consent, setConsent] = useState(false);
  const [turns, setTurns] = useState<ResearchTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [privacyOpen, setPrivacyOpen] = useState(true);
  const request = useRef<AbortController | null>(null);
  const nextTurnId = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const notify = useNotification();

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 899px)");
    const update = () => setSourcesOpen(!mobile.matches);
    update();
    mobile.addEventListener("change", update);
    return () => mobile.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("me")
      .then(() => { if (active) setSignedIn(true); })
      .catch((reason) => {
        if (!active) return;
        if (authenticationIsRequired(reason)) setSignedIn(false);
        else setAccountError("Account access could not be checked. Reload to retry.");
      });
    return () => {
      active = false;
      request.current?.abort();
    };
  }, []);

  useEffect(() => {
    const element = conversation.current;
    if (element && followLatest.current) element.scrollTop = element.scrollHeight;
  }, [turns]);

  const context = includeContext ? [product?.name, company?.name].filter(Boolean).join(" · ") : "";
  const latestAnswer = turns.findLast((turn) => turn.answer)?.answer;
  const completedTurns = turns.filter((turn) => turn.status === "complete").length;

  function selectPrompt(prompt: string) {
    setQuestion(prompt);
    composer.current?.focus();
  }

  async function ask(retry?: ResearchTurn) {
    const submittedQuestion = retry?.question ?? question.trim();
    const submittedContext = retry?.context ?? context;
    if (!submittedQuestion || !consent || request.current || !signedIn) return;
    const controller = new AbortController();
    const id = retry?.id ?? ++nextTurnId.current;
    request.current = controller;
    followLatest.current = true;
    setBusy(true);
    const pendingTurn: ResearchTurn = { id, question: submittedQuestion, context: submittedContext, status: "pending" };
    setTurns((current) => retry ? current.map((turn) => turn.id === id ? pendingTurn : turn) : [...current, pendingTurn]);
    if (!retry) setQuestion("");

    try {
      await apiRequest("consents", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({ scope: "ai_processing", version: AI_PROCESSING_CONSENT_VERSION, accepted: true }),
      });
      const response = await apiRequest<ResearchAnswer>("ai/answer", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          question: submittedContext ? `About ${submittedContext}: ${submittedQuestion}` : submittedQuestion,
          includeShelf: false,
          aiProcessingConsentAccepted: true,
          aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
        }),
      });
      if (!controller.signal.aborted) {
        setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, status: "complete", answer: response } : turn));
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        const message = reason instanceof Error ? reason.message.replaceAll("_", " ").toLowerCase() : "please retry";
        setTurns((current) => current.map((turn) => turn.id === id
          ? { ...turn, status: "failed", error: `Research response unavailable: ${message}. Your question is kept here so you can try again.` }
          : turn));
      }
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }

  function stopResponse() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setTurns((current) => current.map((turn) => turn.status === "pending" ? { ...turn, status: "stopped" } : turn));
    notify("Response stopped. Provider cancellation is best effort.");
  }

  function clearConversation() {
    setQuestion("");
    setTurns([]);
    composer.current?.focus();
    notify("Conversation cleared from this page.");
  }

  return (
    <div className="assistant-chat">
      <header className="chat-topbar">
        <div className="chat-identity"><AssistantEmblem small /><div><h1>Research Assistant</h1><p>A little more understanding, every day.</p></div></div>
        <div className="chat-top-actions">
          <button type="button" className="ghost chat-new" aria-label="Clear" title="Start a new chat" data-cta="C37" disabled={busy} onClick={clearConversation}><PlusIcon aria-hidden="true" /><span>New chat</span></button>
          <button type="button" className="ghost chat-reference-toggle" aria-label={sourcesOpen ? "Hide research references" : "Show research references"} aria-expanded={sourcesOpen} aria-controls="chat-reference-panel" onClick={() => setSourcesOpen(!sourcesOpen)}><BookOpenIcon aria-hidden="true" /><span>References</span></button>
        </div>
      </header>

      <div className="chat-studio" data-references-open={sourcesOpen}>
        <div className="chat-main">
          {turns.length === 0 ? <section className="chat-welcome" aria-labelledby="chat-welcome-title">
            <div className="chat-welcome-emblem"><AssistantEmblem /><span className="chat-emblem-orbit" aria-hidden="true" /></div>
            <p className="chat-kicker">FOLLOW YOUR CURIOSITY</p>
            <h2 id="chat-welcome-title">Good questions.<br /><span>Clearer perspectives.</span></h2>
            <p>From the products in your day to the companies behind them.<br className="chat-desktop-break" /> Let’s make the connections make sense.</p>
            <div className="chat-suggestions">{researchPrompts.map(({ label, question: prompt, icon: Icon }) => <button type="button" key={label} className="ghost chat-suggestion" aria-label={prompt} onClick={() => selectPrompt(prompt)}><Icon aria-hidden="true" /><span>{label}<strong>{prompt}</strong></span><ArrowUpRightIcon aria-hidden="true" /></button>)}</div>
          </section> : <div ref={conversation} className="chat-conversation" role="log" aria-label="Research conversation" aria-live="polite" aria-relevant="additions text" onScroll={(event) => {
            const element = event.currentTarget;
            followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
          }}>
            <p className="chat-session-label"><LockClosedIcon aria-hidden="true" /> This conversation stays in this open page</p>
            {turns.map((turn) => <div className="chat-turn" key={turn.id}>
              <article className="chat-user-message" aria-label="Your question"><p>{turn.question}</p>{turn.context ? <span>About {turn.context}</span> : null}</article>
              <article className="chat-assistant-message" aria-labelledby={`chat-answer-${turn.id}`}>
                <AssistantEmblem small />
                <div className="chat-answer-content"><h2 id={`chat-answer-${turn.id}`}>Research response <span>Shelf AI</span></h2>
                  {turn.status === "pending" ? <LoadingStatus>Looking into your question…</LoadingStatus> : null}
                  {turn.answer ? <>
                    <div className="chat-answer-text">{turn.answer.answer.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                    {turn.answer.uncertainty?.length ? <div className="chat-answer-caveat"><InformationCircleIcon aria-hidden="true" /><div><strong>A little context to keep in mind</strong><ul>{turn.answer.uncertainty.map((note) => <li key={note}>{note}</li>)}</ul></div></div> : null}
                    <CopyButton value={turn.answer.answer} label="Copy response" copiedLabel="Response copied" className="chat-copy" />
                    {turn.answer.sourceIds?.length ? <details className="chat-answer-sources"><summary><BookOpenIcon aria-hidden="true" />{new Set(turn.answer.sourceIds).size} source references<ChevronDownIcon aria-hidden="true" /></summary><AnswerSources sourceIds={turn.answer.sourceIds} /></details> : <p className="chat-unverified"><InformationCircleIcon aria-hidden="true" />No source references were returned. Treat this answer as unverified.</p>}
                  </> : null}
                  {turn.status === "failed" ? <ErrorMessage message={turn.error ?? "Response unavailable. Please try again."} /> : null}
                  {turn.status === "stopped" ? <p className="chat-stopped">Response stopped. You can pick this question up again.</p> : null}
                  {turn.status === "failed" || turn.status === "stopped" ? <button type="button" className="ghost chat-retry" disabled={busy || !consent || !signedIn} onClick={() => void ask(turn)}><ArrowPathIcon aria-hidden="true" />Try again</button> : null}
                </div>
              </article>
            </div>)}
            {!busy && latestAnswer ? <div className="chat-followups"><span>Keep exploring</span>{["What rights does a stock token give me?", "Why can token and share prices differ?"].map((prompt) => <button type="button" className="ghost" key={prompt} onClick={() => selectPrompt(prompt)}>{prompt}<ArrowUpRightIcon aria-hidden="true" /></button>)}</div> : null}
          </div>}

          <div className="chat-composer-area">
            <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
              {context ? <div className="chat-context-pill assistant-source-context"><CircleStackIcon aria-hidden="true" /><span>Exploring {context}</span><button type="button" className="ghost" aria-label="Remove context" disabled={busy} onClick={() => setIncludeContext(false)}><XMarkIcon aria-hidden="true" /></button></div> : null}
              <label className="feedback-sr-only" htmlFor="assistant-question">Your research question</label>
              <textarea ref={composer} id="assistant-question" rows={2} maxLength={850} placeholder={turns.length ? "What else would you like to understand?" : "What are you curious about?"} value={question} aria-describedby="chat-question-hint" onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(); }
              }} />
              <div className="chat-composer-tools"><span id="chat-question-hint"><SparklesIcon aria-hidden="true" />Research, made clear</span><div><span className="chat-character-count" aria-label={`${question.length} of 850 characters`}>{question.length ? `${question.length}/850` : "↵ to send"}</span>{busy
                ? <button type="button" className="chat-stop secondary" data-cta="C36" onClick={stopResponse}><StopIcon aria-hidden="true" /><span>Stop response</span></button>
                : <PendingButton className="chat-send" pending={false} pendingLabel="Preparing response…" type="submit" data-cta="C35" icon={<ArrowUpIcon aria-hidden="true" />} disabled={!signedIn || !consent || !question.trim()}>Send question</PendingButton>}</div></div>
            </form>
            <div className="chat-consent">
              <label className="checkbox-row"><input type="checkbox" checked={consent} disabled={busy} aria-describedby="assistant-privacy" onChange={(event) => { setConsent(event.target.checked); setPrivacyOpen(!event.target.checked); }} /><span>I agree to this processing of my question.</span></label>
              <details open={privacyOpen} onToggle={(event) => setPrivacyOpen(event.currentTarget.open)}><summary><ShieldCheckIcon aria-hidden="true" />Privacy & how it works<ChevronDownIcon aria-hidden="true" /></summary><p id="assistant-privacy">Your question{context ? " and the named product/company context" : ""} will be sent to OpenRouter and its model provider. No-training and zero-data-retention routing is required. Providers may retain operational metadata. Saved items and earlier messages are not included. Each question is answered independently. Do not include wallet details, personal information or receipt text.</p></details>
            </div>
            {signedIn === false ? <p className="chat-sign-in"><LockClosedIcon aria-hidden="true" /><span><Link href="/sign-in?returnTo=%2Fassistant">Sign in to ask a question.</Link> You can explore reviewed sources anytime.</span></p> : null}
            {signedIn === null && !accountError ? <LoadingStatus>Checking account access…</LoadingStatus> : null}
            <ErrorMessage message={accountError} />
            <p className="chat-bottom-note">A research companion, never a financial adviser. Verify sources before acting.</p>
          </div>
        </div>

        <aside className="chat-reference-panel" id="chat-reference-panel" hidden={!sourcesOpen} aria-label="Research references">
          <div className="chat-reference-heading"><BookOpenIcon aria-hidden="true" /><span>THE READING ROOM</span><span className="chat-reference-dot" aria-hidden="true" /></div>
          <h2>Understanding<br />starts here.</h2><p>A few good sources.<br />A more informed perspective.</p>
          {latestAnswer?.sourceIds?.length ? <div className="chat-current-sources"><h3>From your latest response</h3><AnswerSources sourceIds={latestAnswer.sourceIds} /></div> : null}
          <div className="chat-reading-list">{articles.slice(0, 3).map((article, index) => <Link href={`/learn/${article.slug}`} key={article.slug}><span className="chat-reading-number">0{index + 1}</span><span><small>REVIEWED EXPLAINER</small><strong>{article.title}</strong></span><ArrowUpRightIcon aria-hidden="true" /></Link>)}</div>
          <Link className="chat-library-link" href="/learn">Explore the learning library<ArrowUpRightIcon aria-hidden="true" /></Link>
          <details className="chat-allocation"><summary>Thinking about allocation?<ChevronDownIcon aria-hidden="true" /></summary><p>Explore an editable plan in a separate step. Nothing here submits an order.</p><Link href="/invest/basket?source=ai" data-cta="C38">Open allocation planning<ArrowUpRightIcon aria-hidden="true" /></Link></details>
          <div className="chat-reference-footer"><ShieldCheckIcon aria-hidden="true" /><p>Your curiosity. Your control.<span>The Assistant cannot place orders or sign transactions.</span></p>{completedTurns ? <span className="chat-answer-count">{completedTurns} answered in this chat</span> : null}</div>
        </aside>
      </div>
    </div>
  );
}
