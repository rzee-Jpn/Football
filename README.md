# 🎮 AI Web Game Builder

> Commit `blueprint.md` → AI generate game → Auto build → Auto fix → Deploy ke GitHub Pages

Sistem ini adalah **AI Game Builder Engine** berbasis GitHub Actions. Kamu tidak perlu coding — cukup edit blueprint, commit, dan game otomatis jadi.

---

## 🚀 Pipeline

```
blueprint.md  →  AI Planner  →  AI Generator  →  Write Files
                                                       ↓
                                              npm run build
                                                       ↓
                                          Error? → AI Auto-Fix Loop (max 3x)
                                                       ↓
                                              Deploy GitHub Pages
```

---

## ⚙️ Setup (1x saja)

### 1. Fork / Clone repo ini

```bash
git clone https://github.com/KAMU/ai-game-builder.git
cd ai-game-builder
```

### 2. Tambahkan API Key

Masuk ke **GitHub → Settings → Secrets and variables → Actions → New repository secret**

```
Name:  OPENROUTER_API_KEY
Value: sk-or-xxxxxxxxxxxxxxxxxxxx
```

Daftar gratis di [openrouter.ai](https://openrouter.ai) — model `deepseek/deepseek-chat` sangat murah.

### 3. Aktifkan GitHub Pages

Masuk ke **Settings → Pages → Source: Deploy from branch `gh-pages`**

---

## 🎯 Cara Pakai

### Edit `blueprint.md`:

```markdown
Game Name: SpaceRunner
Genre: Endless Runner
Orientation: Landscape
Platform: Mobile Web

## Mechanics
- Player jump, double jump
- Obstacle avoidance
- Score multiplier
- Coin collection

## Art Style
Retro pixel, neon colors

## Difficulty
Speed increases every 30 seconds
```

### Commit & Push:

```bash
git add blueprint.md
git commit -m "New game: SpaceRunner"
git push
```

### Tunggu GitHub Actions (~3-5 menit)

✅ Game live di: `https://USERNAME.github.io/ai-game-builder/`

---

## 📁 Struktur Repo

```
/
├── blueprint.md              ← EDIT INI untuk bikin game baru
├── package.json
├── vite.config.js
├── scripts/
│   ├── ai-builder.js         ← AI Planner + Generator
│   └── error-fixer.js        ← AI Auto-Fix Loop
└── .github/workflows/
    └── ai-build.yml          ← Pipeline otomatis
```

---

## 🧠 Arsitektur

### `ai-builder.js` — 2 Tahap:
1. **AI Planner** — Analisa blueprint, tentukan file apa yang dibuat
2. **AI Generator** — Generate semua file Phaser 3 dalam format JSON

### `error-fixer.js` — Auto Fix Loop:
- Baca error log dari `npm run build`
- Kirim ke AI untuk dianalisa dan diperbaiki
- Build ulang — max **3x percobaan**

### GitHub Actions — Full Pipeline:
- Trigger saat `blueprint.md` berubah
- Run generate → build → auto-fix jika error → commit files → deploy

---

## 🛠 Lokal (opsional)

```bash
npm install
export OPENROUTER_API_KEY=sk-or-xxx

# Generate dari blueprint
npm run generate

# Test lokal
npm run dev

# Build
npm run build
```

---

## 💡 Tips Blueprint

| Field | Contoh |
|-------|--------|
| Genre | Platformer, Endless Runner, Puzzle, Tower Defense |
| Orientation | Landscape / Portrait |
| Mechanics | jump, shoot, climb, collect, dash, powerup |
| Art Style | Retro pixel, Neon, Minimal, Cartoon |
| Difficulty | Static / Increasing per level / Time-based |

---

## ❓ FAQ

**Q: Ganti game, tinggal edit blueprint.md saja?**  
A: Ya! AI akan generate ulang semua file dari awal.

**Q: Kalau error terus sampai 3x?**  
A: Workflow akan fail. Coba sederhanakan blueprint atau buka issue.

**Q: Bisa pakai model AI lain?**  
A: Ya, edit `model` di `scripts/ai-builder.js` ke model lain di OpenRouter.

**Q: Biaya API berapa?**  
A: `deepseek/deepseek-chat` sekitar $0.001-0.003 per build.

---

## 📜 License

MIT — bebas dipakai, dimodifikasi, dan dikembangkan.
