# Development Mode Features

This document explains how to use the development mode features in the Curalife Theme.

## Overview

Development mode provides visual indicators and debugging tools that are only visible during development, not in production. This helps with theme development while ensuring customers never see development tools.

## Ways to Enable Development Mode

The theme can detect development mode in these situations:

1. **Local Development**: When accessing the theme via `localhost` or `127.0.0.1`
2. **Shopify CLI Preview**: When using `.shopifypreview.com` URLs from the `shopify theme dev` command
3. **URL Parameter**: By adding `?dev_mode=1` to any URL (sets a browser cookie)
4. **Development Stores**: URLs containing `dev-`, `-dev.`, or `-development.`
5. **Theme Settings**: By enabling "Force Development Mode" in theme settings
6. **Browser Cookie**: Once set with `?dev_mode=1`, development mode persists for 1 hour

## Using with Shopify Hot Reload

When you run `npm run shopify`, the development mode is automatically activated through:

1. The Shopify CLI generates a preview URL with `.shopifypreview.com` domain
2. The development-mode.liquid snippet detects this domain and enables development mode
3. A cookie is set to maintain development mode during your session
4. Internal links are processed to maintain development mode as you navigate

No manual steps are required - it works automatically with the hot reload script!

## Automatic Link Processing

Once development mode is activated, the theme will:

1. **Automatically append `dev_mode=1` to all internal links** on the page
2. **Process dynamically added links** to maintain development mode across navigation
3. **Skip external links and special links** (anchors, mailto, tel)

This means you only need to activate development mode once, and it will be maintained as you navigate through the site, as long as you use the site's navigation rather than manually typing URLs.

## Development Top Bar

When in development mode, an elegant blue top bar appears at the top of the screen with useful theme information:

- **Shop Name and Theme ID**: Shows the current store name and theme ID
- **Template Information**: Displays the current template type and name
- **Page Handle**: Shows the current page/product/collection handle
- **Current Date/Time**: Shows the local date and time

### Top Bar Features

- **Collapsible**: Click the up arrow (▲) to collapse the bar (it will slightly peek from the top when you hover)
- **Dismissible**: Click the X button to remove the bar for the current session
- **Responsive**: Adapts to smaller screens by hiding some information
- **Non-intrusive**: Semi-transparent with backdrop blur for a modern look
- **Persistent "DEV" label**: When collapsed, a small "DEV" label appears at the top center

The top bar can be turned on/off in theme settings ("Show Development Indicator").

## Debug Panel

Add `?dev_debug=1` to any URL to show the debug panel. This panel displays:

- Current hostname
- Current path
- Query string parameters
- JavaScript development mode status
- Liquid development mode status
- Dev mode parameter status
- Dev mode cookie status
- Link modification status

This is useful to diagnose detection issues.

## Theme Settings

Two development-related settings are available in the theme settings:

1. **Show Development Mode Indicator**: Toggle visibility of the dev top bar in development mode
2. **Force Development Mode**: Always treat this theme as being in development mode

These settings are found in the "Development Settings" section of the theme settings.

## Using Development Mode in Templates

### In Liquid Templates

You can conditionally show or hide content based on development mode:

```liquid
{% if isDevelopment %}
	<!-- This content only shows in development mode (Liquid-detected) -->
	<div class="debug-info">Current template: {{ template }}</div>
{% endif %}
```

### In JavaScript

You can also check development mode in JavaScript:

```html
<script>
	if (window.isDevelopmentMode) {
		// This code only runs in development mode (JavaScript-detected)
		console.log("Development mode is active");
	}
</script>
```

## Best Practices

- To start development mode, simply add `?dev_mode=1` to any URL once - all subsequent navigation will maintain it
- Enable "Force Development Mode" on development/staging stores for a persistent solution
- Use the `isDevelopment` Liquid variable or `window.isDevelopmentMode` JavaScript variable to add debugging tools
- Add `?dev_debug=1` to troubleshoot detection issues
- Collapse the top bar if it's in the way of your content

## Troubleshooting

If development mode isn't working:

1. Check using `?dev_debug=1` to see what detection methods are working
2. Try forcing with `?dev_mode=1` to set the browser cookie
3. Verify that the `development-mode` snippet is included in your layout files
4. Check if your browser is blocking cookies (needed for persistence between direct URL navigations)
5. Try enabling "Force Development Mode" via theme settings
6. Clear your browser cookies and cache if you're having issues with persistent development mode
