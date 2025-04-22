# Visual Testing Platform

A comprehensive visual regression testing platform for Shopify themes that helps you detect component changes and prevent unintended side effects on other pages.

## Purpose

This platform addresses a common problem in theme development: making changes to a reusable component can inadvertently affect other pages that use the same component. The Visual Testing Platform helps you:

1. Track component usage across all pages
2. Detect which components have changed
3. Identify pages affected by those changes
4. Perform visual regression testing to catch unintended side effects
5. Generate reports to assess the impact of changes

## Directory Structure

```
visual-testing-platform/
├── scripts/                     # Core testing scripts
│   ├── component-registry.js    # Analyzes component usage
│   ├── detect-component-changes.js  # Detects changes between versions
│   ├── visual-regression-testing.js # Takes screenshots and compares
│   └── pre-build-test.js        # Orchestrates the testing workflow
│
├── reports/                     # Generated reports
│   ├── component-registry.json  # Component usage data
│   └── component-changes-*.html # Change analysis reports
│
├── baseline/                    # Baseline screenshots
│   ├── mobile/                  # Mobile viewport baselines
│   ├── tablet/                  # Tablet viewport baselines
│   └── desktop/                 # Desktop viewport baselines
│
├── results/                     # Current test screenshots
│   ├── mobile/                  # Mobile viewport screenshots
│   ├── tablet/                  # Tablet viewport screenshots
│   ├── desktop/                 # Desktop viewport screenshots
│   └── regression-report.html   # Visual test results report
│
├── diffs/                       # Difference images
│   ├── mobile/                  # Mobile viewport differences
│   ├── tablet/                  # Tablet viewport differences
│   └── desktop/                 # Desktop viewport differences
│
├── history/                     # Component history data
│   └── component-hashes.json    # Previous component hashes
│
└── README.md                    # This documentation
```

## Setup

1. **Prerequisites**

   - Node.js (v14+)
   - npm or pnpm
   - Puppeteer dependencies (if not automatically installed)

2. **Installation**

   ```bash
   # From your theme directory
   cd visual-testing-platform
   npm install puppeteer pixelmatch pngjs chalk glob
   ```

3. **Configuration**
   - Update the `shopifyUrl` in `scripts/visual-regression-testing.js` to point to your development or staging store

## Usage

### Basic Commands

From the parent directory (your Shopify theme root):

```bash
# Build the component registry (analyzes all components and their usage)
node visual-testing-platform/scripts/component-registry.js

# Detect changes to components (identifies what changed and what pages are affected)
node visual-testing-platform/scripts/detect-component-changes.js

# Run visual regression tests on all pages
node visual-testing-platform/scripts/visual-regression-testing.js

# Run visual regression tests only on pages with changed components
node visual-testing-platform/scripts/visual-regression-testing.js --only-changed

# Update the baseline screenshots (after making intentional visual changes)
node visual-testing-platform/scripts/visual-regression-testing.js --update-baselines

# Run the complete pre-build validation workflow (with interactive prompts)
node visual-testing-platform/scripts/pre-build-test.js
```

### Adding to Your Build Process

Integrate the testing platform into your build process by adding these scripts to your theme's `package.json`:

```json
{
	"scripts": {
		"component:registry": "node visual-testing-platform/scripts/component-registry.js",
		"component:detect-changes": "node visual-testing-platform/scripts/detect-component-changes.js",
		"component:test": "node visual-testing-platform/scripts/visual-regression-testing.js",
		"component:test:changed": "node visual-testing-platform/scripts/visual-regression-testing.js --only-changed",
		"component:test:update": "node visual-testing-platform/scripts/visual-regression-testing.js --update-baselines",
		"component:validate": "node visual-testing-platform/scripts/pre-build-test.js",
		"build:safe": "node visual-testing-platform/scripts/pre-build-test.js && npm run build"
	}
}
```

## Workflow for Safe Component Changes

Follow this workflow to make changes to components without breaking other pages:

1. **Before making changes**

   ```bash
   npm run component:registry
   ```

   This establishes the baseline state of components.

2. **Make your component changes**
   Edit your component files as needed.

3. **Detect changes and assess impact**

   ```bash
   npm run component:detect-changes
   ```

   This generates a report showing which pages might be affected by your changes.

4. **Test impacted pages**

   ```bash
   npm run component:test:changed
   ```

   This takes screenshots of the impacted pages and compares them to the baseline.

5. **Review the test results**
   Open the generated report in the `visual-testing-platform/results/` directory.

6. **If problems are found:**

   - Adjust your component changes
   - Rerun the tests
   - Or implement one of the component versioning strategies

7. **When ready to build:**
   ```bash
   npm run build:safe
   ```
   This validates the changes one more time before building.

## Best Practices

### 1. Establish a Good Baseline

Before making changes, ensure you have a complete and up-to-date baseline of screenshots:

```bash
npm run component:registry
npm run component:test
npm run component:test:update
```

### 2. Component Versioning

When making significant changes to components that are used across multiple pages, consider:

- Creating a new version of the component
- Using feature flags to control changes
- Making components context-aware

### 3. CI/CD Integration

Integrate visual regression tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
jobs:
  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - name: Install dependencies
        run: npm ci
      - name: Analyze component changes
        run: npm run component:detect-changes
      - name: Run visual regression tests
        run: npm run component:test:changed
```

## Troubleshooting

### Common Issues

1. **"Failed to launch browser"**: Ensure you have all the Puppeteer dependencies installed on your system.

2. **"Size mismatch" errors**: This can happen when page sizes change drastically. Try:

   ```bash
   npm run component:test:update
   ```

3. **False positives**: If you're getting differences due to dynamic content:
   - Adjust the `diffThreshold` in the configuration
   - Implement mechanisms to stabilize dynamic content during testing

## Contributing

Contributions are welcome! Here are some areas for improvement:

- Adding support for component-specific testing
- Implementing DOM-based component isolation testing
- Adding support for interaction testing
- Optimizing screenshot capture performance

## License

MIT
