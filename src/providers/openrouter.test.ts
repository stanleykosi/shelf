import { describe, expect, it } from "vitest";
import { REQUIRED_AI_PRIVACY } from "./contracts";
import { OpenRouterProvider } from "./openrouter";

function responseWithContent(content: string, cost: number) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }], usage: { cost } }),
    { status: 200 },
  );
}

describe("OpenRouterProvider", () => {
  it("serializes every required privacy control", async () => {
    const requests: Array<RequestInit | undefined> = [];
    const send: typeof fetch = async (_input, init) => {
      requests.push(init);
      return responseWithContent(JSON.stringify({ names: ["iPhone"] }), 0.000001);
    };
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      visionModel: "test-vision",
      textModel: "test-text",
      fetch: send,
    });

    await provider.recognize(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      "image/png",
      "photo",
      REQUIRED_AI_PRIVACY,
    );

    const body = JSON.parse(String(requests[0]?.body)) as {
      messages: Array<{ role: string; content: string | Array<{ type: string }> }>;
    };
    expect(body).toMatchObject({
      provider: {
        data_collection: "deny",
        zdr: true,
        require_parameters: true,
        max_price: { prompt: 0.2, completion: 0.6 },
      },
      model: "test-vision",
      max_tokens: 800,
    });
    expect(JSON.stringify(body.messages)).toContain("data:image/png;base64,");
  });

  it("blocks a request when required privacy is relaxed", async () => {
    let requestCount = 0;
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      visionModel: "test-vision",
      textModel: "test-text",
      fetch: async () => {
        requestCount += 1;
        return new Response();
      },
    });
    const relaxed = {
      dataCollection: "deny",
      zdr: false,
      requireParameters: true,
    };

    await expect(
      provider.recognize(new Uint8Array(), "image/jpeg", "receipt", relaxed),
    ).rejects.toThrow("AI_PRIVACY_UNAVAILABLE");
    expect(requestCount).toBe(0);
  });

  it("turns network failures and timeouts into a stable provider error", async () => {
    let requestCount = 0;
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      visionModel: "test-vision",
      textModel: "test-text",
      fetch: async () => {
        requestCount += 1;
        throw new Error("socket timeout");
      },
    });

    await expect(
      provider.answer({ question: "What is a stock token?", sourceIds: [] }, REQUIRED_AI_PRIVACY),
    ).rejects.toThrow("AI_PROVIDER_UNAVAILABLE");
    expect(requestCount).toBe(2);
  });

  it("retries one malformed response and includes both attempts in the cost", async () => {
    const responses = [
      responseWithContent("not json", 0.000002),
      responseWithContent(JSON.stringify({ names: [] }), 0.000003),
    ];
    let requestCount = 0;
    const send: typeof fetch = async () => responses[requestCount++];
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      visionModel: "test-vision",
      textModel: "test-text",
      fetch: send,
    });

    await expect(
      provider.recognize(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        "image/png",
        "photo",
        REQUIRED_AI_PRIVACY,
      ),
    ).resolves.toEqual({ names: [], usageMicrousd: 5 });
    expect(requestCount).toBe(2);
  });

  it("rejects schema-invalid structured output instead of trusting provider JSON", async () => {
    let requestCount = 0;
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      visionModel: "test-vision",
      textModel: "test-text",
      fetch: async () => {
        requestCount += 1;
        return responseWithContent(JSON.stringify({ names: [123] }), 0.000001);
      },
    });

    await expect(
      provider.recognize(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        "image/png",
        "photo",
        REQUIRED_AI_PRIVACY,
      ),
    ).rejects.toThrow("AI_INVALID_RESPONSE");
    expect(requestCount).toBe(2);
  });

  it("does not retry when OpenRouter cannot honor the privacy contract", async () => {
    let requestCount = 0;
    const send: typeof fetch = async () => {
      requestCount += 1;
      return new Response("unsupported", { status: 422 });
    };
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      visionModel: "test-vision",
      textModel: "test-text",
      fetch: send,
    });

    await expect(
      provider.answer({ question: "What is a stock token?", sourceIds: [] }, REQUIRED_AI_PRIVACY),
    ).rejects.toThrow("AI_PRIVACY_UNAVAILABLE");
    expect(requestCount).toBe(1);
  });
});
