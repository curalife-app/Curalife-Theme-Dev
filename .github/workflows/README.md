# Testing Lighthouse CI Workflow Locally

This directory contains tools to test the Lighthouse CI GitHub workflow locally without needing to push to GitHub.

## Prerequisites

- Node.js (v14 or newer)
- npm
- Chrome browser

## Windows Testing

We have a dedicated PowerShell script for Windows users that makes the local testing process straightforward.

### Running the PowerShell Script

1. Open PowerShell
2. Navigate to the project root directory
3. Run the script:

```powershell
.\.github\workflows\scripts\test-lighthouse-locally.ps1
```

The script will:

1. Install any necessary dependencies (Lighthouse CI, Puppeteer) if they're not already installed
2. Create a directory for test results (`lighthouse-local-tests`)
3. Run Lighthouse tests for configured URLs (homepage and product page)
4. Generate HTML reports and a dashboard
5. Display a summary of the results

When finished, open the dashboard:

```powershell
Invoke-Item .\lighthouse-local-tests\performance-reports\index.html
```

## Node.js Testing (Cross-platform)

For users who prefer to use Node.js directly or are on Linux/macOS:

```bash
# Make sure the script is executable (Linux/macOS)
chmod +x .github/workflows/scripts/test-lighthouse-locally.js

# Run the script
node .github/workflows/scripts/test-lighthouse-locally.js
```

## Customizing Tests

To test different URLs, edit the URL configurations in the respective scripts:

- PowerShell: Edit the `$pages` array in `.github/workflows/scripts/test-lighthouse-locally.ps1`
- Node.js: Edit the `pages` array in `.github/workflows/scripts/test-lighthouse-locally.js`

## Comparing with GitHub Actions

The local tests are designed to simulate the GitHub Actions workflow as closely as possible. However, there are some differences:

1. Environment: Local tests run in your environment, while GitHub Actions uses Ubuntu runners
2. Chrome version: Your local Chrome version may differ from the one used in GitHub Actions
3. Network conditions: Local network conditions may vary from GitHub's infrastructure

## Troubleshooting

If you encounter any issues:

1. Make sure Chrome is installed
2. Check that Node.js and npm are up to date
3. If Chrome fails to launch, try running with `--no-sandbox` (already included in the scripts)
4. For connection issues, check your internet connectivity or try a different URL

## Notes

- The scripts generate HTML reports in the `lighthouse-local-tests/performance-reports` directory
- Raw Lighthouse results are stored in page-specific directories
- You can reference these results when debugging performance issues
