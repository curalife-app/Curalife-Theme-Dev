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
