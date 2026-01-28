import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Main model for agent reasoning
export const createModel = (temperature = 0.3) => {
  return new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash-latest",
    temperature,
    maxOutputTokens: 2048,
    apiKey: process.env.GOOGLE_API_KEY,
  });
};

// Faster model for simple tasks
export const createFastModel = () => {
  return new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash-latest",
    temperature: 0.1,
    maxOutputTokens: 1024,
    apiKey: process.env.GOOGLE_API_KEY,
  });
};

// Model configuration
export const MODEL_CONFIG = {
  main: "gemini-1.5-flash-latest",
  fast: "gemini-1.5-flash-latest",
} as const;
