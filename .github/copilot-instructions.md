# Copilot instructions for dukgooenv.github.io

## Project architecture (read this first)
- This repo is a **single-file static web app**: almost all behavior and styling live in index.html.
- There is no bundler, framework, or module split. Treat this as DOM-first vanilla JS with global state.
- Main UI sections are toggled by category pills: `ALL`, `ABOUT`, `PRO`, `PERSONAL`, `RELIGHT`, `SKETCH`, `DESIGNER`.

## Where data lives
- `portfolioData` is the main source for the top-level grid cards and category filtering.
- `pwAllCards` + `pwProjects` define Personal/ReLighting/Sketch card metadata and per-project image arrays.
- `profCardData` + `profProjects` define Professional cards and the professional lightbox contents.
- If adding/removing projects, keep mapping tables in sync:
  - `profKeyMap`, `proThumbKeyMap`
  - `folderToPwKey`, `folderToProfKey`

## Critical interaction flows
- Grid rendering path: `filterData()` → `renderGrid()` → `buildGridHTML()`.
- `ALL` category is special: it uses `buildAllData()` (random representative image per project), splits into top/bottom grids, and shows spotlight.
- Three distinct modal systems exist and should stay separate:
  - Generic lightbox: `openLbImage()`, `openLbVideo()`, `closeLb()`
  - Personal Works lightbox: `openPwLb()`, `_pwLbRender()`, `pwLbNext()/pwLbPrev()`
  - Professional lightbox: `openProfLb()`, `renderProfLb()`, `closeProfLb()`

## External integrations
- Firebase (compat CDN) is loaded in index.html and used for Firestore view counters (`imageViews` collection).
- YouTube embeds are used for hover/video playback in banners and professional cards.
- Google Fonts are loaded from CDN.

## Project-specific conventions
- Many click handlers are inline HTML `onclick`; corresponding functions must be on `window`.
- Keep bilingual copy (Korean/English) and existing visual tone intact.
- Image assets follow dated folder naming under images/ (e.g., `images/Personal/20190902_M4/...`).
- Thumbnails commonly use `_Thumb` suffix; gallery sequences often use zero-padded numbering via `Array.from`.
- Most images use `loading="lazy"` and have `onerror` fallbacks; preserve this when adding cards.

## High-risk areas when editing
- Firestore counter hooks override existing functions (`openLbImage`, `openProfLb`, `renderGrid`, `appendGrid`).
  - Do not remove wrappers unless you rewire `recordView()` and `loadAllViewCounts()` behavior.
- Category display logic is stateful (`display: none/grid/block`) across multiple containers; regressions usually come from missed toggles in `filterData()`.

## Developer workflow
- No build/test scripts are present in the repo.
- Validate changes by running a local static server and manually testing:
  1. Category switching
  2. Infinite scroll in `ALL`
  3. Personal/Professional modal navigation and ESC close
  4. Firebase counter updates after opening media
- `robots.txt` currently disallows all crawlers; avoid changing without explicit request.
