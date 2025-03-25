# System Patterns

## System Architecture

The Curalife Theme uses a modern architecture that combines Shopify's theme structure with custom build and development processes:

### Core Architecture Components

```
┌─────────────────────────┐     ┌─────────────────────────┐
│ Source Files (src/)     │     │ Build Output            │
│                         │     │                         │
│ ├── liquid/             │     │ ├── assets/            │
│ │   ├── layout/         │     │ ├── config/            │
│ │   ├── sections/       │     │ ├── layout/            │
│ │   ├── snippets/       │     │ ├── locales/           │
│ │   └── blocks/         │     │ ├── sections/          │
│ │                       │     │ ├── snippets/          │
│ ├── styles/             │     │ └── templates/         │
│ │   ├── css/            │     │                         │
│ │   └── tailwind.css    │     │                         │
│ │                       │     │                         │
│ ├── scripts/            │     │                         │
│ ├── assets/             │     │                         │
│ ├── images/             │     │                         │
│ └── fonts/              │     │                         │
└─────────────────────────┘     └─────────────────────────┘
          │                               ▲
          │                               │
          │        ┌─────────────────────┐
          └───────▶│ Build Process       │
                   │ (Vite)              │
                   └─────────────────────┘
                             │
                             ▼
                   ┌─────────────────────┐
                   │ Development Tools   │
                   │                     │
                   │ ├── Hot Reload      │
                   │ ├── File Watching   │
                   │ └── Shopify Preview │
                   └─────────────────────┘
```

### Key Components

1. **Source Files**: Organized in a structured directory that separates concerns by file type and function
2. **Build Process**: Vite-based compilation and optimization pipeline
3. **Development Workflow**: Custom scripts for file watching and hot reloading
4. **Shopify Integration**: Automated synchronization with Shopify's theme preview

## Key Technical Decisions

### Build System

- **Vite**: Chosen for its superior speed and modern JavaScript processing capabilities
- **Custom Watchers**: Implemented for Shopify-specific requirements not covered by standard tooling
- **File Flattening**: Specialized logic to transform nested source structure into Shopify's flat theme structure

### CSS Strategy

- **Tailwind CSS**: Utilized for utility-based styling and consistent design language
- **PostCSS Processing**: Advanced optimization with purging of unused styles
- **CSS Architecture**: Combination of utility classes and component-specific styles

### JavaScript Approach

- **Vanilla JS**: Using modern vanilla JavaScript for better performance
- **Module Pattern**: Encapsulating functionality in clear modules
- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with JS when available

### Shopify Integration

- **Theme API**: Direct integration with Shopify's theme preview and development APIs
- **Multiple Environments**: Support for different Shopify stores (production, staging, development)
- **CLI Integration**: Leveraging Shopify CLI for authentication and theme operations

## Design Patterns in Use

### Liquid Template Patterns

- **Template Inheritance**: Using layout files as base templates extended by specific page types
- **Snippet Composition**: Breaking UI into reusable snippet components
- **Section Modularity**: Implementing self-contained, configurable sections
- **Block Architecture**: Using blocks for customizable section components

### JavaScript Patterns

- **Module Pattern**: Isolating functionality in clear modules with specific responsibilities
- **Event Delegation**: Using event bubbling for efficient event handling
- **Lazy Loading**: Deferring non-critical resources until needed
- **State Management**: Maintaining UI state through data attributes and custom events

### CSS Patterns

- **Utility-First**: Using Tailwind's utility classes for consistent styling
- **Component Variants**: Implementing configurable components with variant modifiers
- **Responsive Methodology**: Mobile-first approach with consistent breakpoint usage
- **CSS Custom Properties**: Using variables for theme settings (colors, spacing, etc.)

## Component Relationships

### Layout Components

- **Theme Layout**: Base layout template that includes header, footer, and main content area
- **Header**: Contains navigation, search, cart, and account components
- **Footer**: Contains secondary navigation, newsletter signup, and legal information
- **Main Content**: Dynamic area populated by page-specific sections

### Page Components

- **Product Templates**: Specialized layouts for product detail pages
- **Collection Templates**: Grid and list views for product collections
- **Blog Templates**: Article listing and detail views
- **Static Page Templates**: About, contact, and other informational pages

### UI Components

```
┌─────────────────────┐
│ Header              │
│  ├── Navigation     │
│  ├── Search         │
│  └── Cart Drawer    │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Page Content        │
│  ├── Hero Section   │
│  ├── Product Grid   │
│  ├── Testimonials   │
│  └── Featured Items │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Footer              │
│  ├── Nav Links      │
│  ├── Newsletter     │
│  └── Social Media   │
└─────────────────────┘
```

### State Flow

1. **Initial Page Load**: Server renders Liquid templates with initial state
2. **Client Hydration**: JavaScript enhances the server-rendered HTML
3. **User Interactions**: Event handlers update UI state and make AJAX requests when needed
4. **State Updates**: DOM updates reflect changed application state
5. **Persistence**: Cart state persists across pages using Shopify's cart API

### Data Flow

- **Product Data**: Sourced from Shopify's product API and rendered in templates
- **Cart Data**: Managed through Shopify's cart API with client-side updates
- **User Data**: Customer information retrieved through Shopify's customer API
- **Content Data**: CMS content from Shopify's content management features

# Lighthouse CI System Patterns

## Architecture Overview

The Lighthouse CI workflow follows a modular, component-based architecture that prioritizes maintainability and reusability. The system is structured around distinct phases of execution, each with clear inputs and outputs.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Data Collection│────▶│   Processing    │────▶│  Presentation   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Core Design Patterns

### 1. Composite Actions Pattern

The workflow uses composite actions to encapsulate functionality into reusable, self-contained units. Each action has well-defined inputs, outputs, and a single responsibility:

```yaml
name: "Action Name"
description: "Description of what the action does"

inputs:
  parameter-name:
    description: "What this parameter controls"
    required: true|false

runs:
  using: "composite"
  steps:
    - name: Step 1
      shell: bash
      run: echo "Executing functionality"
```

This pattern promotes:

- Code reuse across workflows
- Simplified maintenance
- Clearer workflow structure
- Easier testing and debugging

### 2. Job Separation Pattern

The workflow divides functionality into separate jobs with clear responsibilities:

1. **Data Collection Job**: Runs tests and collects raw data
2. **Processing Job**: Transforms raw data into meaningful reports
3. **Deployment Job**: Publishes processed data for consumption

Each job depends on the outputs of previous jobs, creating a clear dependency chain while allowing parallel execution where possible.

### 3. Matrix Strategy Pattern

For testing multiple pages or configurations, the workflow employs a matrix strategy:

```yaml
strategy:
  matrix:
    page:
      - name: homepage
        url: https://example.com/
      - name: product
        url: https://example.com/product
```

This allows:

- Running the same test across multiple targets
- Collecting results in a consistent format
- Parallel execution for improved performance
- Easy addition of new test targets

### 4. State Management Pattern

For managing state between workflow steps and jobs, the workflow uses:

1. **Artifacts**: For large files (HTML reports, JSON data)
2. **Outputs**: For small pieces of data (dates, flags)
3. **Environment Variables**: For configuration values
4. **Git Branch**: For historical data persistence

### 5. Caching Strategy Pattern

The workflow implements efficient caching to optimize performance:

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/path
    key: ${{ inputs.cache-key }}
```

This reduces:

- Installation time for dependencies
- Network traffic for repeated downloads
- Overall workflow execution time

## Integration Patterns

### 1. GitHub Pages Integration

The workflow pushes processed data to GitHub Pages using a dedicated action:

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./performance-reports
```

### 2. Pull Request Annotations

For code changes, the workflow adds performance annotations to pull requests:

```yaml
echo "::warning file=${FILE}::Performance issue detected"
```

### 3. Step Summary Reports

The workflow generates summary reports for each run:

```yaml
echo "## Lighthouse Results" >> $GITHUB_STEP_SUMMARY
echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
echo "| ------ | ----- |" >> $GITHUB_STEP_SUMMARY
```

## Error Handling Patterns

### 1. Fallback Content

The workflow implements fallbacks for error conditions:

```yaml
command || fallback_command
```

### 2. Continue-on-Error

For non-critical steps, the workflow uses continue-on-error:

```yaml
- name: Non-critical step
  continue-on-error: true
  run: command
```

### 3. Explicit Error Checks

The workflow explicitly checks for error conditions:

```bash
if [ ! -f "file.html" ]; then
  echo "Error: File not found, creating fallback..."
  # Create fallback content
fi
```

## Workflow Extension Patterns

### 1. Adding Test Pages

To add new pages to test, extend the matrix configuration:

```yaml
strategy:
  matrix:
    page:
      - name: existing-page
        url: https://example.com/existing
      - name: new-page
        url: https://example.com/new
```

### 2. Adding Metrics

To track additional metrics, modify the processing scripts to extract and display new data points.

### 3. Custom Reporting

To create custom reports, add new processing steps in the generate-dashboard action.
