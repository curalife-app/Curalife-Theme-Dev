# Curalife Theme Linting Tools

This directory contains simplified linting and code quality tools for the Curalife Theme project. The linting system uses a unified approach to maintain consistent code quality across JavaScript and Liquid files.

## Available Tools

### Unified Linting Script

- **lint.js** - Main entry point for all linting operations

```bash
node linting/lint.js [options] [files]
```

Options:

- `--fix` - Fix issues where possible
- `--help` - Show help message

### Core Tools

- **analyze-liquid-js.js** - Analyzes JavaScript in Liquid files with detailed reporting
- **add-eslint-comments.js** - Adds ESLint disable comments to JavaScript in Liquid files (optional helper)

### Configuration Files

- **.eslintrc.js** - Main ESLint configuration for JavaScript
- **.eslintrc.cjs** - CommonJS version of ESLint configuration

## How It Works

The linting system works in two parts:

1. **JavaScript Files**: Regular ESLint is used to check JavaScript files in the src/js directory.
2. **Liquid Files**: The analyze-liquid-js.js script extracts and analyzes JavaScript from Liquid files.

The unified linting script automatically detects file types and applies the appropriate linting method.

## Examples

### Lint All Files

```bash
node linting/lint.js
```

### Lint a Specific File

```bash
node linting/lint.js src/liquid/snippets/pages/product/buy-box-subscription-5.liquid
```

### Fix Issues Where Possible

```bash
node linting/lint.js --fix
```

### Add ESLint Disable Comments to a Liquid File

If you have complex Liquid templates with JavaScript that's difficult to lint, you can use:

```bash
node linting/add-eslint-comments.js src/liquid/snippets/pages/product/buy-box-subscription-5.liquid
```

## Integration with Theme Development Workflow

These linting tools are designed to work alongside the theme development process. It's recommended to run linting checks before committing changes to ensure code quality and consistency.

### Using npm Scripts

The package.json includes simplified scripts for running the linting tools:

```bash
npm run lint          # Lint all files
npm run lint:fix      # Lint all files and fix issues where possible
npm run analyze:liquid path/to/file.liquid  # Analyze a specific Liquid file
```
