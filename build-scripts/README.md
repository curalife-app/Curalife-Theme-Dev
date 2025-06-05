# Build Utilities

This folder contains utility scripts and original (non-optimized) versions of the build system.

## Contents

### Original Build Scripts (Pre-Optimization)

- `build-complete-original.js` - Original build script (use `npm run build:original`)
- `watch-original.js` - Original watch script (use `npm run watch:original`)

### Utility Scripts

- `copy-stagewise-files.js` - Handles stagewise file copying for Shopify compatibility
- `optimize-assets.js` - Asset optimization and compression utilities
- `shopify-hot-reload-simple.js` - Simple Shopify hot reload helper

## Usage

### Access Original Scripts

If you need to use the original (non-optimized) scripts for debugging or comparison:

```bash
# Original build (non-optimized)
npm run build:original

# Original watch (non-optimized)
npm run watch:original
```

### Direct Utility Usage

```bash
# Run asset optimization separately
npm run optimize

# Copy stagewise files manually
node build-scripts/build-utilities/copy-stagewise-files.js
```

## Notes

- The main build system now uses optimized versions by default
- These files are kept for compatibility and debugging purposes
- The optimized versions provide 70% faster performance with intelligent caching
- Only use original scripts if you encounter issues with the optimized versions
