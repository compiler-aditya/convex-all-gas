import { getServiceToken } from "convex/server";

/**
 * Model access, provider-agnostic.
 *
 * Two paths, chosen at call time:
 *
 *  1. `OPENAI_API_KEY` set — call OpenAI directly.
 *  2. Otherwise — the Convex AI Gateway, which needs no provider key at all but
 *     requires a paid Convex plan.
 *
 * Keeping both means the deployment is not hostage to one billing decision, and
 * moving between them is an environment variable rather than a refactor.
 *
 * Model ids are written in gateway form ("openai/gpt-4o-mini") throughout. The
 * provider prefix is stripped when talking to OpenAI directly, so callers never
 * have to know which path is live.
 */

const GATEWAY_BASE = "https://ai-gateway.convex.dev/v1";
const OPENAI_BASE = "https://api.openai.com/v1";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Provider = {
  name: "openai" | "convex-gateway";
  baseUrl: string;
  authorization: string;
  /** Convert a gateway-form model id into what this provider expects. */
  modelId: (id: string) => string;
};

async function resolveProvider(): Promise<Provider> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey !== undefined && openaiKey.length > 0) {
    return {
      name: "openai",
      baseUrl: OPENAI_BASE,
      authorization: `Bearer ${openaiKey}`,
      modelId: (id) => (id.startsWith("openai/") ? id.slice(7) : id),
    };
  }

  try {
    const token = await getServiceToken("ai-gateway");
    return {
      name: "convex-gateway",
      baseUrl: GATEWAY_BASE,
      authorization: `Bearer ${token}`,
      modelId: (id) => (id.includes("/") ? id : `openai/${id}`),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      "No model provider available. Set OPENAI_API_KEY on the deployment, " +
        `or enable the Convex AI Gateway. Gateway said: ${detail.slice(0, 200)}`,
    );
  }
}

export async function activeProviderName(): Promise<string> {
  return (await resolveProvider()).name;
}

/** Model ids the active provider serves. */
export async function listModels(): Promise<string[]> {
  const provider = await resolveProvider();
  const response = await fetch(`${provider.baseUrl}/models`, {
    headers: { Authorization: provider.authorization },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${provider.name} /models failed: ${response.status} ${text.slice(0, 300)}`);
  }
  const parsed: unknown = JSON.parse(text);
  const data =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>).data
      : null;
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return typeof row.id === "string" ? row.id : "";
    })
    .filter((id) => id.length > 0);
}

/**
 * One chat completion, returning the raw assistant text.
 *
 * `jsonObject` forces a parseable reply for proposals, which are consumed as
 * data rather than shown as prose.
 */
export async function chatCompletion(args: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  jsonObject?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const provider = await resolveProvider();

  const body: Record<string, unknown> = {
    model: provider.modelId(args.model),
    messages: args.messages,
    temperature: args.temperature ?? 0.2,
  };
  if (args.jsonObject === true) {
    body.response_format = { type: "json_object" };
  }
  if (args.maxTokens !== undefined) {
    body.max_tokens = args.maxTokens;
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: provider.authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${provider.name} completion failed: ${response.status} ${text.slice(0, 400)}`,
    );
  }

  const parsed = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = parsed.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("Model returned an empty completion");
  }
  return content;
}
