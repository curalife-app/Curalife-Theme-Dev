# Active Context

## Current Work Focus

The current development focus is on enhancing the Shopify theme's development workflow with optimized build processes and hot reloading capabilities. Specific areas include:

1. **Build Process Enhancement**: Implementing Vite for faster build times and modern JavaScript processing, replacing older webpack-based approaches.

2. **Development Workflow**: Creating a seamless development environment with file watching and auto-reloading for rapid iteration.

3. **Shopify Integration**: Establishing reliable connections between local development and Shopify's theme preview functionality.

4. **CSS Framework Implementation**: Leveraging Tailwind CSS for consistent styling across the theme.

5. **Performance Optimization**: Identifying and resolving performance bottlenecks in the theme's rendering and loading processes.

## Recent Changes

### Development Environment

- Migrated from webpack to Vite for improved build performance and developer experience
- Implemented file watching and hot-reloading with custom scripts (watch.js, shopify-hot-reload-simple.js)
- Added support for multiple Shopify store environments (production, staging, development)
- Configured Tailwind CSS v4 with optimized settings for the theme

### Theme Architecture

- Restructured theme files to follow Shopify's recommended organization (layouts, sections, snippets)
- Added modular section-based architecture for easier customization in the Shopify admin
- Implemented responsive design foundations with mobile-first approach

### Performance Improvements

- Optimized asset loading with preloading and deferred script loading
- Implemented CSS minification and optimization in the build process
- Added image optimization workflows

## Next Steps

### Short-term Tasks

1. Complete the hot reloading functionality for all file types
2. Finalize the cart drawer implementation
3. Optimize product page layout and functionality
4. Update global header and footer components
5. Implement responsive navigation for mobile devices

### Medium-term Goals

1. Create comprehensive documentation for theme customization
2. Develop reusable components for marketing landing pages
3. Implement advanced product filtering and sorting
4. Integrate customer reviews and testimonials system
5. Optimize checkout flow and upsell opportunities

### Long-term Vision

1. Implement personalization features based on user behavior
2. Create A/B testing infrastructure for marketing experiments
3. Develop performance monitoring and analytics dashboard
4. Build multi-language support for international markets
5. Create specialized landing page templates for campaigns

## Active Decisions and Considerations

### Technical Decisions

- **Build Tool**: Using Vite over webpack for faster builds and better developer experience
- **CSS Framework**: Tailwind CSS chosen for rapid development and consistency
- **JavaScript Approach**: Using vanilla JS with modular organization instead of a framework
- **File Structure**: Implementing a clear separation between source and build directories
- **Deployment Process**: Using automatic builds with hot reloading during development

### Design Decisions

- **Mobile First**: Building with mobile-first approach for better responsive behavior
- **Component Library**: Creating a consistent set of UI components to be used across the site
- **Typography**: Implementing a clear typographic hierarchy for content readability
- **Color System**: Defining a flexible color system that maintains brand consistency
- **Animation Strategy**: Using subtle animations to enhance user experience without sacrificing performance

### Process Considerations

- **Version Control**: Maintaining clear branching strategy with feature branches
- **Testing Strategy**: Implementing cross-browser and device testing procedures
- **Shopify Limitations**: Working within Shopify's platform constraints while maximizing customization
- **Performance Budgets**: Setting clear performance targets for page load times
- **Accessibility**: Ensuring WCAG compliance throughout development

### Current Challenges

- Optimizing the hot reload process for maximum developer efficiency
- Balancing rich media content with performance requirements
- Ensuring consistent behavior across multiple Shopify environments
- Managing the complexity of the cart and checkout experience
- Implementing dynamic content that works within Shopify's constraints

# Lighthouse CI Active Context

## Current Status

The Lighthouse CI workflow has been successfully modularized into three reusable components:

1. **setup-environment**: Manages dependencies and environment setup
2. **generate-dashboard**: Processes results and creates dashboards
3. **prepare-github-pages**: Prepares files for GitHub Pages deployment

This modularization improves maintainability and allows for easier updates to specific components.

## Recent Changes

- Converted monolithic workflow into reusable composite actions
- Standardized caching approach for better performance
- Improved date handling for report generation
- Created comprehensive documentation
- Fixed linter errors in workflow syntax

## Current Work Focus

The current focus is on ensuring the modularized workflow functions properly and maintaining the same functionality as the original workflow while providing:

- Better organization
- Clearer responsibility separation
- Improved maintainability
- Consistent error handling

## Key Decisions

### Modularization Strategy

We chose to create three composite actions based on distinct responsibilities:

1. **Environment Setup**: Isolated environment preparation to ensure consistent test conditions
2. **Report Generation**: Consolidated all reporting logic into a single action
3. **Deployment Preparation**: Separated GitHub Pages preparation from core testing logic

This approach allows each component to evolve independently and simplifies testing.

### Caching Approach

We standardized the caching strategy to use:

```yaml
SYSTEM_DEPS_CACHE_KEY: system-deps-${{ github.run_id }}
TOOLS_CACHE_KEY: tools-${{ github.run_id }}
NPM_GLOBAL_CACHE_KEY: npm-global-${{ github.run_id }}
PUPPETEER_CACHE_KEY: puppeteer-${{ github.run_id }}
GH_PAGES_CACHE_KEY: gh-pages-${{ github.run_id }}
```

This ensures consistent cache naming and simplifies cache invalidation.

### Date Handling

We simplified date handling by using the output from a dedicated step rather than complex inline expressions:

```yaml
- name: Get current date
  id: date
  run: echo "date=$(date +'%Y-%m-%d')" >> $GITHUB_OUTPUT

- name: Process reports
  with:
    report-date: ${{ needs.lighthouse-ci.outputs.report_date || steps.date.outputs.date }}
```

This improves readability and eliminates potential syntax errors.

## Next Steps

1. **Testing**: Verify the modularized workflow produces identical results to the original
2. **Documentation**: Complete documentation for each composite action
3. **Extension**: Consider adding additional test pages to the matrix
4. **Refinement**: Further optimize the caching strategy for workflow performance
5. **Metrics**: Evaluate adding additional performance metrics to track

## Active Considerations

- Should we add more pages to the testing matrix?
- Should we integrate performance budgets to automatically fail when metrics degrade?
- Should we add alert notifications for performance regressions?
- How can we better visualize historical trends in the dashboard?

## Current Challenges

- Ensuring backward compatibility with existing historical data
- Managing workflow run time as we add more pages to test
- Balancing comprehensive metrics with dashboard simplicity
- Maintaining reliability when testing production pages that may change
