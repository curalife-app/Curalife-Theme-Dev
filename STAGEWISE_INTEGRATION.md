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

### Files Modified/Created

1. **`src/scripts/stagewise-dev.js`** - Main stagewise initialization script
2. **`src/liquid/layout/theme.liquid`** - Updated to conditionally load stagewise in development

### How It Works

#### Development Mode Detection

The integration uses multiple checks to ensure it only runs in development:

```javascript
const isDevelopment = () => {
	const hostname = window.location.hostname;
	const isDev =
		hostname === "localhost" || hostname.includes("127.0.0.1") || hostname.includes(".ngrok.") || hostname.includes("shopify.dev") || hostname.includes(".local") || window.location.port !== "";

	const isShopifyDev = window.Shopify && window.Shopify.designMode;
	return isDev && !isShopifyDev; // Don't load in Shopify theme editor
};
```

#### Conditional Loading

In the theme layout (`theme.liquid`), the script is only loaded when:

- Not in Shopify design mode (`{% unless request.design_mode %}`)
- Running on development hostnames (localhost, 127.0.0.1, .ngrok., shopify.dev)

#### Dynamic Import

The stagewise package is loaded using dynamic imports to prevent bundling in production:

```javascript
import("@stagewise/toolbar").then(({ initToolbar }) => {
	// Initialize toolbar
});
```

## Configuration

The current configuration is minimal:

```javascript
const stagewiseConfig = {
	plugins: [],
	debug: true,
	position: "top-right"
};
```

You can extend this configuration by adding plugins or modifying settings as needed.

## Build Process

- **Development builds** (`npm run watch`): Stagewise script is copied to build directory
- **Production builds** (`npm run build`): Stagewise script is included but won't initialize due to environment checks
- **Theme editor**: Stagewise is disabled to avoid conflicts

## Usage

1. Start development server: `npm run watch:shopify`
2. Open your Shopify development store in browser
3. The stagewise toolbar should appear automatically in development environments
4. Use the toolbar to select elements and provide feedback for AI-powered editing

## Troubleshooting

### Toolbar Not Appearing

- Check browser console for stagewise initialization messages
- Verify you're running on a development hostname
- Ensure the script was copied to `Curalife-Theme-Build/assets/stagewise-dev.js`

### Console Messages

- `🎭 Stagewise toolbar initialized for development` - Success
- `🎭 Stagewise toolbar skipped (not in development mode)` - Running in production mode
- `Failed to initialize stagewise toolbar: [error]` - Check network/package installation

## Security

The integration is designed to be secure:

- Only loads in development environments
- Uses dynamic imports to prevent production bundling
- Disabled in Shopify theme editor to avoid conflicts
- No sensitive data is exposed to the stagewise service
