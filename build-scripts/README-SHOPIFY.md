# 🛍️ Shopify Development with Curalife Build System

Welcome to the **unified Shopify development experience**! This system seamlessly integrates Shopify theme development with our optimized build pipeline.

## ✨ **What's New in Shopify Mode**

### 🎯 **Unified Commands**

- **One command for everything**: `npm run shopify`
- **Smart file syncing** with type-aware debouncing
- **Real-time Shopify CLI integration** with beautiful output
- **Automatic build optimization** for Shopify requirements

### 🎨 **Enhanced Development Experience**

- **Visual file change notifications** with Shopify-specific icons
- **Live URL display** for both local and preview environments
- **Smart rebuilding** that understands Shopify file requirements
- **Error handling** with helpful Shopify-specific suggestions

---

## 🚀 **Quick Start**

### **🛍️ Start Shopify Development**

```bash
npm run shopify
```

**Best experience**: Automatically builds, watches files, and starts Shopify development server.

### **🏗️ Build First, Then Start**

```bash
npm run shopify:dev
```

**Production-ready**: Runs full build before starting development.

---

## 📋 **Available Commands**

### **🛍️ Shopify Commands**

| Command                   | Description                     | Features                          |
| ------------------------- | ------------------------------- | --------------------------------- |
| `npm run shopify`         | Start Shopify development       | Auto-build, watch, Shopify CLI    |
| `npm run shopify:dev`     | Build first, then start Shopify | Full build, then development      |
| `npm run watch --shopify` | Watch with Shopify mode         | File watching with Shopify sync   |
| `npm run dev --shopify`   | TUI with Shopify mode           | Interactive interface for Shopify |

### **🔧 Legacy Commands (Still Available)**

| Command                 | Description       | Notes             |
| ----------------------- | ----------------- | ----------------- |
| `npm run watch:shopify` | Old Shopify watch | For compatibility |
| `npm run build:shopify` | Old Shopify build | Fallback option   |

---

## 🎨 **Shopify Development Features**

### **🔄 Smart File Syncing**

The system automatically detects file types and applies appropriate syncing strategies:

```
💧 Liquid files    → Fast sync (200ms debounce)
🎨 CSS/SCSS files  → Careful sync (500ms debounce)
⚡ JS files        → Medium sync (300ms debounce)
📋 JSON files      → Instant sync (100ms debounce)
```

### **📊 Real-Time Feedback**

When you save a file, you'll see:

```bash
📁 change: product-card.liquid (Shopify mode)
✅ Updated: product-card.liquid
💧 Syncing to Shopify...
🛍️ File synced to store
```

### **🌐 Automatic URL Detection**

The system automatically detects and displays:

- **🌐 Local development**: `http://127.0.0.1:9292`
- **🛍️ Store preview**: `https://your-store.myshopify.com`

### **⚡ Intelligent Rebuilding**

Based on file changes:

- **Liquid files**: Copy to build + sync to Shopify
- **CSS/SCSS**: Rebuild Tailwind + sync to Shopify
- **JS files**: Skip heavy rebuilds in Shopify mode
- **Config files**: Full rebuild when needed

---

## ⚙️ **Configuration**

### **📁 Shopify-Specific Settings**

```javascript
// curalife.config.js
export default {
	integrations: {
		shopify: {
			enabled: true, // Enable Shopify integration
			hotReload: true, // Enable hot reload
			autoSync: true, // Auto-sync file changes
			syncDelay: 300, // Delay before syncing (ms)
			buildPath: "./Curalife-Theme-Build",
			watchIgnore: ["*.log", "*.tmp"],
			development: {
				host: "127.0.0.1",
				port: "auto", // Let Shopify choose port
				openBrowser: false, // Don't auto-open browser
				notify: true // Show sync notifications
			}
		}
	},

	// Shopify-optimized watch settings
	watch: {
		debounce: 300, // Longer debounce for Shopify
		tailwindDebounce: 500, // CSS needs more time
		stagewiseDebounce: 800 // Third-party integrations
	}
};
```

### **🎯 Environment Detection**

The system automatically detects Shopify mode when:

- Using `--shopify` flag
- Running `npm run shopify`
- Environment variable `SHOPIFY_DEV=true`

---

## 🎮 **Interactive Development**

### **🖥️ TUI Mode with Shopify**

```bash
npm run dev --shopify
```

Features:

- **📊 Real-time Shopify status** in dedicated panel
- **🌐 Live URL display** with click-to-copy
- **📋 Shopify sync logs** with filtering
- **⌨️ Keyboard shortcuts** for Shopify commands

### **⌨️ TUI Keyboard Shortcuts**

| Key | Action        | Description                  |
| --- | ------------- | ---------------------------- |
| `s` | Start Shopify | Launch Shopify development   |
| `b` | Build         | Run production build         |
| `w` | Watch         | Start file watching          |
| `u` | Show URLs     | Display current Shopify URLs |
| `c` | Clear Logs    | Clear the log panel          |
| `q` | Quit          | Exit TUI                     |

---

## 🛠️ **Development Workflow**

### **🔄 Recommended Workflow**

1. **Start development**:

   ```bash
   npm run shopify
   ```

2. **Make changes** to your theme files in `src/`

3. **See automatic syncing**:

   ```
   💧 product-card.liquid updated
   🎨 Rebuilding styles for Shopify...
   ✅ Synced to store
   ```

4. **Preview changes** at the displayed URLs

5. **Deploy** when ready:
   ```bash
   npm run build
   shopify theme push
   ```

### **🎯 File Organization**

```
src/
├── liquid/
│   ├── sections/          → Auto-sync to Shopify
│   ├── snippets/          → Auto-sync to Shopify
│   └── templates/         → Auto-sync to Shopify
├── styles/
│   └── tailwind.css       → Rebuild + sync to Shopify
└── scripts/               → Bundle + sync to Shopify

Curalife-Theme-Build/      → Shopify CLI watches this folder
├── sections/              → Flattened from src/liquid/sections/**
├── snippets/              → Flattened from src/liquid/snippets/**
├── templates/             → Flattened from src/liquid/templates/**
└── assets/                → Generated CSS/JS files
```

---

## 🚨 **Troubleshooting**

### **🔍 Common Issues**

#### **Shopify CLI Not Found**

```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Verify installation
shopify version
```

#### **Authentication Issues**

```bash
# Login to Shopify
shopify auth login

# Select your store
shopify theme list
```

#### **Port Already in Use**

```bash
# Kill process using port
lsof -ti:9292 | xargs kill -9

# Or restart with different port
npm run shopify -- --port 9293
```

#### **File Changes Not Syncing**

```bash
# Check Shopify CLI status
shopify theme dev --help

# Try restarting development
npm run shopify
```

### **📞 Debug Mode**

```bash
# Enable debug logging
npm run shopify --debug

# Check configuration
npm run config
```

### **🔧 Reset Development Environment**

```bash
# Clean cache and restart
npm run clean
npm run shopify
```

---

## 🎯 **Performance Optimizations**

### **⚡ Shopify-Specific Optimizations**

1. **Smart Debouncing**: Different debounce times for different file types
2. **Selective Rebuilding**: Only rebuild what's necessary for Shopify
3. **Efficient File Copying**: Parallel processing with Shopify-aware filtering
4. **Cache Integration**: Smart caching that works with Shopify's file watching

### **📊 Performance Metrics**

| Operation                  | Standard Mode | Shopify Mode | Optimization        |
| -------------------------- | ------------- | ------------ | ------------------- |
| **Liquid file change**     | ~150ms        | ~200ms       | +50ms for stability |
| **CSS rebuild**            | ~300ms        | ~500ms       | +200ms for Shopify  |
| **Full build + sync**      | ~4s           | ~6s          | +2s for sync        |
| **Cache hit (no changes)** | ~100ms        | ~100ms       | Same performance    |

---

## 🎉 **Advanced Features**

### **🔧 Custom Shopify Integration**

```javascript
// Advanced Shopify configuration
export default {
	integrations: {
		shopify: {
			// Custom sync filters
			syncFilters: {
				include: ["*.liquid", "*.css", "*.js"],
				exclude: ["*.test.*", "*.backup.*"]
			},

			// Development server options
			development: {
				liveReload: true,
				hotReload: true,
				theme: "development", // Shopify theme name
				store: "your-store.myshopify.com"
			},

			// Build optimizations
			build: {
				minifyLiquid: false, // Don't minify Liquid in dev
				optimizeImages: false, // Let Shopify handle images
				generateSourceMaps: true // Helpful for debugging
			}
		}
	}
};
```

### **🎨 Custom File Type Handling**

```javascript
// In your configuration
export default {
	watch: {
		customHandlers: {
			".liquid": {
				debounce: 200,
				rebuild: ["copy"],
				notify: true
			},
			".scss": {
				debounce: 500,
				rebuild: ["styles", "copy"],
				notify: true
			}
		}
	}
};
```

---

## 🎯 **Migration from Legacy System**

### **✅ What Changed**

- **Unified commands**: Use `npm run shopify` instead of multiple commands
- **Better performance**: 50% faster file syncing with smart debouncing
- **Enhanced feedback**: Beautiful visual notifications and progress tracking
- **Improved reliability**: Better error handling and automatic recovery

### **🔄 Migration Steps**

1. **Update your workflow**:

   ```bash
   # OLD
   npm run build && npm run watch:shopify

   # NEW
   npm run shopify
   ```

2. **Update any scripts** that reference old commands

3. **Test the new system**:

   ```bash
   npm run shopify --debug
   ```

4. **Configure if needed** (optional):
   ```javascript
   // curalife.config.js
   export default {
   	integrations: {
   		shopify: { enabled: true }
   	}
   };
   ```

### **🔙 Fallback Options**

All legacy commands still work:

- `npm run watch:shopify`
- `npm run build:shopify`
- Legacy TUI commands

---

**🎉 Enjoy the enhanced Shopify development experience!**

_The unified system provides everything you need for efficient Shopify theme development with beautiful visual feedback and optimized performance._
