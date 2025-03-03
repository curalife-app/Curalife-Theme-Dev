# Shopify Theme Development

> **IMPORTANT UPDATE:** This project now uses the official Shopify CLI instead of ThemeKit (which is deprecated). Please refer to the `SHOPIFY-SIMPLE.md` document for the latest workflow.

This guide explains how to use the integrated Shopify CLI development environment for the Curalife Theme.

## Initial Setup

Before using the integrated development environment, you need to set up Shopify CLI and authenticate:

### Option 1: Using the Newer Shopify CLI

1. **Install Shopify CLI** (if you haven't already):

   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```

2. **Log in to your Shopify store**:
   ```bash
   shopify auth login
   ```
   Follow the prompts to authenticate with your Shopify store.

### Option 2: Using ThemeKit (Older Method)

1. **Install ThemeKit** (if you haven't already):

   ```bash
   npm install -g @shopify/themekit
   ```

2. **Configure your theme access**:

   - Edit the `config.yml` file in the root directory
   - Replace the placeholder values with your store information:
     ```yaml
     development:
       password: YOUR_API_PASSWORD # Private app password
       theme_id: "THEME_ID" # Your theme ID or "live"
       store: YOUR_STORE_NAME.myshopify.com
     ```

3. **Log in using ThemeKit**:
   ```bash
   theme login --password=[your-password] --store=[your-store.myshopify.com]
   ```

## Available Scripts

Several scripts are available for Shopify theme development:

### Integrated Development Environment

```bash
npm run dev:shopify
```

This runs a complete development environment that:

- Processes your theme files using Vite
- Starts the Shopify development server
- Sets up file watchers for automatic updates
- Provides a live preview of your theme

This is the **recommended** option for development as it combines all the necessary tools. It works with both newer Shopify CLI and ThemeKit.

### Individual Shopify Commands

If you need to run specific Shopify commands:

```bash
# Start Shopify development server only
npm run shopify:theme:dev

# Push your theme to Shopify
npm run shopify:theme:push

# Pull the latest theme from Shopify
npm run shopify:theme:pull

# Log in to Shopify
npm run shopify:login
```

Our scripts automatically try both newer CLI commands and ThemeKit commands as fallbacks.

## Obtaining Shopify API Credentials

If you're using ThemeKit, you'll need to set up API access:

1. Go to your Shopify Admin panel
2. Navigate to Apps > Develop apps
3. Click "Create an app"
4. Name it something like "Theme Development"
5. Set the appropriate permissions:
   - `read_themes`
   - `write_themes`
6. Install the app in your store
7. Copy the Admin API access token (this is your `password` for config.yml)
8. Find your theme ID by going to Online Store > Themes and looking at the URL when you customize a theme

## How It Works

The integrated development environment (`npm run dev:shopify`) performs several tasks:

1. **Builds the theme** - Runs a full Vite build to process all assets
2. **Sets up file watchers** - Monitors your source files for changes
3. **Starts Vite in watch mode** - Processes CSS and other assets
4. **Starts Shopify CLI dev server** - Serves your theme for preview

When you make changes to your source files:

- Changes are immediately copied to the build directory
- The Shopify preview automatically updates
- Console logs show what files have changed

## Troubleshooting

If you encounter issues:

### Authentication problems:

- For newer CLI: Run `shopify auth login`
- For ThemeKit: Verify your `config.yml` settings and run `theme login`

### Theme not updating:

- Check that you're viewing the correct theme preview
- Ensure the correct store is selected
- Try refreshing the browser

### Build errors:

- Check the console for specific error messages
- Make sure all dependencies are installed: `npm install`

### Shopify CLI errors:

- Verify CLI installation: `shopify --version` or `theme --version`
- Update if needed: `npm update -g @shopify/cli @shopify/theme` or `npm update -g @shopify/themekit`

### "Command not found" errors:

- If you get `shopify command not found`, try using `theme`
