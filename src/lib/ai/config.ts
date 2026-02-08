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

// Main model factory - creates model based on configured provider
export const createModel = (temperature = 0.3): BaseChatModel => {
  const provider = getLLMProvider();

  if (provider === "ollama") {
    return createOllamaModel(temperature);
  }

  return createGroqModel(temperature);
};

// Faster model for simple tasks
export const createFastModel = (): BaseChatModel => {
  const provider = getLLMProvider();

  if (provider === "ollama") {
    // Use same model for Ollama (local models don't have instant variants)
    return createOllamaModel(0.1);
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  return new ChatGroq({
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    maxTokens: 1024,
    apiKey,
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
