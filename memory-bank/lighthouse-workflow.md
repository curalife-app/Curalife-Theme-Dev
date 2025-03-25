# Lighthouse CI Workflow Documentation

## Overview

The Lighthouse CI workflow automates performance testing for the Curalife website using Google Lighthouse. It runs scheduled tests twice daily and generates comprehensive performance dashboards that are published to GitHub Pages.

## Workflow Structure

The workflow is structured into four main jobs:

1. **lighthouse-desktop**: Runs Lighthouse tests on specified pages using desktop configuration
2. **lighthouse-mobile**: Runs Lighthouse tests on specified pages using mobile configuration
3. **process-and-generate**: Processes test results and generates dashboards and reports
4. **publish**: Publishes results to GitHub Pages

## Schedule and Triggers

The workflow runs on a schedule:

- Daily at 2:15 UTC
- Daily at 14:15 UTC

It can also be manually triggered via the GitHub Actions UI using `workflow_dispatch`.

## Test Pages

The workflow currently tests the following pages:

- Homepage: https://curalife.com/
- Product page: https://curalife.com/products/curalin

Each page is tested in both desktop and mobile configurations as separate jobs.

## Scripts Architecture

Instead of using composite actions, the workflow relies on a series of bash scripts located in `.github/workflows/scripts/`:

1. **run-lighthouse.sh**: Executes Lighthouse tests for a specific URL and device type
2. **process-results.sh**: Processes raw Lighthouse results into a standardized format
3. **store-historical-data.sh**: Maintains historical data for tracking performance over time
4. **generate-dashboard.sh**: Creates the main performance dashboard
5. **generate-trend-dashboard.sh**: Creates trend visualization dashboards
6. **generate-report-templates.sh**: Creates detailed HTML report pages for each test
7. **format-summary.sh**: Formats summary information for GitHub Actions summaries
8. **save-reports.sh**: Handles saving reports to appropriate locations

## Directory Structure

The workflow uses a well-defined directory structure:

```
lighthouse-results/
├── desktop/
│   ├── homepage/
│   └── product/
├── mobile/
│   ├── homepage/
│   └── product/
├── processed/
│   ├── homepage/
│   └── product/
├── historical/
└── dashboards/
```

- `desktop/` and `mobile/`: Store raw Lighthouse results by device type and page
- `processed/`: Contains processed results with extracted metrics
- `historical/`: Stores historical data for trend analysis
- `dashboards/`: Contains the final HTML dashboards published to GitHub Pages

## Fallback Mechanisms

The workflow includes robust fallback mechanisms:

- If Lighthouse tests fail, minimal fallback reports are generated
- If screenshot generation fails, placeholder images are used
- If no results are available, a basic dashboard is created indicating tests are in progress

## Results Artifacts

The workflow produces several artifacts that are uploaded to GitHub:

- `lighthouse-desktop-results-*`: Raw results from desktop tests
- `lighthouse-mobile-results-*`: Raw results from mobile tests
- `lighthouse-dashboards-complete`: All results, processed data, and dashboards
- `lighthouse-final-dashboards`: Just the dashboard files for deployment

## GitHub Pages Deployment

The final dashboards are published to GitHub Pages:

1. The workflow checks out the `gh-pages` branch
2. It downloads the dashboard artifacts
3. It commits and pushes the results to the `gh-pages` branch
4. GitHub Pages serves the content from this branch

## Error Handling

The workflow includes comprehensive error handling:

- Tests continue even if individual Lighthouse runs fail
- Fallback content is generated for any missing results
- The publish step will still run even if some earlier steps fail partially

## Dashboard Features

The generated dashboards include:

- Current performance metrics for desktop and mobile
- Historical trend graphs for Core Web Vitals
- Detailed metrics for each tested page
- Direct links to full Lighthouse HTML reports
- Screenshot comparisons between desktop and mobile

## Extending the Workflow

To test additional pages:

1. Add new entries to the `page` matrix in both `lighthouse-desktop` and `lighthouse-mobile` jobs
2. No other changes are required as the processing scripts will automatically handle all pages defined in the matrix

## Performance Metrics Tracked

The workflow tracks all standard Lighthouse metrics including:

- Performance Score
- Accessibility Score
- Best Practices Score
- SEO Score
- Core Web Vitals (LCP, CLS, FID/TBT)
- First Contentful Paint
- Speed Index
- Time to Interactive
- Total Blocking Time
