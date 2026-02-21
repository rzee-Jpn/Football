/**
 * Robust JSON Parser
 * FIX: Menggantikan JSON.parse(cleanJSON(raw)) yang rapuh
 * 
 * Handles:
 * - Markdown code blocks (```json ... ```)
 * - Trailing commas
 * - Truncated JSON (dari max_tokens)
 * - Extra text sebelum/sesudah JSON
 */

/**
 * Coba extract dan parse JSON dari raw AI response
 * @param {string} raw - Raw response dari AI
 * @param {number} attempt - Attempt ke berapa (untuk logging)
 * @returns {object} Parsed JSON
 * @throws {Error} Kalau semua strategi gagal
 */
export function parseAIResponse(raw, attempt = 1) {
  const strategies = [
    tryDirectParse,
    tryStripMarkdown,
    tryExtractFirstJSON,
    tryRepairTrailingComma,
    tryRepairTruncated,
  ];

  const errors = [];

  for (const strategy of strategies) {
    try {
      const result = strategy(raw);
      if (result !== null) return result;
    } catch (err) {
      errors.push(`${strategy.name}: ${err.message}`);
    }
  }

  // Semua strategi gagal — log detail untuk debugging
  console.error(`\n❌ JSON Parse gagal pada attempt ${attempt}`);
  console.error("Strategies tried:", errors.join(" | "));
  console.error("Raw response (first 500 chars):", raw.substring(0, 500));

  throw new Error(`Tidak bisa parse JSON dari AI response. Errors: ${errors.slice(-2).join(" | ")}`);
}

// ─── Strategi 1: Direct parse ───────────────────────────────────────────────
function tryDirectParse(raw) {
  return JSON.parse(raw.trim());
}

// ─── Strategi 2: Strip markdown code blocks ─────────────────────────────────
function tryStripMarkdown(raw) {
  let cleaned = raw.trim();
  // Hapus opening ```json atau ``` 
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "");
  // Hapus closing ```
  cleaned = cleaned.replace(/\s*```\s*$/m, "");
  return JSON.parse(cleaned.trim());
}

// ─── Strategi 3: Extract JSON object/array dari tengah teks ─────────────────
function tryExtractFirstJSON(raw) {
  // Cari posisi { atau [ pertama
  const startObj = raw.indexOf("{");
  const startArr = raw.indexOf("[");

  let start = -1;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);

  if (start === -1) return null;

  const openChar = raw[start];
  const closeChar = openChar === "{" ? "}" : "]";

  // Cari posisi penutup yang matching
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) return null;

  const jsonStr = raw.substring(start, end + 1);
  return JSON.parse(jsonStr);
}

// ─── Strategi 4: Repair trailing commas ─────────────────────────────────────
function tryRepairTrailingComma(raw) {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "");

  // Hapus trailing comma sebelum } atau ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  return JSON.parse(cleaned);
}

// ─── Strategi 5: Repair truncated JSON (akibat max_tokens) ──────────────────
function tryRepairTruncated(raw) {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "");

  // Hapus trailing comma
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  // Hitung depth bracket untuk deteksi truncation
  let depth = 0;
  let inString = false;
  let escape = false;
  const stack = [];

  for (const ch of cleaned) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") { stack.push(ch); depth++; }
    else if (ch === "}" || ch === "]") { stack.pop(); depth--; }
  }

  if (depth <= 0) return JSON.parse(cleaned);

  // Tutup semua bracket yang belum tertutup
  let repaired = cleaned;

  // Hapus trailing comma atau text incomplete di akhir
  repaired = repaired.replace(/,\s*$/, "");
  repaired = repaired.replace(/"[^"]*$/, '"__truncated__"');

  // Tambah penutup
  while (stack.length > 0) {
    const opener = stack.pop();
    repaired += opener === "{" ? "}" : "]";
  }

  console.warn("⚠️  JSON truncated — diperbaiki otomatis. Beberapa konten mungkin hilang.");
  return JSON.parse(repaired);
}
