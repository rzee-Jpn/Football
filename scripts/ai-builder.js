/**
 * AI Game Builder v3
 * Generate file per file — anti-placeholder
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";
import { parseAIResponse } from "./json-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) { console.error("❌ OPENROUTER_API_KEY tidak ditemukan!"); process.exit(1); }

function log(msg) { console.log(`\n${msg}`); }

function readBlueprint() {
  const p = path.join(ROOT, "blueprint.md");
  if (!fs.existsSync(p)) { console.error("❌ blueprint.md tidak ditemukan!"); process.exit(1); }
  return fs.readFileSync(p, "utf8");
}

function writeFile(filePath, content) {
  const full = path.join(ROOT, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log(`  ✅ ${filePath} (${content.length} chars)`);
}

async function callAI(system, user, maxTokens = 8000, retries = CONFIG.apiRetries) {
  for (let i = 0; i < retries; i++) {
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
          model: CONFIG.model,
          temperature: 0.2,
          max_tokens: maxTokens,
          messages: [{ role: "system", content: system }, { role: "user", content: user }]
        })
      });

      if (!res.ok) {
        const e = await res.text();
        if (res.status === 401) throw new Error("API Key tidak valid");
        if (res.status === 429) throw new Error("Rate limit — tunggu sebentar");
        if (res.status === 402) throw new Error("Saldo API habis");
        throw new Error(`HTTP ${res.status}: ${e.substring(0, 150)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Response kosong");
      if (data.choices?.[0]?.finish_reason === "length") {
        console.warn("  ⚠️  Response terpotong!");
      }
      return content;

    } catch (err) {
      console.error(`  ⚠️  Attempt ${i+1}/${retries}: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, CONFIG.retryDelayMs * (i + 1)));
    }
  }
}

// ── STEP 1: PLANNER ──────────────────────────────────────────

async function runPlanner(blueprint) {
  log("🧠 [Step 1] Planner...");

  const raw = await callAI(
    `You are a web game file structure planner. Read the blueprint carefully.
If blueprint says "pure HTML/CSS/JS" or "vanilla JS" or "not Phaser", plan accordingly.
Output ONLY valid JSON, no markdown, no explanation.`,

    `Blueprint:
${blueprint}

Analyze the Tech Stack section carefully.
If it says pure HTML/CSS/JS or single file index.html, return:
{
  "gameName": "...",
  "techStack": "vanilla",
  "files": ["index.html"],
  "mechanics": ["..."],
  "notes": "single file HTML/CSS/JS app"
}

If it uses Phaser, return:
{
  "gameName": "...",
  "techStack": "phaser",
  "files": ["index.html", "src/main.js", "src/scenes/GameScene.js"],
  "mechanics": ["..."],
  "notes": "..."
}`,
    2000
  );

  const plan = parseAIResponse(raw);
  log(`  Game      : ${plan.gameName}`);
  log(`  Tech Stack: ${plan.techStack}`);
  log(`  Files     : ${plan.files.join(", ")}`);
  return plan;
}

// ── STEP 2: GENERATE FILE PER FILE ───────────────────────────

async function generateOneFile(filePath, blueprint, plan, alreadyGenerated, attempt = 1) {
  if (attempt > 3) throw new Error(`Gagal generate ${filePath} setelah 3 percobaan`);

  const context = alreadyGenerated
    .map(f => `=== ${f.path} ===\n${f.content.substring(0, 800)}${f.content.length > 800 ? "\n// ..." : ""}`)
    .join("\n\n");

  const isVanilla = plan.techStack === "vanilla";
  const isIndex = filePath === "index.html";

  let specificInstructions = "";

  if (isVanilla && isIndex) {
    specificInstructions = `
PENTING: Ini adalah single-file HTML/CSS/JS app — TIDAK menggunakan Phaser!
- Semua CSS dalam <style> tag
- Semua JavaScript dalam <script> tag
- IMPLEMENT SEMUA FITUR dari blueprint secara lengkap
- Termasuk: grid crossword, virtual keyboard, cek jawaban, ganti soal via JSON
- ZERO placeholder — semua fungsi harus punya implementasi nyata
- Grid dibuat dari div/table elements, bukan canvas`;
  }

  const systemPrompt = isVanilla
    ? `You are an expert frontend developer specializing in pure HTML/CSS/JavaScript.
Generate ONE complete, fully functional single-file web application.
Output ONLY the raw HTML file content — no markdown, no explanation, no code fences.

ABSOLUTE RULES:
1. ZERO placeholder comments or TODO
2. Every feature in blueprint MUST be fully implemented
3. No external libraries unless blueprint specifies
4. Complete, production-ready code only`

    : `You are an expert Phaser 3 game developer.
Generate ONE complete JavaScript file using Phaser 3.
Output ONLY the raw JS file content — no markdown, no explanation, no code fences.

ABSOLUTE RULES:
1. ZERO placeholder comments or TODO
2. All mechanics from blueprint MUST be implemented
3. Use Phaser Graphics API for all visuals
4. Complete, production-ready code only`;

  const userPrompt = `Generate: ${filePath}

Blueprint:
${blueprint}

Context (already generated):
${context || "(none)"}

Requirements:
${specificInstructions}

OUTPUT the complete ${filePath} content now. Real implementation only.`;

  const content = await callAI(systemPrompt, userPrompt, 12000);

  // Tolak jika placeholder
  const banned = [
    /\/\/\s*(TODO|FIXME|game logic goes here|add logic here|implement this|Add game logic)/i,
    /function\s+\w+\(\)\s*\{\s*\/\//m,
  ];

  for (const re of banned) {
    if (re.test(content)) {
      console.warn(`  ♻️  Placeholder terdeteksi di ${filePath}, retry ${attempt+1}...`);
      return generateOneFile(filePath, blueprint, plan, alreadyGenerated, attempt + 1);
    }
  }

  // Cek minimal length (file terlalu pendek = placeholder)
  if (isVanilla && isIndex && content.length < 3000) {
    console.warn(`  ♻️  index.html terlalu pendek (${content.length} chars), retry...`);
    return generateOneFile(filePath, blueprint, plan, alreadyGenerated, attempt + 1);
  }

  return content;
}

async function runGenerator(blueprint, plan) {
  log("\n🤖 [Step 2] Generate file per file...");

  const generated = [];

  for (const filePath of plan.files) {
    log(`  📝 ${filePath}`);
    try {
      const content = await generateOneFile(filePath, blueprint, plan, generated);
      generated.push({ path: filePath, content });
      writeFile(filePath, content);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  ❌ Gagal: ${filePath} — ${err.message}`);
    }
  }

  return generated;
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  log("🚀 AI GAME BUILDER v3");
  log(`   Model: ${CONFIG.model}`);
  log("=".repeat(50));

  const blueprint = readBlueprint();
  const plan = await runPlanner(blueprint);
  const files = await runGenerator(blueprint, plan);

  fs.writeFileSync(
    path.join(ROOT, ".ai-build-meta.json"),
    JSON.stringify({ timestamp: new Date().toISOString(), model: CONFIG.model, filesGenerated: files.map(f => f.path), plan }, null, 2)
  );

  log(`\n✅ Done! ${files.length} files generated.`);
  log("=".repeat(50));
}

main().catch(err => { console.error("\n💥 Fatal:", err.message); process.exit(1); });
