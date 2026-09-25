"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import type { ChatTurn, IssuerChatReference } from "@/domain/ai-chat";
import type { IssuerListing } from "@/domain/issuer-assets";
import { apiRequest } from "@/lib/api-client";
import { IssuerLogo } from "@/components/issuer-logo";
import { Card, CtaLink, ErrorMessage, Field, PageIntro } from "@/components/ui";

type AssistantMessage = ChatTurn & {
  id: string;
  sourceIds?: string[];
  uncertainty?: string[];
};

const chatErrorMessages: Record<string, string> = {
  AI_PROVIDER_UNAVAILABLE: "The AI provider is unavailable. Your question is ready to retry.",
  AI_PRIVACY_UNAVAILABLE: "The AI provider cannot meet Shelf's privacy requirements right now.",
  AI_USER_LIMIT_REACHED: "You've reached today's AI question limit. Try again tomorrow.",
  AI_DAILY_LIMIT_REACHED: "Shelf's AI budget is used for today. Try again tomorrow.",
  AI_MONTHLY_LIMIT_REACHED: "Shelf's monthly AI budget is used. Try again later.",
  AI_CONTEXT_TOO_LARGE: "The issuer sent more detail than this chat can safely process.",
  XSTOCKS_UNAVAILABLE: "The xStocks feed is unavailable. Your question is ready to retry.",
  PRESTOCKS_UNAVAILABLE: "The PreStocks feed is unavailable. Your question is ready to retry.",
  NOT_FOUND: "This issuer listing is no longer available. Return to token details to check it.",
};

export function IssuerAssistantScreen({ issuer }: { issuer: IssuerChatReference }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [listing, setListing] = useState<IssuerListing | null>(null);
  const [contextStatus, setContextStatus] = useState<"loading" | "ready" | "unavailable">(
    issuer ? "loading" : "ready",
  );
  const [quotaReady, setQuotaReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<{
    controller: AbortController;
    prompt: string;
    userMessageId: string;
  } | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const provider = issuer?.provider;
  const symbol = issuer?.symbol;

  useEffect(() => {
    let active = true;
    apiRequest("ai/session")
      .catch(() => undefined)
      .finally(() => { if (active) setQuotaReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!provider || !symbol) return;
    let active = true;
    apiRequest<{ listing: IssuerListing | null }>(
      `issuer/asset/${provider}/${encodeURIComponent(symbol)}`,
    )
      .then(({ listing: current }) => {
        if (!active) return;
        if (current?.provider !== provider ||
          current.asset.symbol.toLowerCase() !== symbol.toLowerCase()) {
          setContextStatus("unavailable");
          return;
        }
        setListing(current);
        setContextStatus("ready");
      })
      .catch(() => {
        if (active) setContextStatus("unavailable");
      });
    return () => { active = false; };
  }, [provider, symbol]);

  useEffect(() => () => requestRef.current?.controller.abort(), []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || pending || contextStatus !== "ready" || !quotaReady) return;

    const controller = new AbortController();
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(), role: "user", content: prompt,
    };
    requestRef.current = { controller, prompt, userMessageId: userMessage.id };
    const history = messages.slice(-6).map(({ role, content }) => ({
      role,
      content: content.slice(0, 1_000),
    }));
    setMessages((current) => [...current, userMessage].slice(-40));
    setQuestion("");
    setPending(true);
    setError(null);
    try {
      const response = await apiRequest<{
        answer: string;
        sourceIds: string[];
        uncertainty: string[];
        issuer: IssuerListing | null;
      }>("ai/answer", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({ question: prompt, history, issuer }),
      });
      if (controller.signal.aborted) return;
      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(), role: "assistant", content: response.answer,
        sourceIds: response.sourceIds, uncertainty: response.uncertainty,
      };
      setMessages((current) => [...current, assistantMessage].slice(-40));
      if (response.issuer) setListing(response.issuer);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setMessages((current) => current.filter((message) => message.id !== userMessage.id));
        setQuestion(prompt);
        const code = requestError instanceof Error ? requestError.message : "";
        setError(chatErrorMessages[code] ?? "The answer could not be loaded. Your question is ready to retry.");
      }
    } finally {
      if (requestRef.current?.controller === controller) {
        requestRef.current = null;
        setPending(false);
      }
    }
  }

  function stopResponse() {
    const activeRequest = requestRef.current;
    if (!activeRequest) return;
    activeRequest.controller.abort();
    requestRef.current = null;
    setMessages((current) => current.filter((message) => message.id !== activeRequest.userMessageId));
    setQuestion(activeRequest.prompt);
    setPending(false);
    setError("Stopped waiting for the response. The provider may still finish processing it.");
  }

  function clearConversation() {
    requestRef.current?.controller.abort();
    requestRef.current = null;
    setMessages([]);
    setQuestion("");
    setPending(false);
    setError(null);
  }

  const asset = listing?.asset;
  const sourceName = issuer?.provider === "xstocks" ? "xStocks" : "PreStocks";
  const sourceUrl = issuer?.provider === "xstocks"
    ? "https://xstocks.fi/"
    : listing?.provider === "prestocks" ? listing.asset.issuerUrl : "https://prestocks.com/";
  const chatReady = contextStatus === "ready" && quotaReady;

  return (
    <div className="issuer-assistant-studio">
      <PageIntro eyebrow="AI assistant" title={asset ? `Chat about ${asset.name}` : issuer ? `Chat about ${issuer.symbol}` : "Ask about products, companies and stock tokens"}>
        <p>Ask questions about the issuer details. AI can explain the source, but it may be wrong and cannot place orders or sign transactions.</p>
      </PageIntro>
      {issuer ? (
        <Card className="stack issuer-chat-context">
          {contextStatus === "loading" ? <p role="status">Loading current {sourceName} details…</p> : null}
          {contextStatus === "unavailable" ? (
            <>
              <h2>Issuer details unavailable</h2>
              <p>Chat is paused until the current {sourceName} listing can be checked.</p>
              <CtaLink id="issuer-chat-retry" href={`/assets/${issuer.provider}/${issuer.symbol}`} secondary>
                Return to token details
              </CtaLink>
            </>
          ) : null}
          {asset ? (
            <>
              <div className="issuer-chat-heading">
                <IssuerLogo imageUrl={asset.logoUrl} name={asset.name} source={issuer.provider} />
                <div>
                  <span className="badge">{sourceName} context loaded</span>
                  <h2>{asset.name} · {asset.symbol}</h2>
                </div>
              </div>
              <p>{asset.description || "The issuer has not supplied a description."}</p>
              <p className="muted">Issuer feed checked {new Date(asset.observedAt).toLocaleString()}. The token mint and market details are rechecked for each answer.</p>
              <div className="actions">
                <Link href={`/assets/${issuer.provider}/${encodeURIComponent(asset.symbol)}` as Route}>View token details</Link>
                <a href={sourceUrl} target="_blank" rel="noreferrer">Issuer source</a>
              </div>
            </>
          ) : null}
        </Card>
      ) : null}
      <Card className="stack">
        <div className="assistant-conversation" role="log" aria-label="AI conversation" aria-live="polite">
          {messages.length ? messages.map((message) => (
            <div className={`assistant-message ${message.role}`} key={message.id}>
              <strong>{message.role === "user" ? "You" : "Shelf AI"}</strong>
              <p>{message.content}</p>
              {message.sourceIds?.length ? (
                <p className="muted">Source: {issuer ? `${sourceName} issuer feed` : message.sourceIds.join(", ")}</p>
              ) : null}
              {message.uncertainty?.length ? (
                <p className="muted">Uncertainty: {message.uncertainty.join(" ")}</p>
              ) : null}
            </div>
          )) : (
            <p className="muted">{issuer
              ? "The current issuer details are ready. Ask your first question when you are ready."
              : "Ask a question to start a conversation."}</p>
          )}
          {!quotaReady ? <p role="status">Preparing your chat…</p> : null}
          {pending ? <p role="status">Thinking through the current source…</p> : null}
          <div ref={conversationEndRef} />
        </div>
        {issuer && contextStatus === "ready" && !messages.length ? (
          <div className="assistant-suggestions" aria-label="Suggested questions">
            <button className="secondary" onClick={() => setQuestion("What does this token represent?")}>What does this token represent?</button>
            <button className="secondary" onClick={() => setQuestion("What does the issuer say about trading and liquidity?")}>How does trading work?</button>
            <button className="secondary" onClick={() => setQuestion("What important company information is missing from this issuer feed?")}>What is missing?</button>
          </div>
        ) : null}
        <form className="stack" onSubmit={ask}>
          <Field label="Your question" htmlFor="assistant-question">
            <textarea
              id="assistant-question"
              maxLength={2000}
              rows={3}
              value={question}
              disabled={pending || !chatReady}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={asset ? `Ask about ${asset.name} or ${asset.symbol}` : "Ask about a product, company or stock token"}
            />
          </Field>
          <div className="actions">
            <button data-cta="C35" type="submit" disabled={!question.trim() || pending || !chatReady}>
              {pending ? "Waiting for answer…" : "Send message"}
            </button>
            <button className="secondary" data-cta="C36" type="button" disabled={!pending} onClick={stopResponse}>
              Stop response
            </button>
            <button className="ghost" data-cta="C37" type="button" disabled={!messages.length && !question} onClick={clearConversation}>
              Clear chat
            </button>
            {!issuer ? <CtaLink id="C38" href="/invest/basket?source=ai" secondary>Suggest an allocation</CtaLink> : null}
          </div>
        </form>
        <ErrorMessage message={error} />
      </Card>
    </div>
  );
}
