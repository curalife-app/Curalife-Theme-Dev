# Curalife Shopify Theme Development

[![Lighthouse CI](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml)

This repository contains the source code and development environment for the Curalife Shopify theme.

## Core Philosophy & Goals

- **Mobile-First:** Design and build with mobile devices as the primary consideration.
- **Progressive Enhancement:** Ensure core functionality works without JavaScript; enhance with JS.
- **Performance:** Prioritize fast loading times and adherence to Core Web Vitals.
- **Accessibility:** Strive for WCAG compliance.
- **Component-Based:** Build reusable Liquid snippets/sections and JavaScript modules.
- **Vanilla JS:** Prefer modern vanilla JavaScript over heavy frameworks.
- **Utility-First CSS:** Leverage Tailwind CSS for most styling.

## File Structure Overview

- **`src/`**: Contains all source code for the theme.
  - **`liquid/`**: Shopify Liquid files (layouts, sections, snippets, templates, etc.).
  - **`scripts/`**: JavaScript modules and entry points.
  - **`styles/`**: CSS source files, including the Tailwind CSS entry point (`tailwind.css`).
  - **`assets/`**: Static assets like icons (non-image).
  - **`images/`**: Image assets.
  - **`fonts/`**: Font files.
  - **`config/`**: Shopify settings (`settings_schema.json`, `settings_data.json`).
  - **`locales/`**: Shopify locale files.
- **`Curalife-Theme-Build/`**: **(Generated)** The output directory containing the production-ready, flattened Shopify theme structure. **This directory is targeted by Shopify CLI commands.**
- **`build-scripts/`**: Contains Node.js scripts managing the Vite build process, file watching, and asset handling (`build-complete.js`, `watch.js`).
- **`utility-scripts/`**: Contains various helper and maintenance scripts (e.g., finding unused files).
- **`testing/`**: Contains configurations and scripts for different types of testing.
  - **`lighthouse/`**: Lighthouse CI configuration (`lighthouserc.cjs`), performance budgets (`budgets.json` - note: budgets also defined inline in config), helper scripts (`check-server.js`, `performance-monitor.js`), and output directories (ignored by git).
  - **`visual-regression/`**: Files related to visual regression testing.
- **`linting/`**: Contains configuration and scripts for code linting and formatting (`ESLint`, `Prettier`, `Theme Check`).
- **Configuration Files (Root)**: `vite.config.js`, `tailwind.config.js`, `postcss.config.cjs`, `.eslintrc.js`, `.prettierrc`, `.theme-check.yml`, `package.json`, etc.

**Important:** The build process _flattens_ the nested structure within `src/liquid/` into the respective top-level directories (`snippets/`, `sections/`, etc.) inside `Curalife-Theme-Build/` as required by Shopify.

## Development Workflow

### Prerequisites

- Node.js (Check `.nvmrc` or `package.json` engine requirements)
- pnpm (`npm install -g pnpm`)
- Shopify CLI (`npm install -g @shopify/cli @shopify/theme`)

### Setup

1.  Clone the repository.
2.  Install dependencies: `pnpm install`
3.  Log in to Shopify CLI: `npm run shopify:login` (or `shopify auth login`)

### Local Development (Watch Mode + Shopify Dev Server)

This is the recommended workflow for local development:

1.  **Start the Vite Watcher:**

    ```bash
    npm run watch:shopify
    ```

    This command uses Vite to watch for changes in JS and CSS (with HMR) and copies changes in other files (`.liquid`, assets, etc.) from `src/` to `Curalife-Theme-Build/`.

2.  **Start the Shopify Dev Server:** In a **separate terminal**, run:

    ```bash
    npm run shopify:theme:dev
    ```

    This command starts the Shopify CLI dev server, pointing to the `Curalife-Theme-Build/` directory. It provides a local preview URL with live theme updates pushed from the build directory.

    _(Note: Changes made via `npm run watch:shopify` are copied to `Curalife-Theme-Build/`, and `shopify theme dev --path Curalife-Theme-Build` picks them up. Some changes, especially complex Liquid or schema updates, might occasionally require a manual browser refresh.)_

### Production Build

To create a production-ready build in `Curalife-Theme-Build/`:

```bash
npm run build
```

This runs `build-scripts/build-complete.js`, which handles Vite production build, file copying/flattening, and CSS minification.

### Linting

Run linters (ESLint, Theme Check) and the formatter (Prettier):

```bash
# Check for linting errors
npm run lint

# Attempt to automatically fix linting/formatting issues
npm run lint:fix
```

See [linting/README.md](./linting/README.md) for more details.

### Deployment

Deploy the production build to Shopify:

```bash
# Ensure you have run 'npm run build' first
npm run shopify:theme:push -- --allow-live # Add flags as needed, e.g., --theme <name>
```

## Lighthouse CI Integration

This project uses Lighthouse CI for continuous monitoring.

### Running Lighthouse Locally

Helper scripts are available in `testing/lighthouse/`.

```bash
# Run Lighthouse CI assertions locally (requires dev server running)
npm run lighthouse:ci

# Run desktop performance test via Lighthouse CLI with UI
npm run lighthouse:desktop

# Run mobile performance test via Lighthouse CLI with UI
npm run lighthouse:mobile

# Create baseline performance reports (outputs to testing/lighthouse/performance-reports/)
npm run performance:baseline

# Compare current against baseline (outputs to testing/lighthouse/performance-reports/)
npm run performance:compare

# (Optional) Run continuous performance monitoring script
npm run performance:monitor
```

### Configuration

- **Main Config:** `testing/lighthouse/lighthouserc.cjs` (used by `lighthouse:ci`)
- **Budgets:** Defined inline in `lighthouserc.cjs` and also present in `testing/lighthouse/budgets.json`.
- **CI Workflow:** Defined in `.github/workflows/lighthouse-ci.yml`.

### CI Pipeline & Thresholds

The GitHub Actions workflow runs Lighthouse, compares against budgets/thresholds defined in the config, posts results to PRs, and deploys a report dashboard to GitHub Pages. Key default thresholds (check config for specifics):

- Performance: >= 65
- Accessibility: >= 80
- Best Practices: >= 85
- SEO: >= 85
- Core Web Vitals (FCP < 2.5s, LCP < 3s, CLS < 0.1, TBT < 500ms, TTI < 4s)

## Legacy Theme Development Docs

For potentially outdated theme development instructions, see [SHOPIFY-SIMPLE.md](./SHOPIFY-SIMPLE.md). _(Review and update/remove this if necessary)_
