# Fonts Directory

This directory contains font files for the application.

## Structure

```
fonts/
├── source/          # Original font files (not subset)
├── subset/          # Subset font files (optimized)
└── README.md        # This file
```

## Font Subsetting

The project uses a font subsetting pipeline to optimize font file sizes by including only the characters needed for the application.

### Running the Subsetting Pipeline

```bash
node scripts/subset-fonts.js
```

### Prerequisites

You need to install `fonttools` to use the subsetting pipeline:

```bash
pip install fonttools
```

## Font Files

### Inter Font Family

- **Inter-Regular.ttf** - Regular weight (400)
- **Inter-Medium.ttf** - Medium weight (500)
- **Inter-SemiBold.ttf** - Semi-bold weight (600)
- **Inter-Bold.ttf** - Bold weight (700)

## Character Sets

The subsetting pipeline supports the following character sets:

- **Latin** - Basic Latin characters (English)
- **Latin Extended** - Extended Latin characters (European languages)
- **Cyrillic** - Cyrillic characters (Russian, etc.)
- **Greek** - Greek characters
- **Symbols** - Common symbols and punctuation

## Adding New Fonts

1. Place the font file in `assets/fonts/source/`
2. Add the font configuration to `src/config/fonts.ts`
3. Update the subsetting script configuration in `scripts/subset-fonts.js`
4. Run the subsetting pipeline to create optimized versions

## Font Loading

The application uses a custom font loading system with:

- **Lazy loading** - Fonts load on demand
- **Caching** - Loaded fonts are cached for performance
- **Progress tracking** - Monitor font loading progress
- **Fallback** - System fonts as fallback

See `src/hooks/useCustomFonts.ts` for usage details.
