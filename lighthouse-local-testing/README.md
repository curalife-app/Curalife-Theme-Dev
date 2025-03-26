# Lighthouse CI Local Testing

This tool allows you to run Lighthouse CI tests locally instead of relying on GitHub Actions. It follows a similar configuration to the GitHub workflow and generates HTML reports similar to those produced by the workflow.

## Features

- Run Lighthouse CI tests locally on multiple URLs
- Test in both desktop and mobile configurations
- Generate HTML reports and dashboards
- Similar configuration to the GitHub workflow

## Setup

1. Make sure you have Node.js installed (v16 or newer recommended)
2. Install dependencies:
   ```
   npm install
   ```

## Running Tests

To run all Lighthouse tests:

```
npm test
```

This will:

1. Run Lighthouse CI on the configured URLs
2. Run tests for both desktop and mobile
3. Save raw results in the `lighthouse-results` directory
4. Display a summary of the results in the console

## Generating Reports

After running tests, generate HTML reports:

```
npm run report
```

This will:

1. Parse the Lighthouse results
2. Generate HTML reports for each page and device type
3. Create a dashboard at `performance-reports/index.html`

## Running Everything

To run tests and generate reports in one command:

```
npm run run-all
```

## Viewing Reports

To open the HTML dashboard in your default browser:

```
npm run open-report
```

## Customizing

### Adding URLs to Test

Edit the `testUrls` array in `run-tests.js` to add or change the URLs to test.

### Changing Test Configuration

Edit the `lighthouserc.js` file to change the Lighthouse CI configuration. You can modify:

- Number of test runs
- Chrome flags
- Performance categories to test
- And more

## Comparing to GitHub Workflow

This local testing environment mimics the functionality of the GitHub workflow but runs entirely on your local machine. The main differences are:

1. No integration with GitHub Pages for report hosting
2. No historical data tracking
3. Simplified dashboard without trend charts
4. No specific GitHub environment setup

## Troubleshooting

- If Chrome fails to start, check that you have Chrome installed and try running with `--no-sandbox` flag
- If Puppeteer has issues, you may need to install Chrome separately or update the Puppeteer version
- For performance issues on a slow machine, try reducing the number of runs or testing one URL at a time
