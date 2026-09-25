import { describe, expect, it } from "vitest";
import { chatHistoryKey, chatScopeKey, readChatThreads, saveChatThreads, threadPath } from "@/lib/chat-history";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  } as Storage;
}

describe("device chat history", () => {
  it("keeps guest and account keys separate and routes asset threads to the exact symbol", () => {
    expect(chatHistoryKey()).toBe("shelf:chat-history:guest");
    expect(chatHistoryKey("user-a")).not.toBe(chatHistoryKey("user-b"));
    const scopeKey = chatScopeKey("xstocks", "METAx");
    expect(threadPath({ id: "one", scopeKey, title: "Meta", updatedAt: 100, messages: [] }))
      .toBe("/assets/xstocks/METAx/chat?thread=one");
  });

  it("reads only valid recent chats and orders them by last update", () => {
    const storage = memoryStorage();
    const key = chatHistoryKey();
    const now = 10_000_000_000;
    const valid = (id: string, updatedAt: number) => ({
      id, scopeKey: "general", title: id, updatedAt,
      messages: [{ id: `${id}-message`, role: "user", content: "What is a stock token?" }],
    });
    storage.setItem(key, JSON.stringify([
      valid("older", now - 10_000), valid("newer", now),
      valid("expired", 1),
      { ...valid("unsafe", now), scopeKey: "asset:unknown:SYMBOL" },
    ]));
    expect(readChatThreads(storage, key, now).map((thread) => thread.id))
      .toEqual(["newer", "older"]);
    expect(saveChatThreads(storage, key, readChatThreads(storage, key, now))).toBe(true);
  });
});
