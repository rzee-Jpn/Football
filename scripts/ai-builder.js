/**
 * AI Game Builder v5
 * Fix: Interface Contract — semua file sepakat dulu sebelum generate
 * Fix: Context penuh (bukan 500 char) untuk file kecil
 * Fix: Win condition guard, grid render validation
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

async function runPlanner(blueprint) {
  log("🧠 [Step 1] Planner...");

  const raw = await callAI(
    `You are a web game file structure planner.
Read the blueprint Tech Stack section carefully.
Output ONLY valid JSON — no markdown, no explanation.`,

    `Blueprint:
${blueprint}

If blueprint says "Phaser", return techStack "phaser" with Phaser scene files.
If blueprint says "pure HTML/CSS/JS" or "vanilla", return techStack "vanilla" with split files.

For vanilla, use this structure:
{
  "gameName": "...",
  "techStack": "vanilla",
  "files": [
    { "path": "index.html",     "role": "HTML structure only, no inline JS/CSS" },
    { "path": "css/style.css",  "role": "All styling" },
    { "path": "js/data.js",     "role": "Default game data, export const DEFAULT_DATA" },
    { "path": "js/grid.js",     "role": "Grid rendering" },
    { "path": "js/keyboard.js", "role": "Virtual keyboard and input" },
    { "path": "js/game.js",     "role": "Game logic: check, hint, timer, win" },
    { "path": "js/main.js",     "role": "App init, wires all modules" }
  ],
  "mechanics": ["..."]
}

For phaser:
{
  "gameName": "...",
  "techStack": "phaser",
  "files": [
    { "path": "index.html",                  "role": "HTML entry" },
    { "path": "src/main.js",                 "role": "Phaser config + scene registry" },
    { "path": "src/scenes/BootScene.js",     "role": "Preload, go to Menu" },
    { "path": "src/scenes/MenuScene.js",     "role": "Main menu" },
    { "path": "src/scenes/GameScene.js",     "role": "Core gameplay" },
    { "path": "src/scenes/GameOverScene.js", "role": "Game over screen" }
  ],
  "mechanics": ["..."]
}`,
    2000
  );

  const plan = parseAIResponse(raw);
  log(`  Game : ${plan.gameName} | Stack: ${plan.techStack}`);
  plan.files.forEach(f => log(`  📄 ${f.path}`));
  return plan;
}

// ── STEP 2: CONTRACT — kunci utama v5 ────────────────────────
// AI tentukan function signatures & DOM ids SEBELUM generate file

async function buildContract(blueprint, plan) {
  log("\n📋 [Step 2] Building interface contract...");

  if (plan.techStack === "phaser") {
    // Phaser pakai scene registry, tidak perlu contract khusus
    return null;
  }

  const fileList = plan.files.map(f => `${f.path} — ${f.role}`).join("\n");

  const raw = await callAI(
    `You are a software architect. Define the exact interface contract between files.
Output ONLY valid JSON — no markdown, no explanation.`,

    `Blueprint: ${blueprint.substring(0, 800)}

Files:
${fileList}

Define the EXACT contract. Every export, DOM id, and event must be agreed here.
Other files will import/use exactly these — no deviation allowed.

Return:
{
  "domIds": {
    "grid-container": "div where grid cells are rendered",
    "clue-banner": "p/div showing active clue text",
    "progress-text": "span showing X/Y kata",
    "keyboard-container": "div for virtual keyboard",
    "json-textarea": "textarea for JSON input",
    "win-overlay": "div shown on game complete"
  },
  "exports": {
    "js/data.js": [
      "export const DEFAULT_DATA = { title, words: [{id,word,clue,row,col,dir}] }"
    ],
    "js/grid.js": [
      "export function buildGridMatrix(words): returns 2D array of cell objects",
      "export function renderGrid(containerId, words, onCellClick): void"
    ],
    "js/keyboard.js": [
      "export function initKeyboard(containerId, onKey): void",
      "export function destroyKeyboard(): void"
    ],
    "js/game.js": [
      "export class CrosswordGame",
      "  constructor(words, callbacks): words.length > 0 required",
      "  selectCell(row, col): void",
      "  inputLetter(letter): void",
      "  backspace(): void",
      "  checkAnswers(): { correct: number, total: number }",
      "  getHint(): void",
      "  reset(): void",
      "  loadNewData(data): void — rebuild game with new words",
      "  get solvedCount(): number — only increment when word fully correct",
      "  checkWin(): boolean — return true only if solvedCount === words.length AND words.length > 0"
    ],
    "js/main.js": [
      "import { DEFAULT_DATA } from './data.js'",
      "import { renderGrid } from './grid.js'",
      "import { initKeyboard } from './keyboard.js'",
      "import { CrosswordGame } from './game.js'",
      "DOMContentLoaded: renderGrid('grid-container', data.words, handleCellClick)",
      "DOMContentLoaded: new CrosswordGame(data.words, { onWin, onProgress })",
      "DOMContentLoaded: initKeyboard('keyboard-container', handleKey)"
    ]
  },
  "criticalRules": [
    "game.js checkWin() MUST guard: if words.length === 0 return false",
    "game.js constructor MUST set this.totalWords = words.length",
    "grid.js renderGrid MUST clear container before rendering",
    "main.js MUST call renderGrid BEFORE new CrosswordGame",
    "win overlay MUST be hidden by default (display:none), shown only on win"
  ]
}`,
    3000
  );

  const contract = parseAIResponse(raw);
  log(`  DOM ids  : ${Object.keys(contract.domIds || {}).join(", ")}`);
  log(`  Contracts: ${Object.keys(contract.exports || {}).join(", ")}`);
  log(`  Rules    : ${(contract.criticalRules || []).length} rules`);
  return contract;
}

// ── STEP 3: GENERATE FILE PER FILE ───────────────────────────

async function generateOneFile(fileInfo, blueprint, plan, contract, alreadyGenerated, attempt = 1) {
  if (attempt > 3) throw new Error(`Gagal generate ${fileInfo.path} setelah 3x`);

  const isVanilla = plan.techStack === "vanilla";
  const p = fileInfo.path;

  // ── Context: file sudah digenerate (PENUH untuk file kecil, ringkas untuk besar) ──
  const context = alreadyGenerated.map(f => {
    // CSS dan data.js biasanya kecil — kirim penuh
    const isTiny = f.path.endsWith(".css") || f.path.includes("data.js");
    const limit  = isTiny ? 99999 : 1200;
    const body   = f.content.length > limit
      ? f.content.substring(0, limit) + "\n// ... (truncated)"
      : f.content;
    return `=== ${f.path} ===\n${body}`;
  }).join("\n\n");

  // ── Contract string untuk file ini ──
  const myContract  = contract?.exports?.[p]?.join("\n") || "";
  const allContracts = contract
    ? Object.entries(contract.exports || {})
        .map(([k, v]) => `${k}:\n  ${v.join("\n  ")}`)
        .join("\n")
    : "";
  const domIds = contract
    ? Object.entries(contract.domIds || {})
        .map(([k, v]) => `#${k} — ${v}`)
        .join("\n")
    : "";
  const criticalRules = (contract?.criticalRules || []).join("\n- ");

  // ── System prompt ──
  const systemPrompt = isVanilla
    ? `You are an expert frontend developer (vanilla HTML/CSS/JavaScript ES modules).
Generate ONE complete, production-ready file.
Output ONLY the raw file content — no markdown fences, no explanation.

ABSOLUTE RULES:
1. ZERO placeholders, TODO, or empty functions
2. Follow the interface contract EXACTLY — same function names, same signatures
3. This file has ONE responsibility — don't put other concerns here
4. ES module syntax: export / import
5. Real, working implementation only`

    : `You are an expert Phaser 3 game developer.
Generate ONE complete Phaser 3 file.
Output ONLY raw JS — no markdown, no explanation.

ABSOLUTE RULES:
1. ZERO placeholders or TODO
2. Use Phaser 3 Graphics API for visuals (no image files)
3. ES module: import Phaser from 'phaser', export default class
4. Full implementation — no empty methods`;

  // ── Per-file instructions ──
  const instructions = buildInstructions(p, plan, contract);

  const userPrompt = `Generate: ${p}
Role: ${fileInfo.role}

Blueprint:
${blueprint}

${myContract ? `YOUR EXACT INTERFACE CONTRACT (follow this precisely):\n${myContract}\n` : ""}
${allContracts ? `ALL FILE CONTRACTS (for imports reference):\n${allContracts}\n` : ""}
${domIds ? `DOM IDs to use:\n${domIds}\n` : ""}
${criticalRules ? `CRITICAL RULES:\n- ${criticalRules}\n` : ""}

Already generated files:
${context || "(none)"}

Specific instructions:
${instructions}

Generate complete ${p} now.`;

  const content = await callAI(systemPrompt, userPrompt, 8000);

  // ── Validasi anti-placeholder ──
  const banned = [
    /\/\/\s*(TODO|FIXME|add logic here|implement|game logic goes here|add gameplay)/i,
    /\/\*\s*TODO/i,
  ];
  for (const re of banned) {
    if (re.test(content)) {
      console.warn(`  ♻️  Placeholder di ${p}, retry ${attempt+1}...`);
      return generateOneFile(fileInfo, blueprint, plan, contract, alreadyGenerated, attempt + 1);
    }
  }

  // Tolak file terlalu pendek
  const minLen = p.endsWith(".css") ? 300 : p === "index.html" ? 200 : 500;
  if (content.length < minLen) {
    console.warn(`  ♻️  ${p} terlalu pendek (${content.length}), retry...`);
    return generateOneFile(fileInfo, blueprint, plan, contract, alreadyGenerated, attempt + 1);
  }

  return content;
}

// ── Per-file instructions ────────────────────────────────────

function buildInstructions(p, plan, contract) {
  const allPaths = plan.files.map(f => f.path);
  const cssPaths = allPaths.filter(f => f.endsWith(".css"));
  const jsPaths  = allPaths.filter(f => f.endsWith(".js") && f.includes("js/main"));

  if (p === "index.html" && plan.techStack === "vanilla") {
    return `- HTML structure ONLY — zero inline <style> or <script> logic
- Link CSS: ${cssPaths.map(c => `<link rel="stylesheet" href="${c}">`).join(" ")}
- Load main JS: ${jsPaths.map(j => `<script type="module" src="${j}"></script>`).join(" ")}
- Create divs with EXACT ids from contract: ${Object.keys(contract?.domIds || {}).map(id => `id="${id}"`).join(", ")}
- win-overlay div must have style="display:none" by default`;
  }

  if (p.endsWith(".css")) {
    return `- Complete CSS for entire app
- Mobile-first, responsive (360px minimum)
- Style ALL dom elements including: ${Object.keys(contract?.domIds || {}).join(", ")}
- Cell states: .active=yellow bg, .highlighted=light yellow, .correct=light green, .wrong=light red, .black=dark bg
- #win-overlay: fixed fullscreen, centered content, hidden by default
- Smooth transitions on cell state changes
- Virtual keyboard keys: large touch targets (min 36px), clear borders`;
  }

  if (p.includes("data.js")) {
    return `- Export: export const DEFAULT_DATA = { title, words: [...] }
- Use EXACTLY the word data from the blueprint JSON section
- Each word: { id, word, clue, row, col, dir }
- Export helper: export function validateData(data) — check required fields exist`;
  }

  if (p.includes("grid.js")) {
    return `- export function buildGridMatrix(words): compute 2D array
  - gridRows = max(row + (dir==='down' ? word.length : 1)) for all words
  - gridCols = max(col + (dir==='across' ? word.length : 1)) for all words
  - cell object: { letter: '', answer: '', wordIds: [], isBlack: false, number: null }
  - Number cells: assign clue number to first cell of each word (sorted by row then col)
- export function renderGrid(containerId, words, onCellClick):
  - CLEAR container innerHTML before rendering
  - Build grid using buildGridMatrix
  - Create div.cell for each non-black cell, div.cell.black for black cells
  - Each cell div: data-row, data-col attributes
  - Number span inside first cell of each word
  - Attach click handler calling onCellClick(row, col)
  - Set CSS grid-template-columns based on computed cols`;
  }

  if (p.includes("keyboard.js")) {
    return `- export function initKeyboard(containerId, onKey):
  - Render 3-row QWERTY layout: QWERTYUIOP / ASDFGHJKL / ZXCVBNM + BACKSPACE
  - Each button calls onKey(letter) or onKey('BACKSPACE')
  - Also attach document.addEventListener('keydown') for physical keyboard
  - Store listener reference for cleanup
- export function destroyKeyboard(): remove document keydown listener`;
  }

  if (p.includes("game.js") && !p.includes("main")) {
    return `- export class CrosswordGame
- constructor(words, callbacks):
  - this.words = words
  - this.totalWords = words.length  ← WAJIB
  - this.userGrid = {} // key: "row,col" → letter
  - this.activeWord = null
  - this.solvedWords = new Set()
  - callbacks: { onProgress(solved, total), onWin(timeMs) }
- selectCell(row, col): find word at cell, set activeWord, highlight cells (add/remove CSS classes)
- inputLetter(letter): place in userGrid, advance cursor to next cell in active word
- backspace(): remove last letter, move cursor back
- checkAnswers():
  - for each word, check if all cells match solution
  - add to solvedWords if correct, remove if wrong
  - update cell CSS classes (.correct / .wrong)
  - call onProgress callback
  - call checkWin()
- checkWin():
  - GUARD: if (this.totalWords === 0) return false  ← CRITICAL
  - if (this.solvedWords.size === this.totalWords) → call onWin
- getHint(): reveal one random unfilled cell of activeWord
- reset(): clear userGrid, solvedWords, remove CSS classes
- loadNewData(data): validate data, reset state, store new words, call renderGrid + reinit`;
  }

  if (p.includes("main.js") || (p.endsWith("main.js"))) {
    const imports = allPaths.filter(f => f !== "index.html" && !p.includes(f) && f.endsWith(".js"));
    return `- Import ALL modules: ${imports.join(", ")}
- DOMContentLoaded handler:
  1. Load DEFAULT_DATA
  2. Call renderGrid('grid-container', data.words, handleCellClick)  ← FIRST
  3. Create game = new CrosswordGame(data.words, { onProgress, onWin })  ← SECOND
  4. Call initKeyboard('keyboard-container', handleKey)  ← THIRD
- handleCellClick(row, col): game.selectCell(row, col), update clue banner text
- handleKey(letter): if letter==='BACKSPACE' game.backspace() else game.inputLetter(letter)
- onProgress(solved, total): update #progress-text innerText = solved+"/"+total+" kata"
- onWin(timeMs): format time as MM:SS, show #win-overlay, set time text
- Button: CEK → game.checkAnswers()
- Button: PETUNJUK → game.getHint()
- Button: RESET → game.reset(), clear all .correct/.wrong/.active CSS classes
- JSON panel: "Muat Soal" → parse textarea JSON → validate → game.loadNewData(data), re-renderGrid
- Show error message in #json-error span if JSON invalid`;
  }

  // Phaser scenes
  if (p === "index.html" && plan.techStack === "phaser") {
    return `- <div id="game">, <script type="module" src="./src/main.js"></script>
- CSS: body margin 0, background #000, overflow hidden`;
  }
  if (p === "src/main.js" && plan.techStack === "phaser") {
    const scenes = allPaths.filter(f => f.includes("scenes/"));
    return `- Import: ${scenes.join(", ")}
- Phaser.Game: type AUTO, arcade physics, Scale.FIT + CENTER_BOTH
- scenes array: all imported scenes`;
  }
  if (p.includes("scenes/") && plan.techStack === "phaser") {
    return `- Extend Phaser.Scene, implement ALL blueprint mechanics
- Phaser Graphics only: add.rectangle(), add.circle(), add.text()
- ZERO empty methods
- Colors: player=0x4488ff, enemy=0xff4444, platform=0x44aa44, coin=0xffdd00`;
  }

  return `- Implement: ${plan.files.find(f => f.path === p)?.role || p}`;
}

// ── STEP 4: RUN GENERATOR ────────────────────────────────────

async function runGenerator(blueprint, plan, contract) {
  log("\n🤖 [Step 3] Generate file per file...");

  const generated = [];
  const ordered   = orderFiles(plan.files);

  for (const fileInfo of ordered) {
    log(`  📝 ${fileInfo.path}`);
    try {
      const content = await generateOneFile(fileInfo, blueprint, plan, contract, generated);
      generated.push({ ...fileInfo, content });
      writeFile(fileInfo.path, content);
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`  ❌ ${fileInfo.path} — ${err.message}`);
    }
  }

  return generated;
}

function orderFiles(files) {
  const pri = (f) => {
    if (f.path === "index.html")              return 0;
    if (f.path.endsWith(".css"))              return 1;
    if (f.path.includes("data"))             return 2;
    if (f.path.includes("grid"))             return 3;
    if (f.path.includes("keyboard"))         return 4;
    if (f.path.includes("game") && !f.path.includes("main")) return 5;
    if (f.path.includes("Scene") && !f.path.includes("Game")) return 6;
    if (f.path.includes("entities") || f.path.includes("systems")) return 7;
    if (f.path.includes("GameScene"))        return 8;
    if (f.path.includes("main"))             return 9;
    return 5;
  };
  return [...files].sort((a, b) => pri(a) - pri(b));
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  log("🚀 AI GAME BUILDER v5");
  log(`   Model: ${CONFIG.model}`);
  log("=".repeat(50));

  const blueprint = readBlueprint();
  const plan      = await runPlanner(blueprint);
  const contract  = await buildContract(blueprint, plan);
  const files     = await runGenerator(blueprint, plan, contract);

  // Vanilla: copy ke dist/ (tidak perlu Vite build)
  if (plan.techStack === "vanilla") {
    log("\n📦 Copying to dist/...");
    fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
    for (const f of files) {
      const dest = path.join(ROOT, "dist", f.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(ROOT, f.path), dest);
    }
    log("  ✅ dist/ ready");
  }

  fs.writeFileSync(
    path.join(ROOT, ".ai-build-meta.json"),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      model: CONFIG.model,
      techStack: plan.techStack,
      filesGenerated: files.map(f => f.path),
      plan,
      contract
    }, null, 2)
  );

  log(`\n✅ Done! ${files.length} files generated.`);
  log("=".repeat(50));
}

main().catch(err => { console.error("\n💥 Fatal:", err.message); process.exit(1); });
