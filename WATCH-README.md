# Curalife Theme Watch Scripts

This document explains the available watch scripts for developing the Curalife Shopify theme.

## Watch Options

The project offers several different watch solutions to accommodate different workflows:

### 1. Traditional Watch (`npm run watch`)

The original watch script provides a comprehensive file watching solution.

```bash
npm run watch
```

**Features:**

- Watches all source directories for changes
- Immediately copies changed files to the build directory
- Maintains the flattened structure required by Shopify
- Runs Tailwind CSS processing
- Detailed console feedback with decorative UI
- Extensive statistics and logging

**Best for:**

- Complex development workflows
- When you need detailed logging and statistics
- Compatibility with all setups

### 2. Vite-powered Watch (`npm run watch:vite`)

The simplified watch script leverages Vite's built-in functionality for a more modern approach.

```bash
npm run watch:vite
```

**Features:**

- Uses chokidar for reliable file watching
- Integrates directly with Vite's development server
- Streamlined code (less than half the lines of the original)
- Modern colored console output with chalk
- Simple and focused functionality
- Periodic statistics reporting

**Best for:**

- Faster development startup
- Cleaner console output
- Modern Vite-integrated workflow
- Simpler maintenance

### 3. Integrated Shopify Development (`npm run dev:shopify`) ✨ NEW ✨

The most comprehensive development environment that combines Vite and Shopify CLI.

```bash
npm run dev:shopify
```

**Features:**

- All the benefits of Vite-powered watching
- Automatically starts the Shopify development server
- Provides a live preview of your theme
- Updates the theme preview in real-time as you edit files
- Includes both local file watching and Shopify integration
- Proper cleanup of processes when terminating

**Best for:**

- Complete development workflow
- When you need to preview your theme in a browser
- Collaborating with designers and stakeholders
- Production-like testing environment

For detailed information about Shopify development, see [SHOPIFY-DEV.md](./SHOPIFY-DEV.md).

## Comparison

|                | Traditional Watch | Vite-powered Watch   | Shopify Integrated Dev         |
| -------------- | ----------------- | -------------------- | ------------------------------ |
| Code Size      | ~480 lines        | ~210 lines           | ~300 lines                     |
| Setup Time     | Slightly longer   | Faster               | Includes initial build         |
| Console Output | Very detailed     | Clean and minimal    | Comprehensive                  |
| Dependencies   | Built-in Node.js  | Chokidar + Chalk     | Chokidar + Chalk + Shopify CLI |
| Statistics     | Real-time         | Periodic (every min) | Periodic (every min)           |
| Implementation | Custom code       | Leverages Vite       | Combines Vite + Shopify        |
| Maintenance    | More complex      | Easier               | Moderate complexity            |
| Live Preview   | No                | No                   | Yes                            |

## How They Work

### Traditional Watch

The traditional watch script uses Node.js's built-in `fs.watch` functionality with extensive custom code for handling different file types, debouncing, and detailed console reporting.

### Vite-powered Watch

The Vite-powered watch script uses chokidar (a more reliable file watcher) and integrates directly with Vite's dev server. It has a simpler implementation focused on reliability rather than extensive features.

### Shopify Integrated Development

The integrated development environment combines file watching with Shopify CLI to provide a complete development experience. It builds the theme, watches for changes, and provides a live preview in a browser.

## Choosing the Right Watch Script

- Use `npm run watch` if you need comprehensive logging and detailed statistics
- Use `npm run watch:vite` if you prefer a more streamlined, modern approach without a preview
- Use `npm run dev:shopify` for the most complete development experience with live preview

All scripts work well with the Shopify theme development workflow and ensure the proper flattened file structure in the build directory.

## Troubleshooting

If you encounter issues with the watch scripts:

1. Make sure all dependencies are installed: `npm install`
2. Verify the build directory exists: `Curalife-Theme-Build`
3. Check your terminal has proper permissions
4. Try running the build first: `npm run build`

For Shopify-specific troubleshooting, refer to [SHOPIFY-DEV.md](./SHOPIFY-DEV.md).
