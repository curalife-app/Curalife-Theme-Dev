# Curalife Theme Development

[![Lighthouse CI](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml)

## Lighthouse CI Integration

This project uses Lighthouse CI to continuously monitor and improve performance, accessibility, best practices, and SEO scores. The automated workflow runs on every push to the main branch and pull requests.

### Features

- **Automated Testing**: Runs Lighthouse audits on key pages using the official Lighthouse CI Action
- **Performance Budgeting**: Sets resource size and count limits to prevent performance regressions
- **Assertions**: Enforces minimum score thresholds for all Lighthouse categories
- **Multiple Environments**: Tests both desktop and mobile configurations
- **PR Comments**: Adds detailed performance feedback directly in pull requests
- **Visual Comparison**: Shows visual differences between PR and main branch
- **Attractive Dashboard**: Publishes styled results to GitHub Pages

### Running Lighthouse Locally

```bash
# Run Lighthouse CI locally
npm run lighthouse:ci

# Run desktop performance test with UI
npm run lighthouse:desktop

# Run mobile performance test with UI
npm run lighthouse:mobile

# Create baseline performance reports
npm run performance:baseline

# Compare current against baseline
npm run performance:compare

# Run continuous performance monitoring
npm run performance:monitor
```

### CI Pipeline

The GitHub Actions workflow:

1. Runs Lighthouse in both desktop and mobile configurations with 3 runs per page
2. Tests against performance budgets defined in `budgets.json`
3. Uses separate device-specific configuration files to ensure proper emulation
4. Posts detailed results as PR comments with score comparisons
5. Creates a visual dashboard with structured report organization
6. Deploys results to GitHub Pages for historical tracking

### Performance Thresholds

Performance thresholds are configured in our Lighthouse configurations:

- Performance: Minimum score of 65
- Accessibility: Minimum score of 80
- Best Practices: Minimum score of 85
- SEO: Minimum score of 85

Core Web Vitals thresholds:

- First Contentful Paint: < 2.5s
- Largest Contentful Paint: < 3s
- Cumulative Layout Shift: < 0.1
- Total Blocking Time: < 500ms
- Time to Interactive: < 4s

### Best Practices Implemented

- Multiple runs (3) to reduce variability in results
- DevTools throttling for more consistent measurements
- Proper Chrome flags for CI environment stability
- Separate configuration files for desktop and mobile
- Explicit screen emulation settings to prevent conflicts
- Visual PR comments for better developer feedback
- Branch comparison to catch performance regressions
- Mobile and desktop testing for comprehensive coverage

### Configuration

The Lighthouse CI setup consists of three main files:

1. `lighthouserc-desktop.json` - Controls Lighthouse settings for desktop tests
2. `lighthouserc-mobile.json` - Controls Lighthouse settings for mobile tests
3. `budgets.json` - Defines resource budgets for performance monitoring

## Theme Development

For theme development instructions, see [SHOPIFY-SIMPLE.md](./SHOPIFY-SIMPLE.md).

## Linting Tools

The project includes a simplified and unified linting system for JavaScript and Liquid files, organized in the `linting/` directory. This system automatically detects file types and applies the appropriate linting method.

### Available Scripts

```bash
# Lint all files
npm run lint

# Lint with auto-fixing where possible
npm run lint:fix

# Analyze JavaScript in a specific Liquid file
npm run analyze:liquid path/to/file.liquid

# Add ESLint disable comments to a Liquid file (for complex templates)
npm run eslint:add-comments path/to/file.liquid
```

For detailed documentation on the linting tools and configuration, see [linting/README.md](./linting/README.md).
