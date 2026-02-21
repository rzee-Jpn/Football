/**
 * AI Game Builder v4
 * Multi-file generation — CSS, JS modules terpisah
 * Setiap file kecil = AI tidak kehabisan token
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

// ── AI CALL ──────────────────────────────────────────────────

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
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ]
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
// Planner membaca blueprint dan memutuskan struktur file

async function runPlanner(blueprint) {
  log("🧠 [Step 1] Planner...");

  const raw = await callAI(
    `You are a web game file structure planner.
Read the blueprint carefully, especially the Tech Stack section.
Output ONLY valid JSON — no markdown, no explanation.`,

    `Blueprint:
${blueprint}

Decide the tech stack and file structure.

If blueprint says "Phaser", return:
{
  "gameName": "...",
  "techStack": "phaser",
  "files": [
    { "path": "index.html",                   "role": "HTML entry point" },
    { "path": "src/main.js",                  "role": "Phaser game config + scene registry" },
    { "path": "src/scenes/BootScene.js",      "role": "Preload assets, go to Menu" },
    { "path": "src/scenes/MenuScene.js",      "role": "Main menu UI" },
    { "path": "src/scenes/GameScene.js",      "role": "Core gameplay — ALL mechanics here" },
    { "path": "src/scenes/GameOverScene.js",  "role": "Game over screen" }
  ],
  "mechanics": ["..."],
  "notes": "..."
}

If blueprint says "pure HTML/CSS/JS" or "vanilla", split into multiple focused files:
{
  "gameName": "...",
  "techStack": "vanilla",
  "files": [
    { "path": "index.html",        "role": "HTML structure only — no inline JS/CSS" },
    { "path": "css/style.css",     "role": "All styling" },
    { "path": "js/data.js",        "role": "Default game data / JSON — export const DEFAULT_DATA" },
    { "path": "js/grid.js",        "role": "Grid rendering and cell management" },
    { "path": "js/keyboard.js",    "role": "Virtual keyboard and input handling" },
    { "path": "js/game.js",        "role": "Game logic: check answers, hints, timer, win" },
    { "path": "js/main.js",        "role": "App init, wires all modules together" }
  ],
  "mechanics": ["..."],
  "notes": "..."
}

Add or remove files based on game complexity. Keep each file focused on ONE responsibility.`,
    2000
  );

  const plan = parseAIResponse(raw);
  log(`  Game      : ${plan.gameName}`);
  log(`  Tech Stack: ${plan.techStack}`);
  plan.files.forEach(f => log(`  📄 ${f.path} — ${f.role}`));
  return plan;
}

// ── STEP 2: GENERATE FILE PER FILE ───────────────────────────

async function generateOneFile(fileInfo, blueprint, plan, alreadyGenerated, attempt = 1) {
  if (attempt > 3) throw new Error(`Gagal generate ${fileInfo.path} setelah 3 percobaan`);

  const isVanilla = plan.techStack === "vanilla";
  const isPhaser  = plan.techStack === "phaser";

  // Konteks singkat dari file yang sudah digenerate
  const context = alreadyGenerated
    .map(f => {
      const preview = f.content.substring(0, 500);
      return `=== ${f.path} (${f.role}) ===\n${preview}${f.content.length > 500 ? "\n// ..." : ""}`;
    })
    .join("\n\n");

  // Daftar semua file dalam project untuk referensi import
  const fileList = plan.files
    .map(f => `${f.path} — ${f.role}`)
    .join("\n");

  // ── System prompt berdasarkan tech stack ──
  const systemPrompt = isVanilla
    ? `You are an expert frontend developer (HTML/CSS/JavaScript ES modules).
Generate ONE complete, production-ready file for a web game.
Output ONLY the raw file content — no markdown fences, no explanation.

RULES:
1. ZERO placeholders or TODO comments — full implementation only
2. This file has ONE responsibility (see role) — don't put other concerns here
3. Use ES module syntax: export / import
4. Every function must have real, working code`

    : `You are an expert Phaser 3 game developer.
Generate ONE complete, production-ready Phaser 3 scene/file.
Output ONLY the raw JS content — no markdown, no explanation.

RULES:
1. ZERO placeholders or TODO — real gameplay code only
2. Use Phaser 3 Graphics API for all visuals (no image files)
3. ES module syntax: import Phaser from 'phaser', export default class
4. Every method must have real, working implementation`;

  // ── Instruksi spesifik per file ──
  const roleInstructions = buildRoleInstructions(fileInfo, plan, isVanilla, isPhaser);

  const userPrompt = `Generate: ${fileInfo.path}
Role: ${fileInfo.role}

Blueprint:
${blueprint}

All project files:
${fileList}

Already generated (for imports/context):
${context || "(none yet)"}

Specific instructions for this file:
${roleInstructions}

OUTPUT the complete ${fileInfo.path} now. Real code only, no placeholders.`;

  const content = await callAI(systemPrompt, userPrompt, 8000);

  // ── Validasi anti-placeholder ──
  const banned = [
    /\/\/\s*(TODO|FIXME|add logic here|implement|game logic goes here|add gameplay)/i,
    /\/\*\s*TODO/i,
  ];
  for (const re of banned) {
    if (re.test(content)) {
      console.warn(`  ♻️  Placeholder di ${fileInfo.path}, retry ${attempt+1}...`);
      return generateOneFile(fileInfo, blueprint, plan, alreadyGenerated, attempt + 1);
    }
  }

  // Tolak file terlalu pendek
  const minLen = fileInfo.path.endsWith(".css") ? 200 : 400;
  if (content.length < minLen) {
    console.warn(`  ♻️  ${fileInfo.path} terlalu pendek (${content.length} chars), retry...`);
    return generateOneFile(fileInfo, blueprint, plan, alreadyGenerated, attempt + 1);
  }

  return content;
}

// ── Instruksi spesifik per role ──────────────────────────────

function buildRoleInstructions(fileInfo, plan, isVanilla, isPhaser) {
  const p = fileInfo.path;
  const role = fileInfo.role;
  const allPaths = plan.files.map(f => f.path);

  // ── Vanilla files ──
  if (p === "index.html") {
    const cssPaths = allPaths.filter(f => f.endsWith(".css"));
    const jsPaths  = allPaths.filter(f => f.endsWith(".js"));
    return `- HTML structure only — NO inline <style> or <script> logic
- Link CSS: ${cssPaths.map(c => `<link rel="stylesheet" href="${c}">`).join(" ")}
- Load JS as modules: ${jsPaths.filter(j => j.includes("main")).map(j => `<script type="module" src="${j}"></script>`).join(" ")}
- Create all necessary div containers with IDs matching what other JS files expect
- Include: #header, #grid-container, #clue-banner, #controls, #keyboard-container, #json-panel`;
  }

  if (p.endsWith(".css")) {
    return `- Complete CSS for the entire app
- Mobile-first, responsive (min 360px)
- Dark theme unless blueprint specifies otherwise
- Style all elements: grid cells, keyboard keys, buttons, panels
- Cell states: .active (selected), .highlighted (word), .correct (green), .wrong (red), .black (blocker)
- Smooth transitions on cell state changes`;
  }

  if (p === "js/data.js" || p.includes("data")) {
    return `- Export the default game data as: export const DEFAULT_DATA = {...}
- Include the exact JSON data from the blueprint
- Add helper: export function validateData(data) — check required fields
- Format: { title, words: [{id, word, clue, row, col, dir},...] }`;
  }

  if (p === "js/grid.js" || p.includes("grid")) {
    return `- export function buildGrid(words) — compute grid size from word coordinates, return 2D array
- export function renderGrid(words, container) — create DOM elements for each cell
- Each cell: <div class="cell" data-row="X" data-col="Y"> with letter span + number span
- Black cells fill unused positions automatically
- Compute grid dimensions: maxRow = max(row + word.length for down words), maxCol = max(col + word.length for across words)`;
  }

  if (p === "js/keyboard.js" || p.includes("keyboard")) {
    return `- export function renderKeyboard(container, onKey) — build QWERTY virtual keyboard
- Rows: QWERTYUIOP / ASDFGHJKL / ZXCVBNM + BACKSPACE
- Call onKey(letter) on button click/touch
- Also listen document.addEventListener('keydown') for physical keyboard
- export function destroyKeyboard() — remove event listeners`;
  }

  if (p === "js/game.js" || p.includes("game")) {
    return `- export class Game — main game controller
- constructor(data): load word data, initialize state
- selectCell(row, col): pick active word, highlight cells
- inputLetter(letter): place letter, advance cursor
- backspace(): delete letter, move cursor back
- checkAnswers(): compare input vs solution, mark correct/wrong
- getHint(): reveal one letter of active word
- reset(): clear all inputs
- loadData(newData): replace word data, rebuild grid
- Track: solvedWords Set, startTime, timer
- Win condition: all words solved → call onWin callback`;
  }

  if (p === "js/main.js" || (p.endsWith("main.js") && isVanilla)) {
    const imports = allPaths.filter(f => f !== "index.html" && f !== p && f.endsWith(".js"));
    return `- Import and wire all modules: ${imports.join(", ")}
- On DOMContentLoaded: init grid, keyboard, game controller
- Wire button clicks: CEK → game.checkAnswers(), PETUNJUK → game.getHint(), RESET → game.reset()
- Wire JSON panel: "Muat Soal" button → parse textarea → game.loadData(newData)
- Show error message if JSON invalid
- onWin callback: show overlay with completion time`;
  }

  // ── Phaser files ──
  if (p === "index.html" && isPhaser) {
    return `- Standard HTML5 with <div id="game">
- <script type="module" src="./src/main.js"></script>
- CSS: body margin 0, background black, overflow hidden`;
  }

  if (p === "src/main.js" && isPhaser) {
    const scenes = allPaths.filter(f => f.includes("scenes/"));
    return `- Import all scenes: ${scenes.join(", ")}
- Phaser.Game config: type AUTO, physics arcade, scale FIT+CENTER_BOTH
- Register all scenes in array`;
  }

  if (p.includes("scenes/") && isPhaser) {
    return `- Extend Phaser.Scene
- Implement ALL mechanics from blueprint with real code
- Use Phaser Graphics API: add.rectangle(), add.circle(), add.text()
- NO empty methods — every create/update must have real logic
- Colors: player=0x4488ff, enemy=0xff4444, platform=0x44aa44, item=0xffdd00`;
  }

  return `- Implement: ${role}`;
}

// ── STEP 3: GENERATE SEMUA FILE ──────────────────────────────

async function runGenerator(blueprint, plan) {
  log("\n🤖 [Step 2] Generate file per file...");

  const generated = [];

  // Urutan optimal: HTML → CSS → data → logic modules → main/wiring
  const ordered = orderFiles(plan.files);

  for (const fileInfo of ordered) {
    log(`  📝 ${fileInfo.path} (${fileInfo.role})`);
    try {
      const content = await generateOneFile(fileInfo, blueprint, plan, generated);
      generated.push({ ...fileInfo, content });
      writeFile(fileInfo.path, content);
      // Jeda kecil antar request
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`  ❌ Gagal: ${fileInfo.path} — ${err.message}`);
    }
  }

  return generated;
}

function orderFiles(files) {
  const priority = (f) => {
    if (f.path === "index.html") return 0;
    if (f.path.endsWith(".css")) return 1;
    if (f.path.includes("data")) return 2;
    if (f.path.includes("grid")) return 3;
    if (f.path.includes("keyboard")) return 4;
    if (f.path.includes("game") && !f.path.includes("main")) return 5;
    if (f.path.includes("Scene") && !f.path.includes("Game")) return 6;
    if (f.path.includes("GameScene")) return 7;
    if (f.path.includes("entities") || f.path.includes("systems")) return 8;
    if (f.path.includes("main")) return 9; // main.js selalu terakhir
    return 5;
  };
  return [...files].sort((a, b) => priority(a) - priority(b));
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  log("🚀 AI GAME BUILDER v4");
  log(`   Model: ${CONFIG.model}`);
  log("=".repeat(50));

  const blueprint = readBlueprint();
  log(`📖 Blueprint: ${blueprint.length} chars`);

  const plan = await runPlanner(blueprint);
  const files = await runGenerator(blueprint, plan);

  // Buat dist/ untuk vanilla (tidak perlu Vite build)
  if (plan.techStack === "vanilla") {
    log("\n📦 Copying to dist/ (vanilla — no build needed)...");
    fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
    for (const f of files) {
      const src  = path.join(ROOT, f.path);
      const dest = path.join(ROOT, "dist", f.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`  📋 dist/${f.path}`);
    }
  }

  fs.writeFileSync(
    path.join(ROOT, ".ai-build-meta.json"),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      model: CONFIG.model,
      techStack: plan.techStack,
      filesGenerated: files.map(f => f.path),
      plan
    }, null, 2)
  );

  log(`\n✅ Done! ${files.length} files generated.`);
  log("=".repeat(50));
}

main().catch(err => { console.error("\n💥 Fatal:", err.message); process.exit(1); });
