package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// Color scheme - Dracula inspired
var (
	primaryColor    = lipgloss.Color("#bd93f9")
	secondaryColor  = lipgloss.Color("#ff79c6")
	accentColor     = lipgloss.Color("#8be9fd")
	successColor    = lipgloss.Color("#50fa7b")
	warningColor    = lipgloss.Color("#ffb86c")
	errorColor      = lipgloss.Color("#ff5555")
	mutedColor      = lipgloss.Color("#6272a4")
	textColor       = lipgloss.Color("#f8f8f2")
	backgroundColor = lipgloss.Color("#282a36")
	selectionColor  = lipgloss.Color("#44475a")
)

// Application modes
type mode int

const (
	menuMode mode = iota
	buildMode
	watchMode
	analyticsMode
	logsMode
	settingsMode
)

// Application states
type AppState int

const (
	StateMenu AppState = iota
	StateBuild
	StateWatch
)

// Model represents the application state
type Model struct {
	state      AppState
	cursor     int
	backend    *Backend
	menuItems  []string
	lastUpdate time.Time
	ctx        context.Context
	cancel     context.CancelFunc
}

// Messages for handling async operations
type WatchStatusMsg struct {
	IsActive bool
}

type BuildStatusMsg struct {
	IsRunning bool
}

type WatchUpdateMsg struct {
	FilesWatched int
	ChangeCount  int
	LastChange   string
	IsActive     bool
}

type TickMsg time.Time

// Message types for async operations
type BuildProgressMsg struct {
	Progress int
}

type BuildCompleteMsg struct {
	Success bool
	Message string
}

type AnalyticsMsg struct {
	Data AnalyticsData
}

type LogsMsg struct {
	Logs []LogEntry
}

type ProcessOutputMsg struct {
	Output string
	Level  string
}

type ProcessInfo struct {
	PID     int
	Command string
	Status  string
}

// AnalyticsData represents analytics information
type AnalyticsData struct {
	Overview    OverviewData    `json:"overview"`
	Performance PerformanceData `json:"performance"`
	System      SystemData      `json:"system"`
	Cache       CacheData       `json:"cache"`
}

type OverviewData struct {
	TotalBuilds    int           `json:"total_builds"`
	TotalWatches   int           `json:"total_watches"`
	AvgBuildTime   time.Duration `json:"avg_build_time"`
	Success        int           `json:"success"`
	Failures       int           `json:"failures"`
	LastBuild      time.Time     `json:"last_build"`
}

type PerformanceData struct {
	AvgBuildTime     time.Duration `json:"avg_build_time"`
	FastestBuild     time.Duration `json:"fastest_build"`
	SlowestBuild     time.Duration `json:"slowest_build"`
	FilesPerSecond   float64       `json:"files_per_second"`
	CacheHitRate     float64       `json:"cache_hit_rate"`
	OptimizationTime time.Duration `json:"optimization_time"`
}

type SystemData struct {
	CPUUsage      float64 `json:"cpu_usage"`
	MemoryUsage   float64 `json:"memory_usage"`
	DiskUsage     float64 `json:"disk_usage"`
	OpenFiles     int     `json:"open_files"`
	ProcessCount  int     `json:"process_count"`
	SystemLoad    float64 `json:"system_load"`
}

type CacheData struct {
	TotalEntries  int     `json:"total_entries"`
	HitRate       float64 `json:"hit_rate"`
	MissRate      float64 `json:"miss_rate"`
	CacheSize     int64   `json:"cache_size"`
	InvalidEntries int    `json:"invalid_entries"`
	LastCleanup   time.Time `json:"last_cleanup"`
}

type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Source    string    `json:"source"`
}

type Settings struct {
	Theme            string `json:"theme"`
	AutoWatch        bool   `json:"auto_watch"`
	ShowTimestamps   bool   `json:"show_timestamps"`
	EnableSound      bool   `json:"enable_sound"`
	AutoRefresh      bool   `json:"auto_refresh"`
	RefreshInterval  int    `json:"refresh_interval"`
	MaxLogEntries    int    `json:"max_log_entries"`
	DefaultMode      string `json:"default_mode"`
}

// Initialize the model
func initialModel() Model {
	return Model{
		state:   StateMenu,
		cursor:  0,
		backend: NewBackend(),
		menuItems: []string{
			"🔨 Build Theme",
			"👁️  Watch Mode",
			"📊 Build with Report",
			"🛍️  Shopify Watch",
			"❌ Exit",
		},
		lastUpdate: time.Now(),
	}
}

// Bubble Tea methods
func (m Model) Init() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return TickMsg(t)
	})
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		return m.handleKeyPress(msg)
	case TickMsg:
		m.lastUpdate = time.Time(msg)
		return m, tea.Tick(time.Second, func(t time.Time) tea.Msg {
			return TickMsg(t)
		})
	case WatchStatusMsg:
		return m, nil
	case BuildStatusMsg:
		return m, nil
	case WatchUpdateMsg:
		return m, nil
	}

	return m, nil
}

func (m Model) handleKeyPress(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch m.state {
	case StateMenu:
		return m.handleMenuKeys(msg)
	case StateBuild:
		return m.handleBuildKeys(msg)
	case StateWatch:
		return m.handleWatchKeys(msg)
	}
	return m, nil
}

func (m Model) handleMenuKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
	case "down", "j":
		if m.cursor < len(m.menuItems)-1 {
			m.cursor++
		}
	case "enter", " ":
		switch m.cursor {
		case 0: // Build Theme
			m.state = StateBuild
			go func() {
				m.backend.StartBuild()
			}()
		case 1: // Watch Mode
			m.state = StateWatch
			go func() {
				m.backend.StartWatch(false)
			}()
		case 2: // Build with Report
			m.state = StateBuild
			go func() {
				m.backend.StartBuild()
			}()
		case 3: // Shopify Watch
			m.state = StateWatch
			go func() {
				m.backend.StartWatch(true)
			}()
		case 4: // Exit
			return m, tea.Quit
		}
	}
	return m, nil
}

func (m Model) handleBuildKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "esc":
		m.state = StateMenu
	}
	return m, nil
}

func (m Model) handleWatchKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		// Clean shutdown
		m.backend.Cleanup()
		return m, tea.Quit
	case "esc":
		m.backend.StopWatch()
		m.state = StateMenu
	case "s":
		m.backend.StopWatch()
	case "r":
		// Restart watch - determine if it was Shopify mode
		watchStatus := m.backend.GetWatchStatus()
		isShopify := watchStatus.Mode == "shopify"
		m.backend.StopWatch()
		time.Sleep(time.Millisecond * 500) // Brief pause
		m.backend.StartWatch(isShopify)
	}
	return m, nil
}

func (m Model) View() string {
	switch m.state {
	case StateMenu:
		return m.renderMenu()
	case StateBuild:
		return m.renderBuild()
	case StateWatch:
		return m.renderWatch()
	}
	return ""
}

func (m Model) renderMenu() string {
	s := "\n"
	s += titleStyle.Render("🎨 CURALIFE THEME TUI") + "\n\n"

	for i, item := range m.menuItems {
		if i == m.cursor {
			s += selectedStyle.Render("> "+item) + "\n"
		} else {
			s += normalStyle.Render("  "+item) + "\n"
		}
	}

	s += "\n" + helpStyle.Render("↑/↓: navigate • enter: select • q: quit") + "\n"
	return s
}

func (m Model) renderBuild() string {
	buildStatus := m.backend.GetBuildStatus()
	s := "\n"
	s += titleStyle.Render("🔨 BUILD MODE") + "\n\n"

	// Progress bar
	progress := buildStatus.Progress
	bar := ""
	for i := 0; i < 20; i++ {
		if i < progress/5 {
			bar += "█"
		} else {
			bar += "░"
		}
	}

	s += progressStyle.Render(fmt.Sprintf("[%s] %d%%", bar, progress)) + "\n\n"

	// Status information
	status := "🔄 Running"
	if !buildStatus.IsRunning {
		if progress >= 100 {
			status = "✅ Completed"
		} else {
			status = "❌ Failed"
		}
	}

	s += statusStyle.Render(status) + "\n"
	s += infoStyle.Render(fmt.Sprintf("Step: %s", buildStatus.CurrentStep)) + "\n"
	s += infoStyle.Render(fmt.Sprintf("Message: %s", buildStatus.Message)) + "\n\n"

	// Build statistics
	if buildStatus.FilesCopied > 0 || buildStatus.CacheHits > 0 {
		s += statsStyle.Render("📊 Statistics:") + "\n"
		if buildStatus.FilesCopied > 0 {
			s += detailStyle.Render(fmt.Sprintf("  Files copied: %d", buildStatus.FilesCopied)) + "\n"
		}
		if buildStatus.CacheHits > 0 {
			s += detailStyle.Render(fmt.Sprintf("  Cache hits: %d", buildStatus.CacheHits)) + "\n"
		}
		if buildStatus.Optimizations > 0 {
			s += detailStyle.Render(fmt.Sprintf("  Optimizations: %d", buildStatus.Optimizations)) + "\n"
		}
		if buildStatus.Duration > 0 {
			s += detailStyle.Render(fmt.Sprintf("  Duration: %dms", buildStatus.Duration)) + "\n"
		}
		s += "\n"
	}

	s += helpStyle.Render("esc: return to menu • ctrl+c: exit") + "\n"
	return s
}

func (m Model) renderWatch() string {
	watchStatus := m.backend.GetWatchStatus()
	s := "\n"

	// Title with mode indicator
	modeIcon := "👁️"
	if watchStatus.Mode == "shopify" {
		modeIcon = "🛍️"
	}
	s += titleStyle.Render(fmt.Sprintf("%s WATCH MODE", modeIcon)) + "\n\n"

	// Status
	status := "⏸️ NOT WATCHING"
	if watchStatus.IsActive {
		status = "✅ WATCHING"
	}
	s += statusStyle.Render(status) + "\n\n"

	// Watch statistics
	s += statsStyle.Render("📊 Statistics:") + "\n"

	// Show file count with better messaging
	fileCountText := "Files watched: "
	if watchStatus.FilesWatched == 0 {
		if watchStatus.IsActive {
			fileCountText += "Detecting..."
		} else {
			fileCountText += "0"
		}
	} else {
		fileCountText += fmt.Sprintf("%d", watchStatus.FilesWatched)
	}
	s += detailStyle.Render(fileCountText) + "\n"
	s += detailStyle.Render(fmt.Sprintf("Changes: %d", watchStatus.ChangeCount)) + "\n"

	lastChange := "--"
	if watchStatus.LastChange != "" {
		lastChange = watchStatus.LastChange
		if watchStatus.LastChangeAt != nil {
			lastChange += fmt.Sprintf(" (%s)", watchStatus.LastChangeAt.Format("15:04:05"))
		}
	}
	s += detailStyle.Render(fmt.Sprintf("Last change: %s", lastChange)) + "\n"

	if watchStatus.Mode != "" {
		s += detailStyle.Render(fmt.Sprintf("Mode: %s", watchStatus.Mode)) + "\n"
	}

	// Performance stats
	if watchStatus.CacheHits > 0 || watchStatus.HotReloads > 0 {
		s += "\n" + statsStyle.Render("⚡ Performance:") + "\n"
		if watchStatus.CacheHits > 0 {
			s += detailStyle.Render(fmt.Sprintf("  Cache hits: %d", watchStatus.CacheHits)) + "\n"
		}
		if watchStatus.HotReloads > 0 {
			s += detailStyle.Render(fmt.Sprintf("  Hot reloads: %d", watchStatus.HotReloads)) + "\n"
		}
		if watchStatus.TimeSaved > 0 {
			s += detailStyle.Render(fmt.Sprintf("  Time saved: %dms", watchStatus.TimeSaved)) + "\n"
		}
	}

	// Shopify URLs
	if watchStatus.Mode == "shopify" && (watchStatus.ShopifyURL != "" || watchStatus.PreviewURL != "") {
		s += "\n" + statsStyle.Render("🛍️ Shopify URLs:") + "\n"
		if watchStatus.ShopifyURL != "" {
			s += detailStyle.Render(fmt.Sprintf("  Local: %s", watchStatus.ShopifyURL)) + "\n"
		}
		if watchStatus.PreviewURL != "" {
			s += detailStyle.Render(fmt.Sprintf("  Preview: %s", watchStatus.PreviewURL)) + "\n"
		}
	}

	s += "\n"

	// Help text with controls
	helpText := "s: stop watch • r: restart watch • esc: return to menu • q: quit and cleanup"
	s += helpStyle.Render(helpText) + "\n"

	return s
}

// Styles using lipgloss
var (
	titleStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FF79C6")).
			Bold(true).
			Padding(0, 1)

	selectedStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#50FA7B")).
			Bold(true)

	normalStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#F8F8F2"))

	statusStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#8BE9FD")).
			Bold(true)

	progressStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#BD93F9"))

	statsStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFB86C")).
			Bold(true)

	infoStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#F8F8F2"))

	detailStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#6272A4"))

	helpStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#6272A4")).
			Italic(true)
)

func main() {
	// Initialize backend
	backend := NewBackend()

	// Enhanced cleanup function
	cleanup := func() {
		fmt.Println("\n🧹 Cleaning up processes...")
		backend.Cleanup()

		// Additional cleanup - kill any remaining Node processes
		if runtime.GOOS == "windows" {
			// Try to kill any remaining watch processes
			exec.Command("taskkill", "/f", "/im", "node.exe", "/fi", "WINDOWTITLE eq npm*").Run()
		}

		fmt.Println("✅ Cleanup completed")
	}

	// Setup signal handlers with enhanced cleanup
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		fmt.Println("\n⚠️ Received interrupt signal")
		cleanup()
		cancel()
		os.Exit(0)
	}()

	// Create and run the Bubble Tea app
	model := initialModel()
	model.backend = backend
	model.ctx = ctx
	model.cancel = cancel

	// Configure the program with cleanup
	p := tea.NewProgram(model, tea.WithAltScreen())

	// Enhanced key handler in the program
	defer cleanup()

	if err := p.Start(); err != nil {
		cleanup()
		fmt.Printf("Error running TUI: %v\n", err)
		os.Exit(1)
	}
}