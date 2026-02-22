/**
 * AI Game Builder v6
 * Domain-split architecture:
 * - 1 domain = 1 file (bukan 1 fungsi = 1 file)
 * - File besar dipecah ke sub-domain dengan facade pattern
 * - State terpusat, import hierarki jelas
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
      if (data.choices?.[0]?.finish_reason === "length") console.warn("  ⚠️  Terpotong!");
      return content;

    } catch (err) {
      console.error(`  ⚠️  Attempt ${i+1}/${retries}: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, CONFIG.retryDelayMs * (i + 1)));
    }
  }
}

// ── STEP 1: PLANNER ──────────────────────────────────────────
// Memutuskan file structure, termasuk sub-domain split jika perlu

async function runPlanner(blueprint) {
  log("🧠 [Step 1] Planner...");

  const raw = await callAI(
    `You are a web game file structure planner.
Read Tech Stack in the blueprint. Output ONLY valid JSON, no markdown.`,

    `Blueprint:
${blueprint}

Rules for file splitting:
- Each file has ONE domain responsibility
- If a domain is complex (>150 lines estimated), split into sub-domains + 1 facade
- Max ~100-120 lines per file target
- Keep total files under 12

For "vanilla" tech stack, use this domain pattern:

SIMPLE game (few mechanics):
{
  "gameName": "...", "techStack": "vanilla",
  "files": [
    { "path": "index.html",      "role": "HTML structure only", "domain": "structure" },
    { "path": "css/style.css",   "role": "All styling",         "domain": "style" },
    { "path": "js/data.js",      "role": "Game data + DEFAULT_DATA export", "domain": "data" },
    { "path": "js/grid.js",      "role": "Grid render + cell DOM management", "domain": "grid" },
    { "path": "js/keyboard.js",  "role": "Virtual keyboard + physical key listener", "domain": "input" },
    { "path": "js/game.js",      "role": "Game logic facade — imports state/actions/validator", "domain": "game-facade" },
    { "path": "js/main.js",      "role": "App init, wires all modules", "domain": "init" }
  ]
}

COMPLEX game (many mechanics — use sub-domain split for game logic):
{
  "gameName": "...", "techStack": "vanilla",
  "files": [
    { "path": "index.html",            "role": "HTML structure only",                          "domain": "structure" },
    { "path": "css/style.css",         "role": "All styling",                                  "domain": "style" },
    { "path": "js/data.js",            "role": "Game data + DEFAULT_DATA export",              "domain": "data" },
    { "path": "js/grid.js",            "role": "Grid render + cell DOM management",            "domain": "grid" },
    { "path": "js/keyboard.js",        "role": "Virtual keyboard + physical key listener",     "domain": "input" },
    { "path": "js/game-state.js",      "role": "State only: userGrid, activeWord, solvedWords","domain": "game-state" },
    { "path": "js/game-actions.js",    "role": "Actions: inputLetter, backspace, getHint — imports game-state", "domain": "game-actions" },
    { "path": "js/game-validator.js",  "role": "checkAnswers, checkWin — imports game-state", "domain": "game-validator" },
    { "path": "js/game.js",            "role": "Facade: re-exports from state+actions+validator, public API only", "domain": "game-facade" },
    { "path": "js/main.js",            "role": "App init, wires all modules",                  "domain": "init" }
  ]
}

For "phaser" tech stack:
{
  "gameName": "...", "techStack": "phaser",
  "files": [
    { "path": "index.html",                  "role": "HTML entry",              "domain": "structure" },
    { "path": "src/main.js",                 "role": "Phaser config + scenes",  "domain": "init" },
    { "path": "src/scenes/BootScene.js",     "role": "Preload + go to Menu",    "domain": "boot" },
    { "path": "src/scenes/MenuScene.js",     "role": "Main menu UI",            "domain": "menu" },
    { "path": "src/scenes/GameScene.js",     "role": "Core gameplay",           "domain": "game" },
    { "path": "src/scenes/GameOverScene.js", "role": "Game over screen",        "domain": "gameover" }
  ]
}

Analyze blueprint complexity and choose simple or complex structure accordingly.
Return the JSON only.`,
    2500
  );

  const plan = parseAIResponse(raw);
  log(`  Game : ${plan.gameName} | Stack: ${plan.techStack} | Files: ${plan.files.length}`);
  plan.files.forEach(f => log(`    [${f.domain}] ${f.path}`));
  return plan;
}

// ── STEP 2: CONTRACT BUILDER ──────────────────────────────────
// Tentukan interface: exports, DOM ids, critical rules
// Ini "perjanjian" yang SEMUA file harus ikuti

async function buildContract(blueprint, plan) {
  log("\n📋 [Step 2] Building interface contract...");

  if (plan.techStack === "phaser") return null; // Phaser pakai scene registry

  const fileList = plan.files.map(f => `${f.path} [${f.domain}] — ${f.role}`).join("\n");
  const isComplex = plan.files.some(f => f.domain === "game-state");

  const raw = await callAI(
    `You are a software architect. Define exact interfaces between files.
Output ONLY valid JSON — no markdown, no explanation.`,

    `Blueprint: ${blueprint.substring(0, 600)}

Files:
${fileList}

Define the contract. Every function name and DOM id agreed here is FINAL.

${isComplex ? `
This is a COMPLEX project with sub-domain split:
- game-state.js exports state object and state mutators
- game-actions.js imports from game-state.js
- game-validator.js imports from game-state.js
- game.js (facade) imports from all three and re-exports public API
- main.js imports ONLY from game.js (facade), never directly from sub-domains
` : ""}

Return:
{
  "domIds": {
    "grid-container": "description",
    "clue-banner": "description",
    "progress-text": "description",
    "keyboard-container": "description",
    "json-textarea": "description",
    "json-error": "description",
    "win-overlay": "description — must be display:none by default"
  },
  "exports": {
    "js/data.js": [
      "export const DEFAULT_DATA",
      "export function validateData(data): boolean"
    ],
    "js/grid.js": [
      "export function renderGrid(containerId, words, onCellClick): void",
      "export function highlightWord(cells, className): void",
      "export function clearHighlights(): void"
    ],
    "js/keyboard.js": [
      "export function initKeyboard(containerId, onKey): void",
      "export function destroyKeyboard(): void"
    ],
    ${isComplex ? `
    "js/game-state.js": [
      "export function createState(words): GameState",
      "export function getState(): GameState",
      "export function setState(partial): void"
    ],
    "js/game-actions.js": [
      "export function selectCell(row, col): void",
      "export function inputLetter(letter): void",
      "export function backspace(): void",
      "export function getHint(): void"
    ],
    "js/game-validator.js": [
      "export function checkAnswers(): {correct, total}",
      "export function checkWin(): boolean — GUARD: if totalWords===0 return false"
    ],` : ""}
    "js/game.js": [
      "export class CrosswordGame (or export object with public API)",
      "  init(words, callbacks): void",
      "  selectCell(row, col): void",
      "  inputLetter(letter): void",
      "  backspace(): void",
      "  checkAnswers(): void",
      "  getHint(): void",
      "  reset(): void",
      "  loadNewData(data): void"
    ],
    "js/main.js": [
      "import only from game.js facade",
      "DOMContentLoaded sequence: renderGrid → new CrosswordGame → initKeyboard"
    ]
  },
  "criticalRules": [
    "checkWin MUST guard: if totalWords === 0 return false",
    "renderGrid MUST clear container innerHTML before render",
    "win-overlay MUST be display:none by default, shown only on win",
    "game-state is single source of truth — never duplicate state",
    "main.js imports ONLY from facade (game.js), never from sub-domains directly",
    "all DOM ids must match contract exactly — no hardcoded strings elsewhere"
  ]
}`,
    3000
  );

  const contract = parseAIResponse(raw);
  log(`  DOM ids : ${Object.keys(contract.domIds || {}).join(", ")}`);
  log(`  Files   : ${Object.keys(contract.exports || {}).join(", ")}`);
  log(`  Rules   : ${(contract.criticalRules || []).length}`);
  return contract;
}

// ── STEP 3: GENERATE FILE PER FILE ───────────────────────────

async function generateOneFile(fileInfo, blueprint, plan, contract, alreadyGenerated, attempt = 1) {
  if (attempt > 3) throw new Error(`Gagal setelah 3x: ${fileInfo.path}`);

  const isVanilla = plan.techStack === "vanilla";
  const p = fileInfo.path;

  // Context: kirim file sudah generate — penuh jika kecil, ringkas jika besar
  const context = alreadyGenerated.map(f => {
    const isSmall = f.content.length < 2500;
    const body = isSmall ? f.content : f.content.substring(0, 1500) + "\n// ... (truncated)";
    return `=== ${f.path} [${f.domain}] ===\n${body}`;
  }).join("\n\n");

  // Contract strings
  const myExports   = (contract?.exports?.[p] || []).join("\n");
  const allExports  = contract
    ? Object.entries(contract.exports || {})
        .map(([k, v]) => `${k}:\n  ${v.join("\n  ")}`)
        .join("\n")
    : "";
  const domIds      = contract
    ? Object.entries(contract.domIds || {}).map(([k,v]) => `#${k} — ${v}`).join("\n")
    : "";
  const rules       = (contract?.criticalRules || []).join("\n- ");

  const systemPrompt = isVanilla
    ? `You are an expert frontend developer (vanilla JS ES modules).
Generate ONE complete file. Output ONLY raw file content — no markdown, no explanation.
RULES:
1. ZERO placeholders or TODO — full implementation
2. Follow interface contract EXACTLY — same names, same signatures  
3. ONE domain responsibility per file
4. ES module syntax throughout
5. Every function: real working code`
    : `You are an expert Phaser 3 developer.
Generate ONE complete Phaser 3 file. Output ONLY raw JS — no markdown.
RULES:
1. ZERO placeholders — real gameplay code
2. Phaser Graphics API for all visuals
3. ES module: import Phaser / export default class
4. Full implementations — no empty methods`;

  const instructions = buildInstructions(p, fileInfo.domain, plan, contract);

  const userPrompt = `Generate: ${p}
Domain: ${fileInfo.domain}
Role: ${fileInfo.role}

Blueprint:
${blueprint}

${myExports ? `YOUR CONTRACT (implement exactly):\n${myExports}\n` : ""}
${allExports ? `ALL CONTRACTS (for import reference):\n${allExports}\n` : ""}
${domIds ? `DOM IDs (use exactly):\n${domIds}\n` : ""}
${rules ? `CRITICAL RULES:\n- ${rules}\n` : ""}

Already generated:
${context || "(none)"}

Instructions:
${instructions}

Generate complete ${p} now. Real code only.`;

  const content = await callAI(systemPrompt, userPrompt, 7000);

  // Validasi
  if (/\/\/\s*(TODO|FIXME|add logic|game logic goes here|implement this)/i.test(content)) {
    console.warn(`  ♻️  Placeholder di ${p}, retry ${attempt+1}...`);
    return generateOneFile(fileInfo, blueprint, plan, contract, alreadyGenerated, attempt + 1);
  }

  const minLen = p.endsWith(".css") ? 300 : p === "index.html" ? 150 : 400;
  if (content.length < minLen) {
    console.warn(`  ♻️  ${p} terlalu pendek (${content.length}), retry...`);
    return generateOneFile(fileInfo, blueprint, plan, contract, alreadyGenerated, attempt + 1);
  }

  return content;
}

// ── Instructions per domain ───────────────────────────────────

function buildInstructions(p, domain, plan, contract) {
  const allPaths = plan.files.map(f => f.path);
  const isComplex = plan.files.some(f => f.domain === "game-state");

  switch (domain) {
    case "structure": {
      const cssPaths = allPaths.filter(f => f.endsWith(".css"));
      const mainJs   = allPaths.find(f => f.endsWith("main.js") && f.includes("js/"));
      const domIds   = Object.keys(contract?.domIds || {});
      return `- HTML ONLY — zero inline style or script logic
- Link: ${cssPaths.map(c => `<link rel="stylesheet" href="${c}">`).join(" ")}
- Module: <script type="module" src="${mainJs}"></script>
- Required divs: ${domIds.map(id => `<div id="${id}"></div>`).join(" ")}
- #win-overlay must have style="display:none"`;
    }

    case "style":
      return `- Complete CSS for entire app, mobile-first (360px min)
- Dark theme, clean and readable
- .cell: border, background white, cursor pointer, relative position
- .cell.active: yellow/gold background  
- .cell.highlighted: light yellow background
- .cell.correct: light green background
- .cell.wrong: light red/pink background
- .cell.black: dark background, no cursor
- .cell-number: absolute top-left, tiny font, color accent
- #win-overlay: fixed fullscreen overlay, centered content, z-index high
- Keyboard keys: min 36px height, good touch targets
- Responsive grid: CSS grid auto-fit`;

    case "data":
      return `- export const DEFAULT_DATA = { title, words: [...] }
- Use EXACT word data from blueprint JSON section
- export function validateData(data): check title exists, words is non-empty array,
  each word has: id(number), word(string), clue(string), row(number), col(number), dir('across'|'down')
  return true if valid, throw Error with message if invalid`;

    case "grid":
      return `- export function renderGrid(containerId, words, onCellClick):
  1. Clear container innerHTML
  2. Compute grid size: 
     rows = max of (row + length) for down words, (row+1) for across
     cols = max of (col + length) for across words, (col+1) for down
  3. Build 2D matrix — mark which cells belong to which words
  4. Assign clue numbers (sort words by row then col, number 1,2,3...)
  5. Create div.cell per cell, div.cell.black for unused cells
  6. Set container style.gridTemplateColumns = repeat(cols, Npx)
  7. data-row, data-col on each cell
  8. .cell-number span for numbered cells
  9. onclick → onCellClick(row, col)
- export function setCellLetter(row, col, letter): update cell DOM text
- export function setCellClass(row, col, className, exclusive=false): add/remove classes
- export function clearAllClasses(classNames[]): remove from all cells`;

    case "input":
      return `- export function initKeyboard(containerId, onKey):
  - Rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
  - Each button: data-key attribute, calls onKey(key) on click
  - Add BACKSPACE button to last row
  - Store: const physicalHandler = (e) => { if (e.key.match(/^[a-zA-Z]$/)) onKey(e.key.toUpperCase()); if (e.key==='Backspace') onKey('BACKSPACE'); e.preventDefault(); }
  - document.addEventListener('keydown', physicalHandler)
- export function destroyKeyboard(): document.removeEventListener('keydown', physicalHandler)`;

    case "game-state":
      return `- Single source of truth for all game state
- export function createState(words):
  returns {
    words,           // original word array
    totalWords: words.length,
    userGrid: {},    // key "row,col" → letter string
    activeWordId: null,
    activeCells: [], // [{row,col}] of active word
    activeCursor: 0, // index in activeCells
    solvedWords: new Set(),
    startTime: null,
    timerInterval: null
  }
- let _state = null
- export function getState(): return _state
- export function setState(partial): Object.assign(_state, partial)
- export function initState(words): _state = createState(words); _state.startTime = Date.now()`;

    case "game-actions":
      return `- import { getState, setState } from './game-state.js'
- import { setCellLetter, setCellClass, clearAllClasses } from './grid.js'
- export function selectCell(row, col, words):
  - Find word at (row,col), determine direction if intersection
  - Build activeCells array for that word
  - clearAllClasses(['highlighted','active'])
  - setCellClass for all cells in word: 'highlighted'
  - setCellClass for cursor cell: 'active'
  - setState({ activeWordId, activeCells, activeCursor })
  - Return clue text for the active word
- export function inputLetter(letter):
  - Place letter in userGrid at cursor position
  - setCellLetter(row, col, letter)
  - Advance cursor (activeCursor + 1), skip filled cells
  - Update active class
- export function backspace():
  - If cursor cell has letter: delete it, setCellLetter empty
  - Else move cursor back, delete that letter
- export function getHint():
  - Find first unfilled cell in activeWord
  - Set correct answer letter in userGrid
  - setCellLetter with correct letter`;

    case "game-validator":
      return `- import { getState, setState } from './game-state.js'
- import { setCellClass } from './grid.js'
- export function checkAnswers():
  - For each word: compare userGrid letters vs word.word
  - If fully correct: add to solvedWords, mark cells .correct
  - If wrong: mark filled cells .wrong
  - setState({ solvedWords })
  - return { correct: solvedWords.size, total: state.totalWords }
- export function checkWin():
  - CRITICAL GUARD: if (!state || state.totalWords === 0) return false
  - if (state.solvedWords.size === state.totalWords) return true
  - return false`;

    case "game-facade": {
      const stateFile    = allPaths.find(f => f.includes("game-state"));
      const actionsFile  = allPaths.find(f => f.includes("game-actions"));
      const validFile    = allPaths.find(f => f.includes("game-validator"));
      if (isComplex) {
        return `- Facade pattern — re-export public API, hide sub-domain complexity
- import { initState, getState } from './game-state.js'
- import { selectCell, inputLetter, backspace, getHint } from './game-actions.js'
- import { checkAnswers, checkWin } from './game-validator.js'
- import { renderGrid } from './grid.js'
- export class CrosswordGame:
  - constructor(words, callbacks): initState(words), store callbacks {onProgress, onWin}
  - selectCell(r,c): calls actions.selectCell, returns clue string
  - inputLetter(l): actions.inputLetter(l)
  - backspace(): actions.backspace()
  - checkAnswers(): result = validator.checkAnswers(); callbacks.onProgress(result); if checkWin() callbacks.onWin(elapsed)
  - getHint(): actions.getHint()
  - reset(): initState(this.words) — fresh state, clearAllClasses
  - loadNewData(data): validateData(data), this.words = data.words, reset, re-renderGrid`;
      }
      // Simple — no sub-domain split
      return `- export class CrosswordGame with full implementation (no sub-domains)
- constructor(words, callbacks): init all state inline
- Implement: selectCell, inputLetter, backspace, checkAnswers, getHint, reset, loadNewData
- GUARD: checkWin — if totalWords===0 return false`;
    }

    case "init": {
      const imports = allPaths.filter(f => !f.includes("index.html") && !f.endsWith("main.js"));
      return `- Import: ${imports.join(", ")}
- DOMContentLoaded:
  1. const data = DEFAULT_DATA
  2. renderGrid('grid-container', data.words, (r,c) => handleCellClick(r,c))
  3. game = new CrosswordGame(data.words, { onProgress, onWin })
  4. initKeyboard('keyboard-container', handleKey)
  5. wireButtons()
- handleCellClick(r,c): clue = game.selectCell(r,c); document.getElementById('clue-banner').textContent = clue
- handleKey(k): if k==='BACKSPACE' game.backspace(); else game.inputLetter(k)
- onProgress({correct,total}): document.getElementById('progress-text').textContent = correct+'/'+total+' kata'
- onWin(elapsedMs): formatTime(elapsedMs), show #win-overlay with time
- wireButtons(): 
  CEK btn → game.checkAnswers()
  PETUNJUK btn → game.getHint()
  RESET btn → game.reset(); clearAllClasses(['correct','wrong','active','highlighted'])
  MUAT btn → loadJSON from #json-textarea, validate, game.loadNewData(data), re-renderGrid
  Show #json-error if invalid JSON`;
    }

    // Phaser
    case "boot":
      return `- preload(): load minimal assets if needed
- create(): this.scene.start('Menu')`;
    case "menu":
      return `- create(): Phaser.GameObjects title text, "Click to Start" button
- On click: this.scene.start('Game')`;
    case "game":
      return `- Implement ALL mechanics from blueprint
- Phaser Graphics for all visuals: add.rectangle(), add.circle(), add.text()
- Arcade physics for movement/collision
- Mobile controls: on-screen buttons via DOM overlay or Phaser GameObjects
- Score, lives, level in UI (add.text top of screen)
- On game over: this.scene.start('GameOver', { score })`;
    case "gameover":
      return `- Show score from scene data
- "Play Again" → this.scene.start('Menu')`;
    case "boot-phaser":
      return `- import all scenes, create Phaser.Game config
- Scale: FIT + CENTER_BOTH`;

    default:
      return `- Implement: ${plan.files.find(f => f.path === p)?.role}`;
  }
}

// ── ORDER FILES ───────────────────────────────────────────────
// Urutan generate: structure → style → data → grid → input → state → actions → validator → facade → init

function orderFiles(files) {
  const domainOrder = {
    "structure": 0, "style": 1, "data": 2, "grid": 3, "input": 4,
    "game-state": 5, "game-actions": 6, "game-validator": 7,
    "game-facade": 8, "boot": 9, "menu": 10, "game": 11, "gameover": 12, "init": 13
  };
  return [...files].sort((a, b) =>
    (domainOrder[a.domain] ?? 99) - (domainOrder[b.domain] ?? 99)
  );
}

// ── STEP 4: RUN GENERATOR ────────────────────────────────────

async function runGenerator(blueprint, plan, contract) {
  log("\n🤖 [Step 3] Generate file per file...");
  const generated = [];
  const ordered   = orderFiles(plan.files);

  for (const fileInfo of ordered) {
    log(`  📝 [${fileInfo.domain}] ${fileInfo.path}`);
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

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  log("🚀 AI GAME BUILDER v6");
  log(`   Model: ${CONFIG.model}`);
  log("=".repeat(50));

  const blueprint = readBlueprint();
  const plan      = await runPlanner(blueprint);
  const contract  = await buildContract(blueprint, plan);
  const files     = await runGenerator(blueprint, plan, contract);

  // Vanilla: copy ke dist/ tanpa Vite build
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
      filesGenerated: files.map(f => ({ path: f.path, domain: f.domain, size: f.content.length })),
      plan, contract
    }, null, 2)
  );

  log(`\n✅ Done! ${files.length} files | Model: ${CONFIG.model}`);
  log("=".repeat(50));
}

main().catch(err => { console.error("\n💥 Fatal:", err.message); process.exit(1); });
