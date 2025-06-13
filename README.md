# Curalife Shopify Theme Development

[![Lighthouse CI](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/curalife-app/Curalife-Theme-Dev/actions/workflows/lighthouse-ci.yml)

This repository contains the source code and development environment for the Curalife Shopify theme.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development with Shopify integration
npm run shopify:dev

# Or start standard development mode
npm run dev

# Build for production
npm run build
```

## Core Philosophy & Goals

- **Mobile-First:** Design and build with mobile devices as the primary consideration.
- **Progressive Enhancement:** Ensure core functionality works without JavaScript; enhance with JS.
- **Performance:** Prioritize fast loading times and adherence to Core Web Vitals.
- **Accessibility:** Strive for WCAG compliance.
- **Component-Based:** Build reusable Liquid snippets/sections and JavaScript modules.
- **Vanilla JS:** Prefer modern vanilla JavaScript over heavy frameworks.
- **Utility-First CSS:** Leverage Tailwind CSS for most styling.

## 🏗️ Build System

The project uses a **unified build system** powered by:

- **Vite** for JavaScript bundling and HMR
- **Tailwind CSS v4** for styling
- **Smart caching** for incremental builds
- **Integrated Shopify development** mode

### Key Features

- ⚡ **3x faster builds** with parallel processing and caching
- 🎯 **Smart file watching** with optimized debouncing
- 🛍️ **Seamless Shopify integration** with auto-sync
- 📊 **Performance monitoring** and optimization suggestions
- 🎨 **Beautiful CLI interface** with real-time feedback

## 📁 File Structure

```
├── 📁 src/                           # Source code
│   ├── 📁 liquid/                    # Shopify Liquid files
│   │   ├── layout/                   # Theme layouts
│   │   ├── sections/                 # Shopify sections
│   │   ├── snippets/                 # Reusable snippets
│   │   ├── blocks/                   # Section blocks
│   │   └── templates/                # Page templates
│   ├── 📁 scripts/                   # JavaScript modules
│   │   └── utils/                    # Utility functions
│   ├── 📁 styles/                    # CSS source files
│   │   ├── tailwind.css              # Main Tailwind entry
│   │   └── css/                      # Custom CSS
│   ├── 📁 assets/                    # Static assets
│   ├── 📁 images/                    # Image assets
│   ├── 📁 fonts/                     # Font files
│   ├── 📁 config/                    # Shopify settings
│   └── 📁 locales/                   # Locale files
├── 📁 Curalife-Theme-Build/          # Generated build output
├── 📁 build-scripts/                 # Build system
│   ├── 📁 core/                      # Core engines
│   ├── 📁 config/                    # Configuration
│   ├── 📁 tui/                       # Terminal UI
│   └── 📁 build-utilities/           # Utility scripts
├── 📁 testing/                       # Testing configuration
└── 📁 linting/                       # Code quality tools
```

**Important:** The build process _flattens_ the nested `src/liquid/` structure into Shopify's required flat structure in `Curalife-Theme-Build/`.

## 🛠️ Development Commands

### Primary Commands

```bash
# Start development with TUI interface
npm run dev

# Build for production
npm run build

# Watch files for changes (no Shopify)
npm run watch

# Shopify development mode (recommended)
npm run shopify

# Shopify development with initial build
npm run shopify:dev
```

### Utilities

```bash
# Transpile quiz components
npm run transpile:quiz

# Check Shopify development URLs
npm run shopify-urls

# Optimize assets
npm run optimize

# Analyze build performance
npm run analyze

# Show configuration
npm run config

# Clean build cache
npm run clean
```

### Shopify CLI Integration

```bash
# Login to Shopify
npm run shopify:login

# List available themes
npm run shopify:theme:list

# Push theme to Shopify
npm run shopify:theme:push

# Pull theme from Shopify
npm run shopify:theme:pull

# Open theme in browser
npm run shopify:theme:open
```

## 🚀 Development Workflow

### Prerequisites

- **Node.js** (Check `.nvmrc` for version)
- **pnpm** (`npm install -g pnpm`)
- **Shopify CLI** (`npm install -g @shopify/cli @shopify/theme`)

### Setup

1. **Clone and install:**

   ```bash
   git clone <repository-url>
   cd Curalife-Theme-Dev
   pnpm install
   ```

2. **Authenticate with Shopify:**
   ```bash
   npm run shopify:login
   ```

### Recommended Development Flow

**Option 1: Integrated Shopify Development (Recommended)**

```bash
# Single command starts everything
npm run shopify:dev
```

This will:

- Build the theme
- Start file watching
- Launch Shopify development server
- Display local and preview URLs

**Option 2: Standard Development**

```bash
# Development with TUI interface
npm run dev

# Or basic file watching
npm run watch
```

**Option 3: Manual Control**

```bash
# Terminal 1: Start file watcher
npm run watch

# Terminal 2: Start Shopify dev server
npm run shopify:theme:dev
```

### What Happens During Development

1. **File Changes:** Automatic detection and copying to build directory
2. **Style Rebuilding:** Tailwind CSS rebuilds on relevant changes
3. **JavaScript Processing:** Vite handles JS bundling with HMR
4. **Shopify Sync:** Changes automatically sync to your development store
5. **Cache Optimization:** Only changed files are processed

## 🎨 Styling

- **Framework:** Tailwind CSS v4 with CSS-first approach
- **Entry Point:** `src/styles/tailwind.css`
- **Custom CSS:** Place in `src/styles/css/`
- **Configuration:** `tailwind.config.js`

```css
/* src/styles/tailwind.css */
@import "tailwindcss";

@theme {
	--color-primary: #your-brand-color;
}

@layer components {
	.btn-primary {
		@apply bg-primary rounded px-4 py-2 text-white;
	}
}
```

## ⚡ JavaScript

- **Module System:** ES Modules via Vite
- **Entry Points:** Defined in `vite.config.js`
- **Utilities:** Common functions in `src/scripts/utils/`
- **Pattern:** Vanilla JS with progressive enhancement

```javascript
// src/scripts/components/example.js
export class ExampleComponent {
	constructor(element) {
		this.element = element;
		this.init();
	}

	init() {
		// Component logic
	}
}
```

## 📊 Performance & Testing

### Lighthouse Integration

```bash
# Run Lighthouse CI locally
npm run lighthouse:ci

# Desktop performance test
npm run lighthouse:desktop

# Mobile performance test
npm run lighthouse:mobile

# Create baseline reports
npm run performance:baseline

# Compare current vs baseline
npm run performance:compare
```

### Performance Monitoring

- **Continuous monitoring** via GitHub Actions
- **Core Web Vitals tracking**
- **Performance budgets** enforced in CI
- **Automated reports** on PRs

### Code Quality

```bash
# Run all linters
npm run lint

# Auto-fix issues
npm run lint:fix

# Shopify theme validation
npm run lint:shopify

# Analyze Liquid/JS integration
npm run analyze:liquid
```

## 🧹 Maintenance

### System Management

```bash
# Check running processes
npm run status

# Clean up Node processes
npm run cleanup

# Force cleanup (Windows)
npm run cleanup:force
```

### Cache Management

```bash
# Clean build cache and temp files
npm run clean

# Clear specific caches
rm -rf build-scripts/cache
rm -rf .tmp
```

## 🔧 Configuration

### Build Configuration

- **Main Config:** `build-scripts/config/unified-config.js`
- **Vite Config:** `vite.config.js`
- **Tailwind Config:** `tailwind.config.js`
- **PostCSS Config:** `postcss.config.cjs`

### Environment Detection

The build system automatically detects:

- **Development:** File watching with fast rebuilds
- **Production:** Optimized builds with minification
- **Shopify:** Enhanced integration with Shopify CLI
- **CI:** Minimal UI with performance focus

### Custom Configuration

Create `curalife.config.js` in the project root:

```javascript
export default {
	performance: {
		workers: 4,
		parallel: true
	},
	ui: {
		theme: "modern",
		animations: true
	},
	integrations: {
		shopify: {
			syncDelay: 500
		}
	}
};
```

## 🚢 Deployment

### Production Build

```bash
# Build optimized theme
npm run build

# Deploy to Shopify
npm run shopify:theme:push -- --allow-live
```

### Deployment Checklist

- [ ] Run `npm run build`
- [ ] Test with `npm run lighthouse:ci`
- [ ] Verify `npm run lint` passes
- [ ] Check performance budgets
- [ ] Deploy with appropriate theme flags

## 🐛 Troubleshooting

### Common Issues

**Build Fails:**

```bash
# Clear cache and retry
npm run clean
npm run build
```

**Shopify URLs Not Showing:**

```bash
# Manually check URLs
npm run shopify-urls
```

**File Changes Not Syncing:**

- Check if Shopify CLI is running
- Verify file paths in build output
- Try restarting watch mode

**Performance Issues:**

- Check system resources
- Reduce concurrent workers in config
- Use `npm run watch:fast` for minimal features

### Debug Mode

```bash
# Enable debug logging
npm run build -- --debug
npm run watch -- --debug
```

## 📚 Additional Resources

- **Build System Docs:** `build-scripts/README.md`
- **Linting Guide:** `linting/README.md`
- **Legacy Docs:** `SHOPIFY-SIMPLE.md` (outdated)
- **Performance Config:** `testing/lighthouse/lighthouserc.cjs`

## 🤝 Contributing

1. Follow the existing code style
2. Run linting before commits: `npm run lint:fix`
3. Test with `npm run build` and `npm run lighthouse:ci`
4. Ensure performance budgets are met
5. Update documentation for new features

---

**Built with ❤️ for Curalife**
