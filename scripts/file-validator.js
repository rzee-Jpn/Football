/**
 * File Validator
 * FIX: Validasi output AI sebelum ditulis ke disk
 */

/**
 * Validasi array file dari AI generator
 * @param {Array} files - Array { path, content }
 * @returns {{ valid: Array, skipped: Array, warnings: string[] }}
 */
export function validateFiles(files) {
  const valid = [];
  const skipped = [];
  const warnings = [];

  if (!Array.isArray(files)) {
    throw new Error("Output AI bukan array — format JSON salah");
  }

  for (const file of files) {
    const issues = [];

    // Cek field wajib
    if (!file.path || typeof file.path !== "string") {
      issues.push("path kosong atau bukan string");
    }
    if (!file.content || typeof file.content !== "string") {
      issues.push("content kosong atau bukan string");
    }

    // Cek path traversal (keamanan)
    if (file.path && (file.path.includes("..") || file.path.startsWith("/"))) {
      issues.push(`path berbahaya: "${file.path}"`);
    }

    // Cek path di luar whitelist folder
    const allowedPrefixes = ["src/", "index.html", "public/", "assets/"];
    if (file.path && !allowedPrefixes.some(p => file.path.startsWith(p) || file.path === p.replace("/", ""))) {
      warnings.push(`⚠️  File di luar folder normal: "${file.path}" — tetap ditulis`);
    }

    // Cek content tidak kosong / placeholder
    if (file.content && file.content.trim().length < 10) {
      issues.push(`content terlalu pendek (${file.content.trim().length} chars) — kemungkinan placeholder`);
    }

    // Cek content terpotong (tanda truncation)
    if (file.content && file.content.includes("__truncated__")) {
      warnings.push(`⚠️  "${file.path}" mungkin terpotong oleh AI — perlu dicek manual`);
    }

    if (issues.length > 0) {
      skipped.push({ ...file, issues });
      console.warn(`  ⛔ Skip "${file.path}": ${issues.join(", ")}`);
    } else {
      if (warnings.length > 0) warnings.forEach(w => console.warn(`  ${w}`));
      valid.push(file);
    }
  }

  return { valid, skipped, warnings };
}

/**
 * Pastikan file-file wajib ada — kalau tidak, inject default
 * @param {Array} files
 * @returns {Array}
 */
export function ensureRequiredFiles(files) {
  const paths = new Set(files.map(f => f.path));
  const result = [...files];

  // index.html wajib ada
  if (!paths.has("index.html")) {
    console.warn("  ⚠️  index.html tidak digenerate — inject default");
    result.push({
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Generated Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`
    });
  }

  // src/main.js wajib ada
  if (!paths.has("src/main.js")) {
    console.warn("  ⚠️  src/main.js tidak digenerate — inject placeholder");
    result.push({
      path: "src/main.js",
      content: `import Phaser from 'phaser';
// WARNING: File ini adalah placeholder karena AI tidak generate src/main.js
// Jalankan ulang ai-builder.js untuk generate ulang
console.error("src/main.js tidak digenerate dengan benar");
`
    });
  }

  return result;
}
