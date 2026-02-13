import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("translations")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    if (!query.trim()) {
      return await ctx.db
        .query("translations")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("translations")
      .withSearchIndex("search_english", (q) => q.search("english_text", query))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("translations") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    english_text: v.string(),
    japanese_segments: v.array(
      v.union(
        v.object({ type: v.literal("kanji"), text: v.string(), reading: v.string() }),
        v.object({ type: v.literal("kana"), text: v.string() }),
        v.object({ type: v.literal("punctuation"), text: v.string() })
      )
    ),
    full_hiragana: v.string(),
    romaji: v.string(),
    provider_used: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("translations", {
      ...args,
      notes: "",
      created_at: now,
      updated_at: now,
    });
  },
});

export const updateNotes = mutation({
  args: {
    id: v.id("translations"),
    notes: v.string(),
  },
  handler: async (ctx, { id, notes }) => {
    await ctx.db.patch(id, { notes, updated_at: Date.now() });
  },
});
