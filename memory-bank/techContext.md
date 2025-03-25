# Technical Context

## Technologies Used

### Core Technologies

- **Shopify Liquid**: Templating language for rendering the theme's HTML
- **JavaScript (ES6+)**: Client-side functionality and interactivity
- **Tailwind CSS v4**: Utility-first CSS framework for styling
- **Vite**: Modern build tool for frontend assets
- **Node.js**: Runtime environment for build scripts and tools

### Build & Development Tools

- **PostCSS**: CSS processing and transformation
- **Autoprefixer**: Automated vendor prefixing for CSS
- **cssnano**: CSS minification and optimization
- **Chokidar**: File watching for development
- **Shopify CLI**: Official tool for Shopify theme development
- **Custom Scripts**: Project-specific scripts for file watching and hot reloading

### Integrations

- **Shopify Theme API**: Integration with Shopify's theme preview and customization
- **Shopify Cart API**: AJAX cart functionality
- **Shopify Customer API**: User account management
- **Third-party Services**: Integration with external analytics and marketing tools

## Development Setup

### Prerequisites

- Node.js (v16+)
- pnpm (v10.4.1+)
- Shopify CLI or Shopify Theme Kit
- Shopify Partner account with store access

### Installation Steps

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Authenticate with Shopify using `npm run shopify:login`
4. Configure development environment settings

### Environment Configuration

- Shopify store URL configuration (production, staging, development)
- Local development preferences
- Build optimization settings
- Debugging flags

### Development Workflow

```
┌─────────────────┐
│ Local Changes   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ File Watchers   │───▶│ Vite Build      │
└────────┬────────┘    └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Hot Reload      │    │ Build Directory │
└────────┬────────┘    └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────┐
│ Shopify Theme Preview                   │
└─────────────────────────────────────────┘
```

### Available Commands

- `npm run dev`: Start Vite development server
- `npm run build`: Build production-ready theme files
- `npm run watch`: Watch for changes and rebuild
- `npm run shopify`: Start simplified Shopify integration with hot reload
- `npm run shopify:vite`: Start advanced Shopify integration with Vite
- `npm run shopify:login`: Authenticate with Shopify CLI
- `npm run shopify:theme:list`: List available themes
- `npm run shopify:theme:push`: Push local theme to Shopify
- `npm run shopify:theme:pull`: Pull theme from Shopify to local
- `npm run shopify:theme:dev`: Start the Shopify theme development server

## Technical Constraints

### Shopify Platform Limitations

- **Liquid Templating**: Limited programming capabilities compared to full programming languages
- **Theme Structure**: Required to follow Shopify's prescribed directory structure
- **API Limitations**: Restricted access to certain Shopify data and functionality
- **Customization Boundaries**: Certain aspects of checkout and account pages cannot be customized
- **Section Restrictions**: Some sections can only be used on specific page types

### Performance Considerations

- **Asset Size Limits**: Keeping JavaScript and CSS bundles small for fast loading
- **Image Optimization**: Balancing image quality with file size
- **Third-party Script Management**: Controlling the impact of external scripts
- **Mobile Performance**: Ensuring smooth experience on lower-powered devices
- **Load Time Targets**: Maintaining sub-2-second initial load times

### Browser Support

- **Modern Browsers**: Full support for Chrome, Firefox, Safari, Edge (latest versions)
- **Legacy Support**: Graceful degradation for older browsers
- **Mobile Browsers**: Optimized for iOS Safari and Android Chrome

### Security Requirements

- **Content Security Policy**: Implementation of appropriate CSP headers
- **Secure Authentication**: Following security best practices for user authentication
- **Data Protection**: Proper handling of customer data
- **XSS Prevention**: Sanitizing user inputs and outputs

## Dependencies

### Production Dependencies

- `@tailwindcss/cli`: Command-line interface for Tailwind CSS
- `@tailwindcss/postcss`: PostCSS integration for Tailwind
- `cssnano`: CSS minification toolkit
- `tailwindcss`: Utility-first CSS framework
- Various utility packages for file operations and configuration

### Development Dependencies

- `@fullhuman/postcss-purgecss`: CSS tree-shaking for production builds
- `@shopify/prettier-plugin-liquid`: Prettier formatting for Liquid templates
- `@shopify/themekit`: Alternative Shopify theme development tool
- `@tailwindcss/vite`: Vite plugin for Tailwind CSS
- `autoprefixer`: Adds vendor prefixes to CSS
- `chalk`: Terminal string styling
- `chokidar`: File watching library
- `cross-env`: Cross-platform environment variables
- `postcss`: CSS transformation tool
- `postcss-import`: PostCSS plugin for importing CSS
- `postcss-nesting`: PostCSS plugin for nested CSS
- `prettier`: Code formatter
- `sass`: CSS preprocessor
- `vite`: Build tool and development server
- `vite-plugin-static-copy`: Vite plugin for copying static assets

### Version Management

- Package manager: pnpm v10.4.1
- Dependency versions are locked for stability
- Regular updates for security patches and important features

### Dependency Graph Overview

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Application │─────▶│ Tailwind CSS │─────▶│ PostCSS     │
└─────────────┘      └─────────────┘      └─────────────┘
       │                                         ▲
       │                                         │
       ▼                                         │
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Vite        │─────▶│ Build Tools │─────▶│ Optimization │
└─────────────┘      └─────────────┘      └─────────────┘
       │                    ▲
       │                    │
       ▼                    │
┌─────────────┐      ┌─────────────┐
│ Development │─────▶│ Shopify     │
│ Server      │      │ Integration │
└─────────────┘      └─────────────┘
```

# Lighthouse CI Technical Context

## Technologies Used

### Core Technologies

- **GitHub Actions**: Workflow automation platform
- **Google Lighthouse**: Web performance testing tool
- **Node.js**: JavaScript runtime for running Lighthouse CLI
- **Bash Scripting**: Used for result processing and automation
- **HTML/CSS/JavaScript**: Dashboard generation

### GitHub Actions Components

- **Composite Actions**: Reusable modular workflow components
- **Scheduled Triggers**: Automated testing at specified intervals
- **Artifact Storage**: Storing Lighthouse reports between jobs
- **GitHub Pages**: Hosting performance dashboards
- **Caching**: Optimizing workflow execution time

### Tools & Utilities

- **Lighthouse CI**: CLI tools for running Lighthouse in CI
- **puppeteer**: Headless Chrome browser for testing
- **jq**: Command-line JSON processor for results parsing
- **bc**: Basic calculator for metric computation
- **sed/grep**: Text processing for report generation

## Technical Architecture

The workflow consists of three main components that work together:

1. **Test Runner**:

   - Uses Lighthouse CLI to test specified URLs
   - Captures performance metrics, accessibility, best practices, and SEO scores
   - Generates raw JSON results for each page

2. **Processor & Dashboard Generator**:

   - Combines results from multiple pages
   - Processes raw data into meaningful metrics
   - Generates HTML dashboards with visualizations
   - Creates historical data storage

3. **Deployment System**:
   - Prepares files for GitHub Pages
   - Publishes dashboard to custom domain
   - Creates versioned historical data

## Data Flow

```
[Scheduled Trigger] → [Setup Environment] → [Run Lighthouse Tests] → [Process Results]
                                                                         ↓
[GitHub Pages Deployment] ← [Prepare Files] ← [Generate Dashboard] ← [Combine Results]
```

## Development Setup

The workflow is designed to run in GitHub Actions without local development requirements. However, for local testing:

1. Install Node.js 18+
2. Install Lighthouse CLI: `npm install -g @lhci/cli`
3. Run tests manually: `lhci collect --url=https://example.com`

## Configuration Options

Configuration is maintained through:

1. **Environment Variables**: Define branch names and cache keys
2. **Matrix Strategy**: Define pages to test
3. **Action Inputs**: Configure the reusable actions
4. **Script Parameters**: Control behavior of processing scripts

## Integration Points

The workflow integrates with several GitHub systems:

1. **GitHub Actions Runner**: Executes the workflow
2. **GitHub Artifacts**: Stores test results
3. **GitHub Pages**: Hosts the dashboard
4. **GitHub Step Summary**: Displays results in workflow UI
5. **Pull Request Annotations**: Provides feedback on PR changes

## Technical Constraints

- **GitHub Actions Minutes**: Limited by account tier
- **Artifact Storage**: Limited by repository settings
- **GitHub Pages Size**: Must keep dashboard size reasonable
- **External Dependencies**: Relies on Lighthouse and website availability

## Technical Debt & Future Improvements

1. **Parallel Testing**: Improve speed by testing more pages in parallel
2. **Custom Metrics**: Add support for user-defined performance metrics
3. **Automated Alerts**: Add notification system for performance regressions
4. **Integration Tests**: Add tests for the workflow itself
5. **A/B Testing**: Compare performance between branches or environments
