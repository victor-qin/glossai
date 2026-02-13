"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import type { TranslationResult } from "@/lib/types";

// Returns translation result to the client (which then persists it via mutation)
// because ctx.runMutation is broken in self-hosted Convex actions ("Invalid URL")
export const translate = action({
  args: { englishText: v.string() },
  handler: async (_, { englishText }): Promise<TranslationResult> => {
    const trimmed = englishText.trim();
    if (!trimmed) {
      throw new Error("Empty input");
    }

    const providers = [
      {
        name: "google",
        fn: async (text: string) => {
          const { translateWithGoogle } = await import("./providers/google");
          return translateWithGoogle(text);
        },
      },
      {
        name: "claude",
        fn: async (text: string) => {
          const { translateWithClaude } = await import("./providers/claude");
          return translateWithClaude(text);
        },
      },
      {
        name: "openai",
        fn: async (text: string) => {
          const { translateWithOpenAI } = await import("./providers/openai");
          return translateWithOpenAI(text);
        },
      },
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(`Trying provider: ${provider.name}`);
        const result: TranslationResult = await provider.fn(trimmed);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Provider ${provider.name} failed:`, lastError.message);
      }
    }

    throw new Error(
      `All translation providers failed. Last error: ${lastError?.message}`
    );
  },
});
