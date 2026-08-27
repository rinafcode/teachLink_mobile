# Font Pipeline

TeachLink uses a three-stage font pipeline: **subsetting**, **analysis**, and **runtime loading**.

---

## Overview

```
assets/fonts/original/*.ttf        ← Source fonts (checked into repo)
        │
        ▼
scripts/subset-fonts.py            ← Stage 1: Character-level subsetting
        │
        ▼
assets/fonts/*.ttf                 ← Subsetted fonts (output, loaded at runtime)
        │
        ├──► src/services/fontService.ts   ← Stage 3: Runtime loading
        │
scripts/analyze-fonts.js           ← Stage 2: Character usage analysis (supplementary)
```

---

## Stage 1: Subsetting (`scripts/subset-fonts.py`)

This is the **canonical** font subsetting script used by CI.

### What it does

1. Scans all `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.html`, and `.css` files in `app/` and `src/`
2. Collects every unique character found in the source code
3. Adds a baseline of printable ASCII characters (space–tilde)
4. Writes the character set to a temporary file
5. Runs `fontTools.subset` (via `pyftsubset`) to create a minimal `.ttf` containing only the used characters
6. Outputs subsetted fonts to `assets/fonts/`

### Usage

```bash
# npm scripts (both are equivalent)
npm run subset-fonts
npm run fonts:subset

# Direct
python scripts/subset-fonts.py
```

### Requirements

- Python 3.10+
- `fonttools==4.62.0` (pinned in `requirements.txt`)

### CI integration

In `.github/workflows/ci.yml`:

1. Python dependencies are installed from `requirements.txt`
2. Subsetted fonts are cached with a key derived from:
   - `assets/fonts/original/*.ttf` (source font content)
   - `scripts/subset-fonts.py` (subsetting logic)
   - `requirements.txt` (tool version)
3. Subsetting runs only on cache miss

---

## Stage 2: Analysis (`scripts/analyze-fonts.js`)

A **supplementary** tool for understanding character usage across the project. Not part of the CI pipeline.

### What it does

1. Scans all `.ts`, `.tsx`, `.js`, `.jsx` files in `src/`
2. Extracts string literals and JSX text content
3. Categorises characters by script (Latin, Cyrillic, Greek, etc.)
4. Generates a report in `assets/fonts/analysis/font-analysis.json`

### Usage

```bash
npm run fonts:analyze
```

### Output

The report includes:
- Total and unique character counts
- Character frequency (top 20 most-used characters)
- Recommended character subsets for subsetting optimisation

---

## Stage 3: Runtime Loading (`src/services/fontService.ts`)

The `FontService` class manages font loading at runtime using `expo-font`.

### Font Categories

Defined in `src/services/fontService.ts`:

#### `CRITICAL_FONTS` — loaded before splash screen dismiss

| Font | Weight | Purpose |
|---|---|---|
| Inter-Regular | 400 | Body text, UI labels |
| Inter-Medium | 500 | Emphasised body text |
| Inter-Bold | 700 | Headings, primary buttons |

#### `SECONDARY_FONTS` — loaded lazily after initial render

| Font | Weight | Purpose |
|---|---|---|
| Inter-SemiBold | 600 | Subheadings, secondary buttons |

### Loading Strategy

1. `FontService.preloadCriticalFonts()` is called during app bootstrap
2. Critical fonts block splash screen dismissal
3. Secondary fonts load on demand after the first screen renders
4. All fonts are loaded via `expo-font`'s `Font.loadAsync()`

### Font Configuration

Font families, weights, and typography presets are defined in `src/config/fonts.ts`:

```typescript
// Font families
FONT_FAMILIES.Inter.weights = {
  '400': 'Inter-Regular',
  '500': 'Inter-Medium',
  '600': 'Inter-SemiBold',
  '700': 'Inter-Bold',
};

// Character subsets available for subsetting
CHARACTER_SETS = {
  latin, latinExtended, cyrillic, greek, symbols, numbers, punctuation
};
```

---

## Relationship Between CRITICAL_FONTS and Subset Output

`CRITICAL_FONTS` references the subsetted `.ttf` files via `require()`:

```typescript
export const FONTS = {
  'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
  'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
  'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
} as const;
```

The subsetting script (`subset-fonts.py`) produces files at the same paths (`assets/fonts/Inter-*.ttf`), so the `require()` calls always resolve to the subsetted versions.

---

## Troubleshooting

### Missing characters in the rendered app

If a character doesn't render, it was likely missed by the subsetting scan:

1. Run `npm run fonts:analyze` to check which characters the project uses
2. Ensure the character appears in a `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.html`, or `.css` file under `app/` or `src/`
3. Re-run `npm run subset-fonts` to regenerate the subset

### Font cache not updating in CI

If CI uses stale subsetted fonts:

1. Check if `requirements.txt` version changed (this invalidates the cache)
2. Check if source font files in `assets/fonts/original/` changed
3. Manually clear the cache: `gh cache delete $CACHE_KEY`

### Adding a new font weight

1. Add the `.ttf` file to `assets/fonts/original/`
2. Re-run `npm run subset-fonts`
3. Add the font to `FONTS`, `CRITICAL_FONTS` or `SECONDARY_FONTS` in `src/services/fontService.ts`
4. Add the weight mapping in `src/config/fonts.ts`
