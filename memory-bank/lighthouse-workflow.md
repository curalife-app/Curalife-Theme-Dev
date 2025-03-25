# Lighthouse CI Workflow Documentation

## Overview

The Lighthouse CI workflow automates performance testing for the Curalife website using Google Lighthouse. It runs scheduled tests twice daily and generates comprehensive performance dashboards that are published to GitHub Pages. The workflow has been modularized for better maintainability and reusability.

## Workflow Structure

The workflow is structured into three main jobs:

1. **lighthouse-ci**: Runs Lighthouse tests on specified pages
2. **create-dashboard**: Processes results and generates dashboards
3. **deploy-pages**: Publishes results to GitHub Pages

Each job uses reusable composite actions to handle specific tasks, making the workflow more modular and maintainable.

## Composite Actions

### 1. Setup Environment (`setup-environment`)

This action prepares the testing environment by:

- Setting up Node.js
- Installing and caching system dependencies
- Installing Lighthouse CLI tools
- Configuring Chrome for headless testing

**Inputs:**

- `cache-key-prefix`: Prefix for system dependency cache keys
- `npm-cache-key`: Cache key for npm global packages
- `puppeteer-cache-key`: Cache key for Puppeteer (optional)
- `tools-cache-key`: Cache key for tools like jq and bc (optional)

### 2. Generate Dashboard (`generate-dashboard`)

This action processes Lighthouse results and generates HTML dashboards by:

- Collecting results from all tested pages
- Processing historical data for trending
- Generating HTML dashboards with current and historical performance data
- Creating GitHub step summaries with key metrics
- Adding PR annotations for performance issues
- Maintaining historical data in a dedicated branch

**Inputs:**

- `report-date`: Date for the report, used for organizing results
- `history-branch`: Git branch where historical data is stored

### 3. Prepare GitHub Pages (`prepare-github-pages`)

This action prepares files for GitHub Pages deployment by:

- Creating fallback content if tests fail
- Setting up .nojekyll file for proper GitHub Pages rendering
- Creating README and other helper files
- Ensuring proper navigation between dashboard pages

**Inputs:**

- `publish-dir`: Directory containing files to publish
- `repository`: Repository name for README generation

## Workflow Configuration

### Scheduled Runs

The workflow runs automatically:

- Daily at 8 AM
- Daily at 6 PM

It can also be triggered manually via the GitHub UI.

### Test Pages

Currently the workflow tests:

- Homepage: https://curalife.com/
- Product page: https://curalife.com/products/curalin

### Caching Strategy

The workflow uses GitHub Actions cache for:

- System dependencies
- Node.js packages
- Puppeteer browser
- Build tools

### Historical Data

Historical performance data is maintained in a dedicated branch (`lighthouse-history`) to track performance trends over time without cluttering the main repository.

## Dashboard Features

The generated dashboard includes:

- Current performance metrics for desktop and mobile
- Historical trend graphs
- Core Web Vitals status
- Detailed metrics for each tested page
- Links to full HTML reports

## Deployment

The dashboard is deployed to GitHub Pages automatically when tests complete on the main branch. It uses custom domain configuration for accessibility at lighthouse.curalife.com.

## Extensibility

To test additional pages:

1. Add new entries to the `page` matrix in the `lighthouse-ci` job
2. No other changes are needed as the workflow automatically processes all pages

## Troubleshooting

If tests fail or produce unexpected results:

- Check the workflow logs for specific error messages
- Verify the Lighthouse CI configuration
- Ensure the tested pages are accessible
- Check for JavaScript errors that might affect Lighthouse testing
