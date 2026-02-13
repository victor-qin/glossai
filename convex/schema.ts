import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const segment = v.union(
  v.object({
    type: v.literal("kanji"),
    text: v.string(),
    reading: v.string(),
  }),
  v.object({
    type: v.literal("kana"),
    text: v.string(),
  }),
  v.object({
    type: v.literal("punctuation"),
    text: v.string(),
  })
);

export default defineSchema({
  translations: defineTable({
    english_text: v.string(),
    japanese_segments: v.array(segment),
    full_hiragana: v.string(),
    romaji: v.string(),
    notes: v.string(),
    provider_used: v.string(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_created_at", ["created_at"])
    .searchIndex("search_english", {
      searchField: "english_text",
    }),
});
