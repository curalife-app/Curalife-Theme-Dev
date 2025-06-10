package main

import (
	"context"
	"fmt"
	"os"
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

// Analytics tabs
type analyticsTab int

const (
	overviewTab analyticsTab = iota
	performanceTab
	systemTab
	cacheTab
)

// MenuItem represents a menu option
type MenuItem struct {
	Key         string
	Title       string
	Description string
	Icon        string
}

// Model represents the application state
type Model struct {
	// Navigation
	currentMode     mode
	cursor          int
	analyticsTab    analyticsTab
	showHelp        bool
	width           int
	height          int

	// Menu items
	menuItems []MenuItem

	// Backend integration
	backend *Backend
	ctx     context.Context
	cancel  context.CancelFunc

	// State data
	buildProgress    float64
	buildStep        string
	watchStatus      WatchStatus
	analyticsData    AnalyticsData
	logs             []LogEntry
	settings         Settings

	// Process management
	currentProcess   *ProcessInfo
	isRunning        bool
	lastUpdate       time.Time
}

// WatchStatus represents the current watch state
type WatchStatus struct {
	IsActive     bool      `json:"is_active"`
	FilesWatched int       `json:"files_watched"`
	ChangeCount  int       `json:"change_count"`
	LastChange   string    `json:"last_change"`
	LastChangeAt time.Time `json:"last_change_at"`
	ShopifyURL   string    `json:"shopify_url"`
	PreviewURL   string    `json:"preview_url"`
	CacheHits    int       `json:"cache_hits"`
	HotReloads   int       `json:"hot_reloads"`
	TimeSaved    int       `json:"time_saved"`
	Uptime       int64     `json:"uptime"`
	Mode         string    `json:"mode"`
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

func initialModel() Model {
	backend := NewBackend()
	ctx, cancel := context.WithCancel(context.Background())

	m := Model{
		currentMode:  menuMode,
		cursor:       0,
		analyticsTab: overviewTab,
		showHelp:     false,
		backend:      backend,
		ctx:          ctx,
		cancel:       cancel,
		menuItems: []MenuItem{
			{Key: "b", Title: "Build", Description: "Run production build", Icon: "🔨"},
			{Key: "w", Title: "Watch", Description: "Start file watcher", Icon: "👁️"},
			{Key: "s", Title: "Shopify Watch", Description: "Watch with Shopify dev", Icon: "🛍️"},
			{Key: "a", Title: "Analytics", Description: "View build analytics", Icon: "📊"},
			{Key: "l", Title: "Logs", Description: "View build logs", Icon: "📄"},
			{Key: "c", Title: "Settings", Description: "Configure options", Icon: "⚙️"},
		},
		settings: Settings{
			Theme:           "dracula",
			AutoWatch:       false,
			ShowTimestamps:  true,
			EnableSound:     false,
			AutoRefresh:     true,
			RefreshInterval: 5,
			MaxLogEntries:   100,
			DefaultMode:     "menu",
		},
		lastUpdate: time.Now(),
	}

	return m
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		tea.EnterAltScreen,
		func() tea.Msg {
			return tickMsg(time.Now())
		},
	)
}

// Messages
type tickMsg time.Time

func tickCmd() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

type buildStartMsg struct{}
type buildCompleteMsg struct{}
type watchStartMsg struct{}
type watchStopMsg struct{}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			if m.cancel != nil {
				m.cancel()
			}
			return m, tea.Quit

		case "esc":
			if m.currentMode != menuMode {
				m.currentMode = menuMode
				m.cursor = 0
				return m, nil
			}

		case "?":
			m.showHelp = !m.showHelp
			return m, nil

		case "up", "k":
			if m.currentMode == menuMode {
				if m.cursor > 0 {
					m.cursor--
				}
			}

		case "down", "j":
			if m.currentMode == menuMode {
				if m.cursor < len(m.menuItems)-1 {
					m.cursor++
				}
			}

		case "left", "h":
			if m.currentMode == analyticsMode {
				if m.analyticsTab > 0 {
					m.analyticsTab--
				}
			}

		case "right", "l":
			if m.currentMode == analyticsMode {
				if m.analyticsTab < cacheTab {
					m.analyticsTab++
				}
			}

		case "enter", " ":
			if m.currentMode == menuMode {
				return m.handleMenuAction()
			}

		// Quick navigation keys
		case "b":
			if m.currentMode == menuMode {
				m.cursor = 0
				return m.handleMenuAction()
			}
		case "w":
			if m.currentMode == menuMode {
				m.cursor = 1
				return m.handleMenuAction()
			}
		case "s":
			if m.currentMode == menuMode {
				m.cursor = 2
				return m.handleMenuAction()
			}
		case "a":
			if m.currentMode == menuMode {
				m.cursor = 3
				return m.handleMenuAction()
			}
		}

	case tickMsg:
		m.lastUpdate = time.Time(msg)
		return m, tickCmd()

	case buildStartMsg:
		m.currentMode = buildMode
		m.isRunning = true
		m.buildProgress = 0
		m.buildStep = "Starting build..."
		return m, nil

	case buildCompleteMsg:
		m.isRunning = false
		m.buildProgress = 100
		m.buildStep = "Build completed!"
		return m, nil

	case watchStartMsg:
		m.currentMode = watchMode
		m.watchStatus.IsActive = true
		return m, nil

	case watchStopMsg:
		m.watchStatus.IsActive = false
		return m, nil
	}

	return m, nil
}

func (m Model) handleMenuAction() (Model, tea.Cmd) {
	if m.cursor >= len(m.menuItems) {
		return m, nil
	}

	item := m.menuItems[m.cursor]
	switch item.Key {
	case "b":
		return m, func() tea.Msg { return buildStartMsg{} }
	case "w":
		return m, func() tea.Msg { return watchStartMsg{} }
	case "s":
		return m, func() tea.Msg { return watchStartMsg{} }
	case "a":
		m.currentMode = analyticsMode
		return m, nil
	case "l":
		m.currentMode = logsMode
		return m, nil
	case "c":
		m.currentMode = settingsMode
		return m, nil
	}

	return m, nil
}

func (m Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	switch m.currentMode {
	case menuMode:
		return renderMenu(m)
	case buildMode:
		return renderBuild(m)
	case watchMode:
		return renderWatch(m)
	case analyticsMode:
		return renderAnalytics(m)
	case logsMode:
		return renderLogs(m)
	case settingsMode:
		return renderSettings(m)
	default:
		return renderMenu(m)
	}
}

func main() {
	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if err := p.Start(); err != nil {
		fmt.Printf("Error running program: %v\n", err)
		os.Exit(1)
	}
}