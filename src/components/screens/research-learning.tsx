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
import { WorkspaceFrame } from "@/components/platform-composition";
import {
  CtaLink,
  EmptyState,
  ErrorMessage,
  Field,
  PageIntro,
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
      <div className="research-reading">
        <Link href="/learn">← Learning library</Link>
        <PageIntro
          eyebrow={`Reviewed ${article.reviewedAt} · Version ${article.version}`}
          title={article.title}
        />
        <article className="research-section" aria-label={article.title}>
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="muted">
            Shelf educational guidance. This is not a recommendation to buy or
            sell an instrument.
          </p>
        </article>
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
      </div>
    );
  }
  const matching = articles.filter((article) =>
    `${article.title} ${article.body.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase().trim())
  );
  return (
    <>
      <PageIntro eyebrow="Learning library" title="Understand each layer.">
        <p>
          Products, companies, exposure and ownership. Reviewed explainers for
          the decisions in between.
        </p>
      </PageIntro>
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
                    Read →
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
    </>
  );
}

type ResearchAnswer = {
  answer: string;
  sourceIds: string[];
  uncertainty: string[];
};

export function AssistantScreen() {
  const params = useSearchParams();
  const product =
    productById(params.get("product") ?? "") ??
    productBySlug(params.get("product") ?? "");
  const company =
    companyById(params.get("company") ?? "") ??
    companyBySlug(params.get("company") ?? "");
  const [includeContext, setIncludeContext] = useState(true);
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<ResearchAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 819px)");
    const update = () => setSourcesOpen(!mobile.matches);
    update();
    mobile.addEventListener("change", update);
    return () => mobile.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let active = true;
    apiRequest("me")
      .then(() => {
        if (active) setSignedIn(true);
      })
      .catch((reason) => {
        if (active) {
          if (authenticationIsRequired(reason)) setSignedIn(false);
          else
            setError("Account access could not be checked. Reload to retry.");
        }
      });
    return () => {
      active = false;
      request.current?.abort();
    };
  }, []);
  const context = includeContext
    ? [product?.name, company?.name].filter(Boolean).join(" · ")
    : "";
  async function ask() {
    if (!question.trim() || !consent || busy || !signedIn) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setAnswer(null);
    setStatus("Preparing your response…");
    try {
      await apiRequest("consents", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          scope: "ai_processing",
          version: AI_PROCESSING_CONSENT_VERSION,
          accepted: true,
        }),
      });
      const response = await apiRequest<ResearchAnswer>("ai/answer", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          question: context
            ? `About ${context}: ${question.trim()}`
            : question.trim(),
          includeShelf: false,
          aiProcessingConsentAccepted: true,
          aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
        }),
      });
      if (!controller.signal.aborted) {
        setAnswer(response);
        setStatus("Response ready. Check its cited sources.");
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        setStatus("");
        setError(
          `Research response unavailable: ${
            reason instanceof Error
              ? reason.message.replaceAll("_", " ").toLowerCase()
              : "please retry"
          }. Your question is unchanged.`
        );
      }
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  return (
    <WorkspaceFrame kind="assistant">
      <header className="assistant-masthead"><h1>Research Assistant</h1><p>Questions lead to understanding.</p></header>
      <div className="assistant-desk">
        <div className="assistant-response-canvas" aria-busy={busy}>
          <p className="platform-label">Shelf / Research notebook</p>
          {answer ? <section aria-labelledby="research-answer">
            <h2 id="research-answer">Research response</h2>
            <p className="assistant-answer-copy">{answer.answer}</p>
            {answer.uncertainty?.length ? <ul className="assistant-uncertainty">{answer.uncertainty.map((note) => <li key={note}>{note}</li>)}</ul> : null}
            {!answer.sourceIds?.length ? <p>No source references were returned. Treat this answer as unverified.</p> : null}
          </section> : <div className="assistant-start">
            <h2>{busy ? "Following your question." : <>An everyday question.<br /><span>A clearer perspective.</span></>}</h2>
            <p>{busy ? "Preparing a response. Verify its sources before relying on it." : "Explore the relationship between a product, the company behind it and a separate investment instrument."}</p>
            {!busy ? <div className="assistant-prompts"><span>Start a line of research</span>{["How are brands and companies connected?", "How is an instrument different from a share?"].map((prompt) => <button className="ghost" key={prompt} onClick={() => { setQuestion(prompt); document.getElementById("assistant-question")?.focus(); }}>{prompt} <span aria-hidden="true">↗</span></button>)}</div> : null}
          </div>}
          <p className="assistant-limitation">Responses can be incorrect. Verify the sources.<br />The Assistant cannot place orders or sign transactions.</p>
        </div>
        <aside className="assistant-sources">
          <details open={sourcesOpen} onToggle={(event) => setSourcesOpen(event.currentTarget.open)}>
          <summary>{answer ? "Cited sources" : "Start with a source"}</summary>
          {context ? <div className="assistant-source-context"><span>Research context</span><strong>{context}</strong></div> : null}
          {answer?.sourceIds?.length ? <ul>{answer.sourceIds.map((id) => {
            const article = articles.find((item) => `article:${item.slug}` === id);
            return <li key={id}>{article ? <Link href={`/learn/${article.slug}`}>{article.title} ↗</Link> : <span>{id} · Check this reference independently.</span>}</li>;
          })}</ul> : null}
          <p className="platform-label">Reviewed explainers</p>
          {articles.slice(0, 3).map((article) => <Link className="assistant-source" href={`/learn/${article.slug}`} key={article.slug}><span>Learn</span><strong>{article.title}</strong><span aria-hidden="true">↗</span></Link>)}
          <details><summary>Allocation questions</summary><p>Allocation is a separate, editable planning step. It does not submit an order.</p><CtaLink id="C38" href="/invest/basket?source=ai" secondary>Open allocation planning</CtaLink></details>
          </details>
        </aside>
      </div>
        <section className="assistant-composer">
          {context ? (
            <div className="notice">
              Context: {context}{" "}
              <button
                className="ghost"
                onClick={() => setIncludeContext(false)}
                disabled={busy}
              >
                Remove context
              </button>
            </div>
          ) : null}
          <Field
            label="Your research question"
            htmlFor="assistant-question"
            hint="Do not include wallet details, personal information or receipt text."
          >
            <textarea
              id="assistant-question"
              rows={2}
              placeholder="Ask about a product, company or exposure…"
              maxLength={850}
              value={question}
              disabled={busy}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </Field>
          <div className="assistant-permission"><p id="assistant-privacy">
            Your question
            {context ? " and the named product/company context" : ""} will be
            sent to OpenRouter and its model provider. No-training and
            zero-data-retention routing is required. Providers may retain
            operational metadata. Saved items are not included.
          </p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              aria-describedby="assistant-privacy"
              onChange={(event) => setConsent(event.target.checked)}
            />{" "}
            I agree to this processing of my question.
          </label>
          </div>
          <div className="actions">
            <button
              data-cta="C35"
              disabled={!signedIn || !consent || !question.trim() || busy}
              onClick={ask}
            >
              {busy ? "Preparing response…" : "Send question"}
            </button>
            {busy ? (
              <button
                className="secondary"
                data-cta="C36"
                onClick={() => {
                  request.current?.abort();
                  setStatus(
                    "Response stopped. Provider cancellation is best effort."
                  );
                }}
              >
                Stop response
              </button>
            ) : null}
            <button
              className="ghost"
              data-cta="C37"
              disabled={busy}
              onClick={() => {
                setQuestion("");
                setAnswer(null);
                setError(null);
                setStatus("Question and response cleared from this page.");
              }}
            >
              Clear
            </button>
          </div>
          {signedIn === false ? (
            <p className="notice">
              <Link href="/sign-in?returnTo=%2Fassistant">
                Sign in to ask a question.
              </Link>{" "}
              Reviewed explainers remain available without an account.
            </p>
          ) : null}
          {signedIn === null && !error ? (
            <p role="status">Checking account access…</p>
          ) : null}
          <p role="status">{status}</p>
          <ErrorMessage message={error} />
        </section>
    </WorkspaceFrame>
  );
}
