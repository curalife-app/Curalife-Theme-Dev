# Simple Shopify Theme Development

This guide explains how to use the simplified Shopify theme development workflow that should work in any environment, using the official Shopify CLI.

## Quick Start

1. Install Shopify CLI globally:

   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```

2. Log in to your Shopify store:

   ```bash
   shopify auth login
   ```

3. Run the simplified development environment:
   ```bash
   npm run dev:shopify:simple
   ```

## How It Works

The simplified workflow:

1. Builds your theme with Vite
2. Sets up file watchers for your source files
3. Starts Shopify CLI's `theme dev` command to preview your theme and sync changes

When you make changes to your source files, they're automatically copied to the build directory and Shopify CLI uploads them to your development theme.

## Available Commands

We've set up several npm scripts to make working with Shopify easier:

- `npm run dev:shopify:simple` - The main development workflow
- `npm run shopify:login` - Log in to your Shopify store
- `npm run shopify:theme:list` - List all themes in your store
- `npm run shopify:theme:push` - Push your theme to Shopify
- `npm run shopify:theme:pull` - Pull theme files from Shopify
- `npm run shopify:theme:dev` - Run the Shopify theme dev command
- `npm run shopify:theme:open` - Open your theme in the browser

## Build Process

For building the theme for deployment, we have these options:

- `npm run build` - Standard Vite build process
- `npm run build:complete` - Enhanced build process that ensures all assets are properly copied and processed
- `npm run build:complete:debug` - Same as build:complete but with detailed logging

The `build:complete` script is recommended for production builds as it properly:

1. Copies all files from source to build directory with correct directory structure
2. Processes Tailwind CSS
3. Follows the same file handling logic as the watch process

## Getting Your Store Credentials

1. Go to your Shopify admin
2. Navigate to Apps > Develop apps
3. Create an app (e.g., "Theme Development")
4. Set permissions:
   - `read_themes`
   - `write_themes`
5. Install the app
6. You'll be prompted to log in when you run `shopify auth login`

## Troubleshooting

### Shopify CLI Not Working

If you see errors about Shopify CLI not being found:

1. Make sure Shopify CLI is installed globally:

   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```

2. Try running:
   ```bash
   shopify version
   ```

### Authentication Issues

If you have trouble authenticating:

1. Run `shopify auth logout` and then `shopify auth login` again
2. Make sure your app has the correct permissions
3. Try using a different browser for authentication if the default browser fails

### Theme Development Issues

If theme development doesn't work:

1. Make sure you're authenticated with `shopify auth login`
2. Check that your theme builds correctly with `npm run build:complete`
3. Try listing available themes with `shopify theme list`

### Other Common Issues

- **"Theme not found"**: Ensure you're connected to the correct store
- **Connection issues**: Check your internet connection and Shopify status page
- **Permission issues**: Verify your app has the necessary permissions
