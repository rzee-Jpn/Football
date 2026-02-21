/**
 * AI Game Builder - Main Script (v2 - Fixed)
 * =============================================
 * FIX: Robust JSON parsing, max_tokens dinaikkan,
 *      validasi file, model via config/env
 *
 * Usage: node scripts/ai-builder.js
 * Env: OPENROUTER_API_KEY, AI_MODEL (opsional)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";
import { parseAIResponse } from "./json-parser.js";
import { validateFiles, ensureRequiredFiles } from "./file-validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error("❌ OPENROUTER_API_KEY tidak ditemukan!");
  process.exit(1);
}

// ============================================================
// HELPERS
// ============================================================

function log(msg) { console.log(`\n${msg}`); }

function readBlueprint() {
  const bpPath = path.join(ROOT, "blueprint.md");
  if (!fs.existsSync(bpPath)) {
    console.error("❌ blueprint.md tidak ditemukan!");
    process.exit(1);
  }
  return fs.readFileSync(bpPath, "utf8");
}

function writeFiles(files) {
  for (const file of files) {
    const fullPath = path.join(ROOT, file.path);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, file.content, "utf8");
    console.log(`  ✅ Created: ${file.path}`);
  }
}

// ============================================================
// AI CALL — FIX: model dari config, error lebih informatif
// ============================================================

async function callAI(systemPrompt, userPrompt, maxTokens, retries = CONFIG.apiRetries) {
  for (let i = 0; i < retries; i++) {
    let statusCode = null;
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/ai-game-builder",
          "X-Title": "AI Game Builder"
        },
        body: JSON.stringify({
          model: CONFIG.model,           // FIX: dari config, bukan hardcode
          temperature: 0.3,
          max_tokens: maxTokens,          // FIX: tiap call punya limit sendiri
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      statusCode = res.status;

      if (!res.ok) {
        const errBody = await res.text();
        // FIX: Pesan error lebih spesifik
        if (res.status === 401) throw new Error("API Key tidak valid atau expired");
        if (res.status === 429) throw new Error("Rate limit tercapai — tunggu sebentar");
        if (res.status === 402) throw new Error("Saldo API habis");
        throw new Error(`API Error ${res.status}: ${errBody.substring(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error("Response kosong dari AI — coba lagi");

      // FIX: Deteksi finish_reason untuk tahu apakah di-truncate
      const finishReason = data.choices?.[0]?.finish_reason;
      if (finishReason === "length") {
        console.warn(`  ⚠️  Response terpotong (finish_reason=length). Coba naikkan maxTokens.`);
      }

      return content;

    } catch (err) {
      const isLastAttempt = i === retries - 1;
      console.error(`  ⚠️  Attempt ${i + 1}/${retries} gagal [${statusCode || "network"}]: ${err.message}`);

      if (isLastAttempt) {
        throw new Error(`AI call gagal setelah ${retries} percobaan: ${err.message}`);
      }

      const delay = CONFIG.retryDelayMs * (i + 1);
      console.log(`  ⏳ Retry dalam ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ============================================================
// STEP 1: PLANNER
// ============================================================

async function runPlanner(blueprint) {
  log("🧠 [Step 1] AI Planner — Menganalisa blueprint...");

  const systemPrompt = `You are a senior game architecture planner.
Analyze a game blueprint and return the file structure plan.
Output ONLY valid JSON. No explanation. No markdown code blocks.`;

  const userPrompt = `Analyze this game blueprint:

${blueprint}

Return ONLY this exact JSON:
{
  "gameName": "string",
  "files": ["index.html", "src/main.js", "src/scenes/BootScene.js", "src/scenes/MenuScene.js", "src/scenes/GameScene.js", "src/scenes/GameOverScene.js"],
  "mechanics": ["list of mechanics"],
  "notes": "brief architecture notes"
}

Always include these required files: index.html, src/main.js, src/scenes/BootScene.js, src/scenes/MenuScene.js, src/scenes/GameScene.js, src/scenes/GameOverScene.js
Add more files based on mechanics (entities, systems, etc).`;

  const raw = await callAI(systemPrompt, userPrompt, CONFIG.maxTokensPlanner);

  // FIX: Pakai robust parser
  const plan = parseAIResponse(raw);

  // FIX: Validasi schema planner
  if (!plan.files || !Array.isArray(plan.files)) {
    throw new Error("Planner output tidak valid: 'files' harus array");
  }

  // FIX: Pastikan file wajib selalu ada di plan
  const requiredFiles = ["index.html", "src/main.js", "src/scenes/GameScene.js"];
  for (const req of requiredFiles) {
    if (!plan.files.includes(req)) {
      plan.files.push(req);
      console.warn(`  ⚠️  "${req}" tidak ada di plan AI — ditambahkan otomatis`);
    }
  }

  log(`  📋 Game   : ${plan.gameName || "Unknown"}`);
  log(`  📁 Files  : ${plan.files.length}`);
  log(`  ⚙️  Mech   : ${plan.mechanics?.join(", ") || "-"}`);

  return plan;
}

// ============================================================
// STEP 2: GENERATOR — FIX: max_tokens dinaikkan ke 32000
// ============================================================

async function runGenerator(blueprint, plan) {
  log("\n🤖 [Step 2] AI Generator — Generate semua file...");

  const systemPrompt = `You are a professional Phaser 3 game developer.
Generate COMPLETE, WORKING Phaser 3 + Vite game code.
Output ONLY valid JSON. No explanation. No markdown code blocks.

Rules:
- Phaser 3 class-based scenes (extend Phaser.Scene)
- ES modules (import/export)
- No external image assets — use Phaser Graphics API only
- Mobile on-screen controls (d-pad + jump button)
- localStorage for high score
- Score, lives, level shown in UI
- Every file must be complete, not truncated`;

  const userPrompt = `Generate a complete Phaser 3 Vite game from this blueprint:

${blueprint}

Files to generate:
${plan.files.join("\n")}

Return ONLY this JSON:
{
  "create": [
    { "path": "index.html", "content": "complete file content here" },
    { "path": "src/main.js", "content": "complete file content here" }
  ]
}

CRITICAL:
- Include ALL files listed above
- Each "content" must be the COMPLETE file, not a snippet
- index.html loads src/main.js as type="module"
- main.js imports ALL scene classes`;

  const raw = await callAI(systemPrompt, userPrompt, CONFIG.maxTokensGenerator);

  // FIX: Robust JSON parse
  const result = parseAIResponse(raw);

  if (!result.create || !Array.isArray(result.create)) {
    throw new Error("Generator output tidak valid: 'create' harus array");
  }

  // FIX: Validasi setiap file
  log("\n  🔍 Validasi file...");
  const { valid, skipped } = validateFiles(result.create);

  if (skipped.length > 0) {
    console.warn(`  ⚠️  ${skipped.length} file diskip karena tidak valid`);
  }

  // FIX: Pastikan file wajib ada, inject default kalau perlu
  const finalFiles = ensureRequiredFiles(valid);

  log(`  📄 Valid   : ${finalFiles.length} files`);
  log(`  ⛔ Skipped : ${skipped.length} files`);

  return { create: finalFiles };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  log("🚀 AI GAME BUILDER v2 — Starting...");
  log(`   Model: ${CONFIG.model}`);
  log("=".repeat(50));

  const blueprint = readBlueprint();
  log(`📖 Blueprint loaded (${blueprint.length} chars)`);

  // Step 1: Plan
  const plan = await runPlanner(blueprint);

  // Step 2: Generate
  const result = await runGenerator(blueprint, plan);

  // Step 3: Write
  log("\n📝 [Step 3] Writing files...");
  writeFiles(result.create);

  // Save metadata
  fs.writeFileSync(
    path.join(ROOT, ".ai-build-meta.json"),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      model: CONFIG.model,
      filesGenerated: result.create.map(f => f.path),
      plan
    }, null, 2)
  );

  log("\n✅ Generation complete!");
  log(`   Total files : ${result.create.length}`);
  log(`   Model used  : ${CONFIG.model}`);
  log("=".repeat(50));
}

main().catch(err => {
  console.error("\n💥 Fatal error:", err.message);
  process.exit(1);
});
