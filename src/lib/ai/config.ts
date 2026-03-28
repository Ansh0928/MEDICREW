import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// LLM Provider types
export type LLMProvider = "groq" | "ollama";

// Get the configured provider from environment
export const getLLMProvider = (): LLMProvider => {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() as LLMProvider;
  return provider === "ollama" ? "ollama" : "groq"; // Default to groq
};

// Create Groq model
const createGroqModel = (temperature = 0.3): BaseChatModel => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature,
    maxTokens: 2048,
    apiKey,
  });
};

// Create Ollama model for local inference
const createOllamaModel = (temperature = 0.3): BaseChatModel => {
  return new ChatOllama({
    model: process.env.OLLAMA_MODEL || "llama3.2",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    temperature,
  });
};

// Proxy model that falls back from Groq → Ollama on failure
class FallbackModel extends BaseChatModel {
  constructor(
    private primary: BaseChatModel,
    private fallback: BaseChatModel,
  ) {
    super({});
  }

  _llmType() { return "fallback"; }

  async _generate(messages: import("@langchain/core/messages").BaseMessage[], options: import("@langchain/core/language_models/base").BaseLLMCallOptions) {
    try {
      return await this.primary._generate(messages, options);
    } catch (err) {
      console.warn("[LLM] Primary provider failed, falling back to Ollama:", (err as Error).message);
      return this.fallback._generate(messages, options);
    }
  }
}

// Main model factory - creates model based on configured provider.
// If provider is groq, wraps with Ollama fallback so outages degrade gracefully.
export const createModel = (temperature = 0.3): BaseChatModel => {
  const provider = getLLMProvider();

  if (provider === "ollama") {
    return createOllamaModel(temperature);
  }

  return new FallbackModel(createGroqModel(temperature), createOllamaModel(temperature));
};

// Faster model for simple tasks
export const createFastModel = (): BaseChatModel => {
  const provider = getLLMProvider();

  if (provider === "ollama") {
    return createOllamaModel(0.1);
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  const groqFast = new ChatGroq({
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    maxTokens: 1024,
    apiKey,
  });

  return new FallbackModel(groqFast, createOllamaModel(0.1));
};

// Create Groq model with JSON mode forced (for triage)
export const createJsonModel = (): BaseChatModel => {
  const provider = getLLMProvider();
  if (provider === "ollama") {
    return createOllamaModel(0.1);
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY environment variable is not set");
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    maxTokens: 512,
    apiKey,
    // @ts-expect-error — Groq SDK supports this, LangChain types lag
    response_format: { type: "json_object" },
  });
};

// Model configuration
export const MODEL_CONFIG = {
  providers: ["groq", "ollama"] as const,
  groq: {
    main: "llama-3.3-70b-versatile",
    fast: "llama-3.1-8b-instant",
  },
  ollama: {
    main: "llama3.2",
    fast: "llama3.2",
  },
} as const;
