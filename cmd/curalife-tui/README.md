# 🎨 Curalife Theme TUI - Enhanced Interface

A beautiful, modern Terminal User Interface (TUI) for the Curalife theme development workflow, built with [Bubble Tea v2](https://github.com/charmbracelet/bubbletea) and enhanced with professional UI components.

## ✨ Features

### 🚀 **Modern UI Design**

- **Dracula-inspired color scheme** with professional styling
- **Responsive layouts** that adapt to terminal size
- **Interactive components** with smooth animations
- **Real-time progress indicators** and status updates
- **Tab-based navigation** for analytics and settings
- **Context-sensitive help** system

### 🛠️ **Enhanced Build System**

- **Live progress tracking** with detailed step-by-step feedback
- **Performance metrics** and optimization insights
- **Error handling** with clear diagnostic messages
- **Build statistics** including cache hits and processing times
- **Restart/rebuild** capabilities from within the TUI

### 👁️ **Advanced Watch Mode**

- **Hot reload integration** with Shopify development server
- **File change notifications** with real-time updates
- **Performance monitoring** with cache hit rates
- **Automatic optimization** suggestions
- **Dual mode support** (standard and Shopify watch)

### 📊 **Analytics Dashboard**

- **Tabbed interface** with multiple data views:
  - **Overview**: Build times, file counts, memory usage
  - **Performance**: Speed improvements and optimizations
  - **System**: Platform info and resource utilization
  - **Cache**: Hit rates and storage statistics
- **Interactive tables** with sortable data
- **Real-time metrics** updating during builds

### 📋 **Enhanced Logging**

- **Viewport-based log viewer** with scrolling
- **Color-coded log levels** (info, warning, error, success)
- **Timestamp support** with configurable display
- **Filtered output** removing noise and deprecation warnings
- **Log persistence** and export capabilities

### ⚙️ **Configuration System**

- **Theme selection** and customization
- **Auto-save preferences** for workflow optimization
- **Configurable refresh rates** and update intervals
- **Log line limits** and retention policies
- **Keyboard shortcuts** customization

## 🖼️ Visual Preview

### Main Menu

```
🎨 CURALIFE THEME BUILDER
High-performance Shopify theme development with modern TUI

▶ 🚀 Production Build
  Create optimized production build with asset minification

  👁️ Standard Watch
  📊 Analytics Dashboard
  📋 View Logs
  ⚙️ Settings
  🚪 Exit

Navigation: ↑/↓ or j/k to move • Enter: select • ?: help • q: quit
```

### Build Progress View

```
⚡ 🚀 PRODUCTION BUILD

```

## 🌟 Enhanced Features

Our TUI has been completely rewritten with modern standards and professional aesthetics:

### ✨ Visual Design

- **Dracula-inspired color scheme** for professional appearance
- **Responsive layout** that adapts to terminal size
- **Animated progress indicators** with spinners and progress bars
- **Rich interactive tables** for data visualization
- **Smooth animations** with 60+ FPS rendering
- **Context-aware help system** with keyboard shortcuts

### 🚀 Advanced Functionality

- **Real-time analytics dashboard** with multiple data views
- **Live logging system** with viewport scrolling and filtering
- **Interactive settings management** with persistent configuration
- **Multi-threaded process integration** with proper cancellation
- **Performance monitoring** with resource usage tracking
- **Smart caching system** with hit rate analytics

### 🎯 Development Modes

- **Build Mode**: Execute optimized build with real-time progress
- **Watch Mode**: Live development with file change monitoring
- **Analytics Mode**: Comprehensive dashboard with tabbed views
- **Logs Mode**: Interactive log viewer with search and filtering
- **Settings Mode**: Configuration management interface

## 📋 Prerequisites

### Required Software

- **Go 1.21+** - [Download from golang.org](https://golang.org/dl/)
- **Node.js 18+** - For build script integration
- **Git** - For version control

### Quick Installation Check

```powershell
# Check Go version
go version

# Check Node.js version
node --version

# Verify project structure
ls cmd/curalife-tui/
```

## 🚀 Quick Start

### Method 1: Simple Test Script (Recommended)

```powershell
# Run our simple test script
.\scripts\test-tui-simple.ps1
```

### Method 2: Manual Build

```powershell
# Install dependencies
go mod tidy
go mod download

# Build the TUI
go build -o bin/curalife-tui.exe ./cmd/curalife-tui

# Run the TUI
.\bin\curalife-tui.exe
```

### Method 3: Development Mode

```powershell
# Run directly (builds automatically)
go run ./cmd/curalife-tui
```

## 🎮 Usage Controls

### Navigation

- **↑/↓ Arrow Keys** - Navigate menu items and lists
- **←/→ Arrow Keys** - Switch between tabs (Analytics mode)
- **Enter** - Select current item or confirm action
- **Esc** - Return to main menu or cancel operation
- **Tab** - Cycle through interface elements

### Mode-Specific Controls

#### 📊 Analytics Dashboard

- **1-4 Number Keys** - Quick tab switching (Overview/Performance/System/Cache)
- **Page Up/Down** - Scroll through large data sets
- **R** - Refresh current data view
- **E** - Export current view to file

#### 📝 Logs Viewer

- **↑/↓** - Scroll through log entries
- **Home/End** - Jump to beginning/end of logs
- **/** - Search within logs
- **C** - Clear current logs
- **F** - Filter by log level

#### ⚙️ Settings

- **Space** - Toggle boolean settings
- **Enter** - Edit text settings
- **R** - Reset to defaults
- **S** - Save configuration

### Global Shortcuts

- **H** or **?** - Show context-sensitive help
- **Q** or **Ctrl+C** - Quit application
- **Ctrl+R** - Refresh current view
- **Ctrl+L** - Clear screen

## 🏗️ Architecture

### Modern Bubble Tea v2 Implementation

```
cmd/curalife-tui/
├── main.go           # Application entry point & MVU model
├── ui.go             # Rich rendering & styling system
├── backend.go        # Process integration & data management
└── README.md         # This documentation
```

### Key Components

- **Model**: State management with Bubble Tea v2 patterns
- **View**: Professional lipgloss styling with responsive design
- **Update**: Event handling with keyboard and process integration
- **Backend**: Process spawning with proper lifecycle management
- **Analytics**: Real-time metrics collection and visualization

### Integration Points

- **Build Scripts**: Executes `build-scripts/build-complete.js`
- **Watch Scripts**: Runs `build-scripts/watch.js` or `watch-shopify.js`
- **TUI Adapters**: Uses `build-scripts/tui-adapters/` for structured data
- **Configuration**: Reads from `build-scripts/config.js`

## 🐛 Troubleshooting

### Common Issues

#### "Go not found"

```powershell
# Install Go from https://golang.org/dl/
# Add to PATH if needed
$env:PATH += ";C:\Program Files\Go\bin"
```

#### "go.mod not found"

```powershell
# Ensure you're in the project root
cd "C:\Users\yotam\Desktop\Curalife Projects\Curalife-Theme-Dev"
ls go.mod  # Should exist
```

#### Build Failures

```powershell
# Clean Go cache and rebuild
go clean -cache -modcache
go mod download
go mod tidy
```

#### TUI Not Displaying Properly

- Ensure terminal supports ANSI colors
- Use modern terminal (Windows Terminal, PowerShell 7+)
- Resize terminal to at least 80x24 characters

#### Process Integration Issues

```powershell
# Verify Node.js and npm are available
node --version
npm --version

# Check build scripts exist
ls build-scripts/build-complete.js
ls build-scripts/watch.js
```

### Debug Mode

```powershell
# Run with debug information
go run ./cmd/curalife-tui debug

# Or build with debug flags
go build -ldflags "-X main.debug=true" -o bin/curalife-tui-debug.exe ./cmd/curalife-tui
.\bin\curalife-tui-debug.exe
```

### Performance Optimization

```powershell
# Build optimized version
go build -ldflags "-s -w" -o bin/curalife-tui-optimized.exe ./cmd/curalife-tui

# Check binary size
ls -la bin/
```

## 📈 Performance Benchmarks

Our enhanced TUI targets these performance metrics:

- **Startup Time**: <500ms cold start
- **Rendering**: 60+ FPS with smooth animations
- **Memory Usage**: <50MB typical, <100MB peak
- **CPU Usage**: <5% idle, <25% during builds
- **Responsiveness**: <16ms input to visual response

## 🔧 Development

### Adding New Features

1. Extend the `Model` struct in `main.go`
2. Add new rendering logic in `ui.go`
3. Implement event handling in the `Update` function
4. Update help text and documentation

### Styling Guidelines

- Use Dracula color palette for consistency
- Maintain responsive design principles
- Follow Bubble Tea v2 best practices
- Test on various terminal sizes (80x24 to 120x40)

### Testing

```powershell
# Run unit tests
go test ./cmd/curalife-tui/...

# Integration testing
go run ./cmd/curalife-tui

# Performance profiling
go run -race ./cmd/curalife-tui
```

## 📚 References

- [Bubble Tea v2 Documentation](https://github.com/charmbracelet/bubbletea)
- [Lipgloss Styling](https://github.com/charmbracelet/lipgloss)
- [Bubbles Components](https://github.com/charmbracelet/bubbles)
- [Dracula Theme](https://draculatheme.com/)

---

Built with ❤️ using Bubble Tea v2 for the Curalife Theme development workflow.
