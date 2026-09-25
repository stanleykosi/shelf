"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import type { IssuerChatReference } from "@/domain/ai-chat";
import type { IssuerListing } from "@/domain/issuer-assets";
import { apiRequest, authenticationIsRequired } from "@/lib/api-client";
import {
  chatHistoryKey, chatScopeKey, readChatThreads, saveChatThreads, threadPath,
  type SavedChatMessage, type SavedChatThread,
} from "@/lib/chat-history";
import { IssuerLogo } from "@/components/issuer-logo";
import { CtaLink, ErrorMessage, Field, PageIntro } from "@/components/ui";
import { Clock, Sparkles, X } from "@/components/studio-icons";

type AssistantMessage = SavedChatMessage;

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

export function IssuerAssistantScreen({ issuer, compact = false }: {
  issuer: IssuerChatReference | null;
  compact?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [listing, setListing] = useState<IssuerListing | null>(null);
  const [contextStatus, setContextStatus] = useState<"loading" | "ready" | "unavailable">(
    issuer ? "loading" : "ready",
  );
  const [quotaReady, setQuotaReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<SavedChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [historyLocation, setHistoryLocation] = useState<"device" | "tab">("tab");
  const [historySaveError, setHistorySaveError] = useState(false);
  const storageRef = useRef<{ storage: Storage; key: string } | null>(null);
  const requestRef = useRef<{
    controller: AbortController;
    prompt: string;
    userMessageId: string;
  } | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const provider = issuer?.provider;
  const symbol = issuer?.symbol;
  const scopeKey = chatScopeKey(provider, symbol);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      let memberId: string | undefined;
      try {
        const account = await apiRequest<{ id: string }>("me");
        memberId = account.id;
      } catch (reason) {
        if (!authenticationIsRequired(reason)) {
          if (active) setHistoryStatus("unavailable");
          return;
        }
      }
      if (!active) return;
      try {
        const target = {
          storage: memberId ? window.localStorage : window.sessionStorage,
          key: chatHistoryKey(memberId),
        };
        storageRef.current = target;
        const saved = readChatThreads(target.storage, target.key);
        const requestedId = new URLSearchParams(window.location.search).get("thread");
        const selected = saved.find((thread) => thread.scopeKey === scopeKey && thread.id === requestedId) ??
          saved.find((thread) => thread.scopeKey === scopeKey);
        setThreads(saved);
        setHistoryLocation(memberId ? "device" : "tab");
        setActiveThreadId(selected?.id ?? null);
        setMessages(selected?.messages ?? []);
        setHistoryStatus("ready");
      } catch {
        setHistoryStatus("unavailable");
      }
    }
    void loadHistory();
    return () => { active = false; };
  }, [scopeKey]);

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

  function storeThreads(next: SavedChatThread[]) {
    const target = storageRef.current;
    setThreads(next);
    if (target && saveChatThreads(target.storage, target.key, next)) {
      setHistorySaveError(false);
    } else {
      setHistorySaveError(true);
    }
  }

  function saveConversation(completed: AssistantMessage[], prompt: string) {
    const id = activeThreadId ?? crypto.randomUUID();
    const previous = threads.find((thread) => thread.id === id);
    const updated: SavedChatThread = {
      id,
      scopeKey,
      title: previous?.title ?? prompt.slice(0, 60),
      updatedAt: Date.now(),
      messages: completed,
    };
    storeThreads([updated, ...threads.filter((thread) => thread.id !== id)]);
    setActiveThreadId(id);
  }

  function newConversation() {
    if (pending) return;
    setActiveThreadId(null);
    setMessages([]);
    setQuestion("");
    setError(null);
  }

  function selectConversation(thread: SavedChatThread) {
    if (pending || thread.scopeKey !== scopeKey) return;
    setActiveThreadId(thread.id);
    setMessages(thread.messages);
    setQuestion("");
    setError(null);
  }

  function deleteConversation(thread: SavedChatThread) {
    if (pending) return;
    storeThreads(threads.filter((saved) => saved.id !== thread.id));
    if (thread.id === activeThreadId) {
      setActiveThreadId(null);
      setMessages([]);
      setQuestion("");
      setError(null);
    }
  }

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
        body: JSON.stringify({ question: prompt, history, ...(issuer ? { issuer } : { scope: "general" }) }),
      });
      if (controller.signal.aborted) return;
      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(), role: "assistant", content: response.answer,
        sourceIds: response.sourceIds, uncertainty: response.uncertainty,
      };
      const completed = [...messages, userMessage, assistantMessage].slice(-40);
      setMessages(completed);
      saveConversation(completed, prompt);
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
    if (activeThreadId) storeThreads(threads.filter((thread) => thread.id !== activeThreadId));
    setActiveThreadId(null);
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
  const chatReady = contextStatus === "ready" && quotaReady && historyStatus !== "loading";

  return (
    <div className={`issuer-assistant-studio${compact ? " is-compact" : ""}`}>
      {!compact ? <PageIntro eyebrow="Shelf AI" title={asset ? `Chat about ${asset.name}` : issuer ? `Chat about ${issuer.symbol}` : "Ask Shelf AI"}>
        <p>{issuer
          ? "Ask about this exact issuer listing. Answers may be wrong and cannot place orders or sign transactions."
          : "Explore Shelf's reviewed explainers on brands, companies, stock tokens and trading basics. Open an asset for current issuer facts."}</p>
      </PageIntro> : null}
      <div className="assistant-workspace">
        <aside className="assistant-history" aria-label="Chat history">
          <details open={compact ? undefined : true}>
            <summary><Clock size={16} aria-hidden="true" /> Chat history <span>{threads.length}</span></summary>
            <div className="assistant-history-body">
              <button type="button" className="assistant-new-chat" onClick={newConversation} disabled={pending}>+ New chat</button>
              {historyStatus === "loading" ? <p role="status">Loading chats…</p> : null}
              {historyStatus === "unavailable" ? <p>Chat history is unavailable right now.</p> : null}
              {historyStatus === "ready" && !threads.length ? <p>Your conversations will appear here.</p> : null}
              <div className="assistant-history-list">
                {threads.map((thread) => (
                  <div className="assistant-history-item" key={thread.id}>
                    {thread.scopeKey === scopeKey ? (
                      <button type="button" className="assistant-history-select" aria-pressed={thread.id === activeThreadId}
                        disabled={pending} onClick={() => selectConversation(thread)}>
                        <strong>{thread.title}</strong><span>{issuer ? issuer.symbol : "General"}</span>
                      </button>
                    ) : <Link className="assistant-history-select" href={threadPath(thread) as Route}>
                      <strong>{thread.title}</strong><span>{thread.scopeKey === "general" ? "General" : thread.scopeKey.split(":")[2]}</span>
                    </Link>}
                    <button type="button" className="assistant-history-delete" aria-label={`Delete chat ${thread.title}`}
                      title="Delete chat" disabled={pending} onClick={() => deleteConversation(thread)}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="assistant-history-note">{historyLocation === "device"
                ? "Saved in this browser for this account. Delete chats here anytime."
                : "Saved in this tab. Close the tab to erase guest chats."}</p>
              {historySaveError ? <p role="alert">This chat could not be saved in browser history.</p> : null}
            </div>
          </details>
        </aside>

        <section className="assistant-chat-surface" aria-label="Shelf AI chat">
          <div className="assistant-scope-banner issuer-chat-context">
            {issuer ? <>
              {contextStatus === "loading" ? <p role="status">Loading current {sourceName} details…</p> : null}
              {contextStatus === "unavailable" ? <>
                <h2>Issuer details unavailable</h2>
                <p>Chat is paused until the current {sourceName} listing can be checked.</p>
                <CtaLink id="issuer-chat-retry" href={`/assets/${issuer.provider}/${issuer.symbol}`} secondary>Return to token details</CtaLink>
              </> : null}
              {asset ? <>
                <div className="issuer-chat-heading">
                  <IssuerLogo imageUrl={asset.logoUrl} name={asset.name} source={issuer.provider} />
                  <div><span className="badge">{sourceName} context loaded</span><h2>{asset.name} · {asset.symbol}</h2></div>
                </div>
                {!compact ? <>
                  <p>{asset.description || "The issuer has not supplied a description."}</p>
                  <p className="muted">Issuer feed checked {new Date(asset.observedAt).toLocaleString()}. The token mint and market details are rechecked for each answer.</p>
                  <div className="actions">
                    <Link href={`/assets/${issuer.provider}/${encodeURIComponent(asset.symbol)}` as Route}>View token details</Link>
                    <a href={sourceUrl} target="_blank" rel="noreferrer">Issuer source</a>
                    <Link href="/assistant">General assistant</Link>
                  </div>
                </> : <p className="muted">Ask about this listing. AI cannot place orders or sign transactions.</p>}
              </> : null}
            </> : <div className="issuer-chat-heading">
              <span className="assistant-general-icon"><Sparkles size={19} aria-hidden="true" /></span>
              <div><span className="badge">Reviewed Shelf explainers</span><h2>General research</h2></div>
            </div>}
          </div>

          <div className="assistant-conversation" role="log" aria-label="AI conversation" aria-live="polite">
            {messages.length ? messages.map((message) => (
              <div className={`assistant-message ${message.role}`} key={message.id}>
                <strong>{message.role === "user" ? "You" : "Shelf AI"}</strong>
                <p>{message.content}</p>
                {message.sourceIds?.length ? <p className="muted">Source: {issuer
                  ? `${sourceName} issuer feed`
                  : message.sourceIds.map((id, index) => <span key={id}>
                    {index ? ", " : ""}{id.startsWith("learn:")
                      ? <Link href={`/learn/${id.slice(6)}` as Route}>{id.slice(6).replaceAll("-", " ")}</Link>
                      : id.startsWith("catalog:")
                        ? <Link href={`/discover?q=${encodeURIComponent(id.slice(8).replaceAll("-", " "))}` as Route}>
                          {id.slice(8).replaceAll("-", " ")}
                        </Link>
                        : id}
                  </span>)}</p> : null}
                {message.uncertainty?.length ? <p className="muted">Uncertainty: {message.uncertainty.join(" ")}</p> : null}
              </div>
            )) : <div className="assistant-empty">
              <Sparkles size={22} aria-hidden="true" />
              <p>{issuer
                ? "The current issuer details are ready. Ask your first question when you are ready."
                : "Ask about a brand, a company, or how tokenized assets work."}</p>
            </div>}
            {!quotaReady || historyStatus === "loading" ? <p role="status">Preparing your chat…</p> : null}
            {pending ? <p role="status">Thinking through the current source…</p> : null}
            <div ref={conversationEndRef} />
          </div>

          <div className="assistant-composer">
            {!messages.length && contextStatus === "ready" ? <div className="assistant-suggestions" aria-label="Suggested questions">
              {issuer ? <>
                <button type="button" className="secondary" onClick={() => setQuestion("What does this token represent?")}>What does this token represent?</button>
                <button type="button" className="secondary" onClick={() => setQuestion("What does the issuer say about trading and liquidity?")}>How does trading work?</button>
                <button type="button" className="secondary" onClick={() => setQuestion("What important company information is missing from this issuer feed?")}>What is missing?</button>
              </> : <>
                <button type="button" className="secondary" onClick={() => setQuestion("How is a stock token different from a share?")}>Tokens and shares</button>
                <button type="button" className="secondary" onClick={() => setQuestion("Why can token and stock prices differ?")}>Understanding prices</button>
                <button type="button" className="secondary" onClick={() => setQuestion("What should I check before buying?")}>Before buying</button>
              </>}
            </div> : null}
            <form className="stack" onSubmit={ask}>
              <Field label="Your question" htmlFor="assistant-question">
                <textarea id="assistant-question" maxLength={2000} rows={compact ? 2 : 3} value={question}
                  disabled={pending || !chatReady} onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={asset ? `Ask about ${asset.name} or ${asset.symbol}` : "Ask about brands, companies or stock tokens"} />
              </Field>
              <div className="actions">
                <button data-cta="C35" type="submit" disabled={!question.trim() || pending || !chatReady}>
                  {pending ? "Waiting for answer…" : "Send message"}
                </button>
                <button className="secondary" data-cta="C36" type="button" disabled={!pending} onClick={stopResponse}>Stop response</button>
                <button className="ghost" data-cta="C37" type="button" disabled={!messages.length && !question} onClick={clearConversation}>Clear chat</button>
              </div>
            </form>
            <ErrorMessage message={error} />
          </div>
        </section>
      </div>
      {compact && issuer ? <div className="assistant-related-links">
        <Link href={`/assets/${issuer.provider}/${encodeURIComponent(issuer.symbol)}/chat` as Route}>Open full conversation</Link>
        <Link href="/assistant">General assistant</Link>
      </div> : null}
    </div>
  );
}
