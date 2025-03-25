# Curalife Theme Performance Optimization Plan

## Executive Summary

A Lighthouse performance audit of the Curalife Theme has identified several critical issues affecting site speed and user experience. The site currently scores **0.05/1.0 on performance** (target: 0.8), with all Core Web Vitals failing Google's recommended thresholds.

### Current Performance Metrics

| Metric                         | Current Value | Target  | Status      |
| ------------------------------ | ------------- | ------- | ----------- |
| Performance Score              | 0.05/1.0      | 0.8/1.0 | ❌ Critical |
| Largest Contentful Paint (LCP) | 9293ms        | ≤2500ms | ❌ Critical |
| Cumulative Layout Shift (CLS)  | 0.87          | ≤0.1    | ❌ Critical |
| Total Blocking Time (TBT)      | 801ms         | ≤300ms  | ❌ Critical |
| JavaScript Size                | 2.3MB         | ≤300KB  | ❌ Critical |
| CSS Size                       | 132KB         | ≤100KB  | ⚠️ Warning  |
| Third-party Resources          | 187           | ≤10     | ❌ Critical |

## Detailed Findings

### JavaScript Issues

- Total JS payload (2.3MB) is nearly 8x the recommended size
- Multiple render-blocking scripts in the `<head>`
- Unused JavaScript across multiple pages
- Inefficient loading of third-party scripts
- No code splitting or lazy loading implementation

### Resource Loading Problems

- Excessive third-party resources (187 total)
- Inefficient loading order of critical resources
- Missing resource hints (preconnect, prefetch, preload)
- No prioritization strategy for resource loading

### CSS Issues

- CSS not properly minified or optimized
- Redundant Tailwind utilities
- Missing Critical CSS implementation
- Unused CSS across different templates

### Image Optimization Gaps

- Inconsistent implementation of responsive images
- Missing explicit width/height attributes on some images
- No WebP format usage
- Inefficient lazy loading strategy

### Layout & Rendering Problems

- Layout shifts during page load (high CLS)
- Render-blocking resources in document head
- Long main-thread blocking tasks
- Inefficient Liquid template rendering

## Action Plan

### 1. JavaScript Optimization (Highest Priority)

#### 1.1 Code Splitting and Lazy Loading

- Implement dynamic imports for non-critical components
- Create page-specific bundles (product, collection, cart, etc.)
- Move all non-essential JavaScript to be loaded after page interactive

#### 1.2 Bundle Analysis and Optimization

- Identify and remove unused JavaScript
- Replace large libraries with smaller alternatives
- Minify and compress all JavaScript files

#### 1.3 Script Prioritization Implementation

- Create tiered loading strategy:
  - Critical: Only what's needed for first paint
  - High: Required for interactivity
  - Medium: Enhances user experience
  - Low: Analytics, marketing, etc.

#### 1.4 Third-Party Scripts Management

- Audit all third-party scripts
- Remove redundant/unused scripts
- Implement consent-based loading for non-essential scripts
- Self-host critical third-party code where possible

### 2. Resource Loading Optimization

#### 2.1 Resource Hints Implementation

- Add appropriate preconnect for critical domains
- Implement prefetch for likely user journeys
- Preload critical assets (fonts, hero images, critical CSS)

#### 2.2 Self-hosting Strategy

- Self-host Google Fonts
- Bundle small third-party utilities
- Create a CDN strategy for frequently used assets

#### 2.3 Loading Prioritization

- Prioritize above-the-fold content loading
- Defer below-the-fold resource loading
- Implement module/nomodule pattern for modern browsers

### 3. CSS Optimization

#### 3.1 Unused CSS Removal

- Implement PurgeCSS during build process
- Create template-specific CSS bundles
- Remove unused Tailwind utilities

#### 3.2 Critical CSS Implementation

- Extract and inline critical CSS for each template
- Defer non-critical CSS loading
- Implement progressive CSS loading

#### 3.3 CSS Minification and Compression

- Optimize CSS with cssnano
- Implement proper CSS caching strategy
- Reduce CSS specificity and complexity

### 4. Image Optimization

#### 4.1 Responsive Images Implementation

- Standardize responsive image component usage
- Ensure proper srcset and sizes attributes
- Implement picture element for art direction

#### 4.2 Modern Format Adoption

- Convert images to WebP with JPEG/PNG fallback
- Implement proper compression settings
- Consider AVIF for modern browsers

#### 4.3 Lazy Loading Enhancement

- Implement native lazy loading for below-fold images
- Preload LCP images
- Use appropriate loading="lazy" attributes

### 5. Core Web Vitals Optimization

#### 5.1 LCP Improvement (9293ms → 2500ms)

- Identify LCP element for each template
- Optimize and preload LCP element
- Remove render-blocking resources affecting LCP

#### 5.2 CLS Reduction (0.87 → 0.1)

- Set explicit dimensions on all images and media
- Reserve space for dynamic content (ads, embeds)
- Ensure fonts don't cause layout shifts

#### 5.3 TBT Minimization (801ms → 300ms)

- Break up long tasks into smaller chunks
- Defer non-critical JavaScript
- Use web workers for CPU-intensive tasks

### 6. Infrastructure and Tooling

#### 6.1 Build Process Enhancement

- Update Vite configuration for better optimization
- Implement modern/legacy bundle strategy
- Add bundle analyzer to CI/CD pipeline

#### 6.2 Monitoring Implementation

- Set up continuous Web Vitals monitoring
- Implement regular Lighthouse CI testing
- Create performance budgets and alerts

#### 6.3 Caching Strategy

- Implement effective browser caching
- Utilize Shopify's CDN effectively
- Set up service worker for assets caching

## Implementation Timeline

### Phase 1: Quick Wins (Week 1-2)

- Move third-party scripts to low priority
- Add explicit dimensions to all images
- Implement basic resource hints
- Remove render-blocking resources

### Phase 2: Core Optimizations (Week 3-4)

- Implement JavaScript code splitting
- Extract and inline critical CSS
- Optimize LCP elements
- Implement responsive images consistently

### Phase 3: Advanced Optimizations (Month 2)

- Convert images to WebP format
- Implement sophisticated lazy loading
- Create template-specific bundles
- Self-host critical third-party resources

### Phase 4: Monitoring & Refinement (Ongoing)

- Set up continuous performance monitoring
- Implement performance budgets
- Regular performance testing
- Iterate based on gathered metrics

## Expected Outcomes

By following this performance optimization plan, we expect:

1. **Performance Score**: Increase from 0.05 to 0.7+ (immediate goal), 0.8+ (long-term)
2. **LCP**: Reduce from 9293ms to under 2500ms
3. **CLS**: Reduce from 0.87 to under 0.1
4. **TBT**: Reduce from 801ms to under 300ms
5. **JavaScript Size**: Reduce from 2.3MB to under 500KB (immediate), 300KB (long-term)
6. **CSS Size**: Reduce from 132KB to under 100KB
7. **Third-party Resources**: Reduce from 187 to under 20 (immediate), 10 (long-term)

These improvements will result in:

- Faster page load times
- Better user experience
- Improved conversion rates
- Higher search engine rankings
- Reduced bounce rates

## Conclusion

This performance optimization plan addresses all critical issues identified in the Lighthouse audit. By focusing on the highest-impact changes first, we can significantly improve site performance while maintaining all functionality. Regular testing and monitoring will ensure that performance gains are maintained as the site evolves.

The implementation follows a phased approach, allowing for immediate improvements while building toward a comprehensive optimization. Each phase builds upon the previous, creating a sustainable performance strategy for the Curalife Theme.
