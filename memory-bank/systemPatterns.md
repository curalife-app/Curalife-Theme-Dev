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
