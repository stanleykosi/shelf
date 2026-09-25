import type { ChatTurn } from "@/domain/ai-chat";

export type SavedChatMessage = ChatTurn & {
  id: string;
  sourceIds?: string[];
  uncertainty?: string[];
};

export type SavedChatThread = {
  id: string;
  scopeKey: string;
  title: string;
  updatedAt: number;
  messages: SavedChatMessage[];
};

const MAX_THREADS = 24;
const MAX_MESSAGES = 40;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1_000;

export function chatScopeKey(provider?: string, symbol?: string) {
  return provider && symbol ? `asset:${provider}:${symbol}` : "general";
}

export function chatHistoryKey(memberId?: string) {
  return memberId ? `shelf:chat-history:member:${memberId}` : "shelf:chat-history:guest";
}

function validMessage(value: unknown): value is SavedChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return typeof message.id === "string" && message.id.length <= 80 &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" && message.content.length <= 8_000 &&
    (message.sourceIds === undefined ||
      (Array.isArray(message.sourceIds) && message.sourceIds.every((id) => typeof id === "string"))) &&
    (message.uncertainty === undefined ||
      (Array.isArray(message.uncertainty) && message.uncertainty.every((item) => typeof item === "string")));
}

function validThread(value: unknown, now: number): value is SavedChatThread {
  if (!value || typeof value !== "object") return false;
  const thread = value as Record<string, unknown>;
  return typeof thread.id === "string" && thread.id.length <= 80 &&
    typeof thread.scopeKey === "string" &&
    (thread.scopeKey === "general" || /^asset:(xstocks|prestocks):[A-Za-z0-9.-]{1,32}$/.test(thread.scopeKey)) &&
    typeof thread.title === "string" && thread.title.length <= 80 &&
    typeof thread.updatedAt === "number" && Number.isFinite(thread.updatedAt) &&
    thread.updatedAt <= now && thread.updatedAt >= now - MAX_AGE_MS &&
    Array.isArray(thread.messages) && thread.messages.length <= MAX_MESSAGES &&
    thread.messages.every(validMessage);
}

/** Chat text stays in this device's browser storage, never in the server's usage log. */
export function readChatThreads(storage: Storage, key: string, now = Date.now()): SavedChatThread[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((thread): thread is SavedChatThread => validThread(thread, now))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_THREADS);
  } catch {
    return [];
  }
}

export function saveChatThreads(storage: Storage, key: string, threads: SavedChatThread[]): boolean {
  try {
    storage.setItem(key, JSON.stringify([...threads]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_THREADS)));
    return true;
  } catch {
    return false;
  }
}

export function threadPath(thread: SavedChatThread): string {
  const base = thread.scopeKey === "general"
    ? "/assistant"
    : (() => {
      const [, provider, symbol] = thread.scopeKey.split(":");
      return `/assets/${provider}/${encodeURIComponent(symbol)}/chat`;
    })();
  return `${base}?thread=${encodeURIComponent(thread.id)}`;
}
