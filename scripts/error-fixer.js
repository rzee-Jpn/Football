/**
 * AI Error Fixer - Auto Fix Loop (v2 - Fixed)
 * =============================================
 * FIX: Robust JSON parsing, smart file context (bukan substring),
 *      model dari config, error messages informatif
 *
 * Usage: node scripts/error-fixer.js
 * Env: OPENROUTER_API_KEY, AI_MODEL (opsional), FIX_RETRIES (opsional)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";
import { parseAIResponse } from "./json-parser.js";
import { validateFiles } from "./file-validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const apiKey = process.env.OPENROUTER_API_KEY;

// ============================================================
// HELPERS
// ============================================================

function log(msg) { console.log(`\n${msg}`); }

function runBuild() {
  try {
    const output = execSync("npm run build 2>&1", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: CONFIG.buildTimeoutMs
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stdout || err.stderr || err.message };
  }
}

// FIX: Smart file reader — prioritaskan file yang disebut di error log
function readSourceFiles(errorLog = "") {
  const files = {};
  const extensions = [".js", ".jsx", ".ts", ".html", ".css"];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !["node_modules", "dist", ".git"].includes(entry.name)) {
        scanDir(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        const relPath = path.relative(ROOT, fullPath).replace(/\\/g, "/");
        files[relPath] = fs.readFileSync(fullPath, "utf8");
      }
    }
  }

  scanDir(path.join(ROOT, "src"));
  const indexPath = path.join(ROOT, "index.html");
  if (fs.existsSync(indexPath)) {
    files["index.html"] = fs.readFileSync(indexPath, "utf8");
  }

  return files;
}

// FIX: Bangun context dengan prioritas — file yang disebut di error log duluan
function buildSmartContext(sourceFiles, errorLog) {
  const entries = Object.entries(sourceFiles);

  // Cek file mana yang disebut di error log
  const mentionedFiles = new Set();
  for (const [filePath] of entries) {
    const fileName = path.basename(filePath);
    if (errorLog.includes(filePath) || errorLog.includes(fileName)) {
      mentionedFiles.add(filePath);
    }
  }

  // Urutkan: file yang disebut duluan, sisanya belakang
  const sorted = [
    ...entries.filter(([p]) => mentionedFiles.has(p)),
    ...entries.filter(([p]) => !mentionedFiles.has(p)),
  ];

  // FIX: Batasi per-file, bukan total substring
  let totalChars = 0;
  const contextParts = [];

  for (const [filePath, content] of sorted) {
    if (totalChars >= CONFIG.maxContextChars) break;

    const remaining = CONFIG.maxContextChars - totalChars;
    const truncated = content.length > CONFIG.maxFileSizeForContext
      ? content.substring(0, CONFIG.maxFileSizeForContext) + "\n// ... (truncated)"
      : content;

    const snippet = `=== ${filePath} ===\n${truncated}`;
    if (totalChars + snippet.length > CONFIG.maxContextChars) break;

    contextParts.push(snippet);
    totalChars += snippet.length;
  }

  const mentioned = [...mentionedFiles].join(", ") || "none";
  log(`  📎 Context: ${contextParts.length}/${entries.length} files, ${totalChars} chars`);
  log(`  🎯 Error mentions: ${mentioned}`);

  return contextParts.join("\n\n");
}

// ============================================================
// AI CALL — FIX: model dari config
// ============================================================

async function callAI(systemPrompt, userPrompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/ai-game-builder",
      "X-Title": "AI Game Builder Error Fixer"
    },
    body: JSON.stringify({
      model: CONFIG.model,              // FIX: dari config
      temperature: 0.1,
      max_tokens: CONFIG.maxTokensFixer, // FIX: dari config
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) throw new Error("API Key tidak valid");
    if (res.status === 429) throw new Error("Rate limit — tunggu sebentar");
    throw new Error(`API Error ${res.status}: ${body.substring(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Response kosong dari AI");
  return content;
}

// ============================================================
// AI FIX — FIX: smart context + robust JSON parse
// ============================================================

async function askAIToFix(errorLog, sourceFiles) {
  const systemPrompt = `You are a Phaser 3 + Vite expert debugger.
Analyze the build error and return ONLY the fixed files in JSON.
Output ONLY valid JSON. No explanation. No markdown code blocks.`;

  // FIX: Smart context, bukan .substring(0, 10000) buta
  const filesContext = buildSmartContext(sourceFiles, errorLog);

  const userPrompt = `Build Error:
\`\`\`
${errorLog.substring(0, 4000)}
\`\`\`

Source Files:
${filesContext}

Return ONLY this JSON:
{
  "analysis": "what was wrong and what was fixed",
  "fixes": [
    { "path": "src/scenes/GameScene.js", "content": "COMPLETE fixed file" }
  ]
}

Rules:
- COMPLETE file content only (no snippets)
- Fix import paths, syntax errors, undefined variables
- Only include files that need changes`;

  const raw = await callAI(systemPrompt, userPrompt);

  // FIX: Robust JSON parse
  const result = parseAIResponse(raw);

  if (!result.fixes || !Array.isArray(result.fixes)) {
    throw new Error("Fix output tidak valid: 'fixes' harus array");
  }

  // FIX: Validasi file fix sebelum ditulis
  const { valid, skipped } = validateFiles(result.fixes);
  if (skipped.length > 0) {
    console.warn(`  ⚠️  ${skipped.length} fix diskip karena tidak valid`);
  }

  return { analysis: result.analysis, fixes: valid };
}

// ============================================================
// APPLY FIXES
// ============================================================

function applyFixes(fixes) {
  for (const fix of fixes) {
    const fullPath = path.join(ROOT, fix.path);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, fix.content, "utf8");
    console.log(`  ✅ Fixed: ${fix.path}`);
  }
}

function saveResult(success, attempts, lastError = null) {
  fs.writeFileSync(
    path.join(ROOT, ".ai-fix-result.json"),
    JSON.stringify({ success, attempts, lastError, timestamp: new Date().toISOString() }, null, 2)
  );
}

// ============================================================
// MAIN LOOP
// ============================================================

async function main() {
  log("🔧 AI ERROR FIXER v2 — Starting...");
  log(`   Model: ${CONFIG.model} | Max retries: ${CONFIG.fixRetries}`);
  log("=".repeat(50));

  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY tidak ditemukan!");
    process.exit(1);
  }

  for (let attempt = 1; attempt <= CONFIG.fixRetries; attempt++) {
    log(`\n🔨 Build Attempt ${attempt}/${CONFIG.fixRetries}...`);

    const buildResult = runBuild();

    if (buildResult.success) {
      log(`\n✅ BUILD BERHASIL pada attempt ${attempt}!`);
      saveResult(true, attempt);
      log("=".repeat(50));
      process.exit(0);
    }

    log(`  ❌ Build gagal.`);
    console.log("--- Error (first 800 chars) ---");
    console.log(buildResult.output.substring(0, 800));
    console.log("---");

    if (attempt === CONFIG.fixRetries) {
      log(`\n💥 Max retries (${CONFIG.fixRetries}) tercapai. Build gagal.`);
      saveResult(false, attempt, buildResult.output.substring(0, 2000));
      process.exit(1);
    }

    try {
      log(`  🤖 AI menganalisa error...`);
      const sourceFiles = readSourceFiles(buildResult.output);
      const fix = await askAIToFix(buildResult.output, sourceFiles);

      log(`  🧠 Analisis: ${fix.analysis}`);
      log(`  📝 Fixing ${fix.fixes.length} file(s)...`);
      applyFixes(fix.fixes);

      log(`  ⏳ Menunggu 2s sebelum build ulang...`);
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      log(`  ⚠️  AI fix gagal: ${err.message}`);
      log("  🔁 Mencoba build ulang tanpa patch...");
    }
  }
}

main();
