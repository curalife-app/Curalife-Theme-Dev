# Curalife Theme Development

[![Lighthouse CI](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml)

## Lighthouse CI Integration

This project uses Lighthouse CI to continuously monitor and improve performance, accessibility, best practices, and SEO scores. The automated workflow runs on every push to the main branch and pull requests.

### Features

- **Automated Testing**: Runs Lighthouse audits on key pages
- **Performance Monitoring**: Tracks critical metrics over time
- **PR Comments**: Adds performance results directly to pull requests
- **GitHub Actions Integration**: Fully automated workflow

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

1. Builds the theme
2. Starts a local development server
3. Runs Lighthouse CI with configurations from `lighthouserc.cjs`
4. Posts results as PR comments and summary
5. Stores reports as artifacts

### Performance Budget

Performance budgets are configured in `lighthouserc.cjs` to ensure the theme maintains high-quality standards:

- Performance: Minimum score of 80
- Accessibility: Minimum score of 90
- Best Practices: Minimum score of 90
- SEO: Minimum score of 90

### Configuration

The Lighthouse CI configuration is stored in `lighthouserc.cjs` and can be customized to adjust:

- Pages to test
- Performance thresholds
- Resource budgets
- Testing environment

## Theme Development

For theme development instructions, see [SHOPIFY-SIMPLE.md](./SHOPIFY-SIMPLE.md).
