# Stagewise Integration

This project has been integrated with [Stagewise](https://stagewise.dev), a browser toolbar that connects frontend UI to code AI agents in your code editor.

## What is Stagewise?

Stagewise allows developers to:

- Select elements in a web app
- Leave comments and feedback
- Let AI agents make changes based on that context
- Streamline the development workflow between design and code

## Integration Details

### Package Installation

- **Package**: `@stagewise/toolbar` (framework-agnostic version)
- **Installation**: `npm install --save-dev @stagewise/toolbar`
- **Environment**: Development dependency only

### Files Structure

1. **`src/liquid/snippets/developer-tools.liquid`** - Main stagewise initialization with optimized loading
2. **`src/liquid/layout/theme.liquid`** - Includes developer tools snippet
3. **`build-scripts/copy-stagewise-files.js`** - Enhanced build script for copying and patching files

### Architecture

#### Optimized Loading Strategy

The integration uses a robust, consolidated approach:

```javascript
// Environment detection with multiple fallbacks
const detectDevelopmentEnvironment = () => {
	const { hostname, port, search } = window.location;

	const developmentIndicators = [
		hostname === "localhost",
		hostname.includes("127.0.0.1"),
		hostname.includes(".ngrok."),
		hostname.includes("shopify.dev"),
		hostname.includes(".shopifypreview.com"),
		hostname.includes(".myshopify.com"),
		search.includes("preview_theme_id"),
		Boolean(port),
		document.cookie.includes("_shopify_s=")
	];

	const isDev = developmentIndicators.some(Boolean);
	const isThemeEditor = window.Shopify?.designMode;
	return isDev && !isThemeEditor;
};
```

#### Robust Asset Loading

- **Promise-based loading** with proper error handling
- **Async/await pattern** for cleaner code
- **Timeout protection** to prevent infinite waiting
- **Graceful degradation** when assets are unavailable

#### Enhanced Error Handling

- **Global error boundary** for initialization failures
- **Asset loading fallbacks** for missing files
- **Connection monitoring** with optional debug mode
- **Comprehensive logging** with configurable verbosity

### Key Optimizations

#### 1. Consolidated Logic

- Single initialization point in `developer-tools.liquid`
- Removed duplicate scripts and logic
- Streamlined development detection

#### 2. Performance Improvements

- **Lazy loading** - only loads when needed
- **Non-blocking CSS** loading
- **Optimized waiting logic** with exponential backoff
- **Memory-efficient** IIFE pattern

#### 3. Reliability Enhancements

- **Multiple global name detection** (StagewiseToolbar, Stagewise)
- **Robust environment detection** with fallbacks
- **Graceful error handling** throughout
- **Browser compatibility** polyfills

#### 4. Developer Experience

- **Configurable debug mode** (set `STAGEWISE_DEBUG = true`)
- **Clear error messages** with actionable feedback
- **Force enable option** via `?stagewise=1` URL parameter
- **Connection status monitoring**

## Configuration

### Debug Mode

```javascript
const STAGEWISE_DEBUG = false; // Set to true for verbose logging
```

### Stagewise Config

```javascript
const config = {
	debug: STAGEWISE_DEBUG,
	position: "top-right",
	plugins: [],
	theme: "auto"
};
```

## Build Process

### Enhanced Build Script

The `copy-stagewise-files.js` script now features:

- **Multiple file detection** - searches for various possible file names
- **Enhanced patching** - fixes browser compatibility issues
- **Better error reporting** - clear success/failure feedback
- **Validation checks** - ensures source files exist

### Build Modes

- **Development builds** (`npm run watch`): Full staging integration
- **Production builds** (`npm run build`): Scripts included but won't initialize
- **Theme editor**: Disabled to prevent conflicts

## Usage

1. **Start development**: `npm run watch:shopify`
2. **Open browser**: Navigate to your development store
3. **Automatic loading**: Toolbar appears in development environments
4. **Force enable**: Add `?stagewise=1` to any URL if needed

## Troubleshooting

### Debug Mode

Enable debug mode by setting `STAGEWISE_DEBUG = true` in `developer-tools.liquid`:

```javascript
const STAGEWISE_DEBUG = true; // Enable verbose logging
```

### Common Issues

#### Toolbar Not Appearing

1. **Check console** for initialization messages
2. **Verify environment** - ensure you're on a development hostname
3. **Force enable** - try adding `?stagewise=1` to URL
4. **Check assets** - ensure files were copied to build directory

#### Console Debug Messages

- `🎭 Loading Stagewise in development environment` - Normal startup
- `🎭 Stagewise initialized successfully` - Success
- `🎭 Stagewise skipped - not in development environment` - Production mode
- `🎭 Stagewise initialization failed: [error]` - Check error details

### File Verification

Check that these files exist in `Curalife-Theme-Build/assets/`:

- `stagewise-toolbar.js`
- `stagewise-toolbar.css`

If missing, run: `node build-scripts/copy-stagewise-files.js`

## Security & Performance

### Security Features

- **Environment isolation** - only loads in development
- **No production impact** - zero overhead in live stores
- **Theme editor safety** - disabled to prevent conflicts
- **Scoped execution** - IIFE pattern prevents global pollution

### Performance Optimizations

- **Lazy initialization** - loads only when needed
- **Async loading** - non-blocking asset requests
- **Memory efficient** - proper cleanup and scoping
- **Minimal footprint** - optimized file sizes

## Migration Notes

### From Previous Version

If upgrading from an older stagewise integration:

1. **Remove** any old `stagewise-dev.js` files
2. **Update** theme.liquid to use `{% render 'developer-tools' %}`
3. **Run** build script to ensure latest files are copied
4. **Test** in development environment

The new implementation is backward compatible and should work seamlessly.
