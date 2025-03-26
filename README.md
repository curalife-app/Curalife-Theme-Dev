# Curalife Theme Development

[![Lighthouse CI](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml)

## Lighthouse CI Integration

This project uses Lighthouse CI to continuously monitor and improve performance, accessibility, best practices, and SEO scores. The automated workflow runs on every push to the main branch and pull requests.

### Features

- **Automated Testing**: Runs Lighthouse audits on key pages using the official Lighthouse CI Action
- **Performance Budgeting**: Sets resource size and count limits to prevent performance regressions
- **Assertions**: Enforces minimum score thresholds for all Lighthouse categories
- **Multiple Environments**: Tests both desktop and mobile configurations
- **GitHub Pages Integration**: Publishes detailed reports to GitHub Pages
- **PR Integration**: Adds performance results directly to pull requests

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

1. Runs Lighthouse in both desktop and mobile configurations
2. Tests against performance budgets defined in `lighthouserc.json`
3. Publishes detailed results to GitHub Pages
4. Creates a performance dashboard with historical data
5. Produces GitHub Action summaries with key metrics

### Performance Thresholds

Performance thresholds are configured in `lighthouserc.json`:

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

### Configuration

The Lighthouse CI configuration is stored in `lighthouserc.json` and includes:

- Pages to test
- Performance thresholds
- Resource budgets
- Audit configurations
- Upload destinations

## Theme Development

For theme development instructions, see [SHOPIFY-SIMPLE.md](./SHOPIFY-SIMPLE.md).
