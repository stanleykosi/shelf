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
  const request = useRef<AbortController | null>(null);
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
    <>
      <PageIntro eyebrow="Shelf research" title="Research Assistant">
        <p>
          Ask about products, companies and exposure. Responses can be
          incorrect; verify the sources. The Assistant cannot place orders or
          sign transactions.
        </p>
      </PageIntro>
      <div className="research-split">
        <section className="research-section stack">
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
              rows={5}
              maxLength={850}
              value={question}
              disabled={busy}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </Field>
          <p id="assistant-privacy">
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
        <aside className="research-section">
          <h2>Start with a source</h2>
          <p>
            For factual definitions, the reviewed learning library is available
            without external processing.
          </p>
          <div className="research-rows">
            {articles.slice(0, 3).map((article) => (
              <p key={article.slug}>
                <Link href={`/learn/${article.slug}`}>{article.title} →</Link>
              </p>
            ))}
          </div>
          <details>
            <summary>Allocation questions</summary>
            <p>
              Allocation is a separate, editable planning step. It does not
              submit an order.
            </p>
            <CtaLink id="C38" href="/invest/basket?source=ai" secondary>
              Open allocation planning
            </CtaLink>
          </details>
        </aside>
      </div>
      {answer ? (
        <section
          className="research-section research-reading"
          aria-labelledby="research-answer"
        >
          <h2 id="research-answer">Research response</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{answer.answer}</p>
          {answer.uncertainty?.length ? (
            <ul className="notice">
              {answer.uncertainty.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          <h3>Cited sources</h3>
          {answer.sourceIds?.length ? (
            <ul>
              {answer.sourceIds.map((id) => {
                const article = articles.find(
                  (item) => `article:${item.slug}` === id
                );
                return (
                  <li key={id}>
                    {article ? (
                      <Link href={`/learn/${article.slug}`}>
                        {article.title}
                      </Link>
                    ) : (
                      <span>{id} · Check this reference independently.</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>
              No source references were returned. Treat this answer as
              unverified.
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}
