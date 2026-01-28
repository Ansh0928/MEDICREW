import { ChatOpenAI } from "@langchain/openai";

// ============================================================================
// LLM Client Configuration
// ============================================================================

export interface AIClientConfig {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
}

const defaultConfig: AIClientConfig = {
  modelName: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 2000,
};

export function createChatClient(config: AIClientConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config };

  return new ChatOpenAI({
    modelName: mergedConfig.modelName,
    temperature: mergedConfig.temperature,
    maxTokens: mergedConfig.maxTokens,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
}

// Singleton instance for simple use cases
let defaultClient: ChatOpenAI | null = null;

export function getDefaultClient(): ChatOpenAI {
  if (!defaultClient) {
    defaultClient = createChatClient();
  }
  return defaultClient;
}

// ============================================================================
// Streaming Configuration
// ============================================================================

export const streamingConfig = {
  // For streaming responses via Vercel AI SDK
  experimental_streamData: true,
};
