/**
 * Shared Config - AI Game Builder
 * Edit file ini untuk ganti model, token limit, dll.
 */

export const CONFIG = {
  // Model AI — ganti di sini atau set env variable AI_MODEL
  model: process.env.AI_MODEL || "deepseek/deepseek-chat",

  // Token limits
  maxTokensPlanner: 2000,
  maxTokensGenerator: 32000,   // FIX: dinaikkan dari 8000 → 32000
  maxTokensFixer: 16000,

  // Retry settings
  apiRetries: 3,
  fixRetries: parseInt(process.env.FIX_RETRIES || "3"),
  retryDelayMs: 2000,

  // Build timeout
  buildTimeoutMs: 180000, // 3 menit

  // File size limit per file untuk dikirim ke AI fixer (karakter)
  maxFileSizeForContext: 4000,

  // Total context limit untuk error fixer
  maxContextChars: 28000,
};
