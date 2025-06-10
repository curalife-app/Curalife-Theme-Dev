package main

import (
	"context"
	"fmt"
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
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
	Action      func(*Model) tea.Cmd
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

// LogEntry represents a log entry
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Source    string    `json:"source"`
}

// Settings represents user preferences
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

// Initialize creates a new model
func (m Model) Init() tea.Cmd {
	// Initialize menu items
	m.menuItems = []MenuItem{
		{
			Key:         "b",
			Title:       "Build",
			Description: "Build the theme for production",
			Icon:        "🔨",
			Action:      (*Model).startBuild,
		},
		{
			Key:         "w",
			Title:       "Watch",
			Description: "Start file watching for development",
			Icon:        "👁️",
			Action:      (*Model).startWatch,
		},
		{
			Key:         "s",
			Title:       "Shopify Watch",
			Description: "Watch with Shopify integration",
			Icon:        "🛍️",
			Action:      (*Model).startShopifyWatch,
		},
		{
			Key:         "a",
			Title:       "Analytics",
			Description: "View build analytics and performance",
			Icon:        "📊",
			Action:      (*Model).showAnalytics,
		},
		{
			Key:         "l",
			Title:       "Logs",
			Description: "View build and watch logs",
			Icon:        "📋",
			Action:      (*Model).showLogs,
		},
		{
			Key:         "c",
			Title:       "Settings",
			Description: "Configure TUI preferences",
			Icon:        "⚙️",
			Action:      (*Model).showSettings,
		},
	}

	// Initialize context
	m.ctx, m.cancel = context.WithCancel(context.Background())

	// Initialize backend
	m.backend = NewBackend()

	// Initialize settings with defaults
	m.settings = Settings{
		Theme:           "dracula",
		AutoWatch:       false,
		ShowTimestamps:  true,
		EnableSound:     false,
		AutoRefresh:     true,
		RefreshInterval: 5,
		MaxLogEntries:   1000,
		DefaultMode:     "menu",
	}

	return m.backend.Initialize()
}

// Action methods for menu items
func (m *Model) startBuild() tea.Cmd {
	m.currentMode = buildMode
	m.isRunning = true
	m.buildProgress = 0
	m.buildStep = "Initializing..."
	return m.backend.StartBuild()
}

func (m *Model) startWatch() tea.Cmd {
	m.currentMode = watchMode
	m.isRunning = true
	return m.backend.StartWatch(false)
}

func (m *Model) startShopifyWatch() tea.Cmd {
	m.currentMode = watchMode
	m.isRunning = true
	return m.backend.StartWatch(true)
}

func (m *Model) showAnalytics() tea.Cmd {
	m.currentMode = analyticsMode
	m.analyticsTab = overviewTab
	return m.backend.GetAnalytics()
}

func (m *Model) showLogs() tea.Cmd {
	m.currentMode = logsMode
	return m.backend.GetLogs()
}

func (m *Model) showSettings() tea.Cmd {
	m.currentMode = settingsMode
	return nil
}

// Update handles messages and updates the model
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

	case tea.KeyMsg:
		// Global keys
		switch msg.String() {
		case "q", "ctrl+c":
			if m.cancel != nil {
				m.cancel()
			}
			return m, tea.Quit
		case "?":
			m.showHelp = !m.showHelp
		case "esc":
			if m.currentMode != menuMode {
				if m.isRunning {
					m.backend.StopProcess()
					m.isRunning = false
				}
				m.currentMode = menuMode
			}
		}

		// Mode-specific keys
		switch m.currentMode {
		case menuMode:
			switch msg.String() {
			case "up", "k":
				if m.cursor > 0 {
					m.cursor--
				}
			case "down", "j":
				if m.cursor < len(m.menuItems)-1 {
					m.cursor++
				}
			case "enter", " ":
				if m.cursor < len(m.menuItems) {
					return m, m.menuItems[m.cursor].Action(&m)
				}
			default:
				// Handle direct key navigation
				for i, item := range m.menuItems {
					if msg.String() == item.Key {
						m.cursor = i
						return m, item.Action(&m)
					}
				}
			}

		case analyticsMode:
			switch msg.String() {
			case "tab", "right", "l":
				m.analyticsTab = (m.analyticsTab + 1) % 4
			case "left", "h":
				if m.analyticsTab == 0 {
					m.analyticsTab = 3
				} else {
					m.analyticsTab--
				}
			}
		}

	case BuildProgressMsg:
		m.buildProgress = msg.Progress
		m.buildStep = msg.Step

	case BuildCompleteMsg:
		m.isRunning = false
		m.buildProgress = 1.0
		m.buildStep = "Build completed!"

	case WatchStatusMsg:
		m.watchStatus = msg.Status

	case AnalyticsMsg:
		m.analyticsData = msg.Data

	case LogsMsg:
		m.logs = msg.Entries

	case ProcessOutputMsg:
		// Add to logs
		entry := LogEntry{
			Timestamp: time.Now(),
			Level:     msg.Level,
			Message:   msg.Message,
			Source:    msg.Source,
		}
		m.logs = append(m.logs, entry)

		// Keep only recent entries
		if len(m.logs) > m.settings.MaxLogEntries {
			m.logs = m.logs[len(m.logs)-m.settings.MaxLogEntries:]
		}
	}

	m.lastUpdate = time.Now()
	return m, nil
}

// View renders the UI
func (m Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	switch m.currentMode {
	case menuMode:
		return m.renderMenu()
	case buildMode:
		return m.renderBuild()
	case watchMode:
		return m.renderWatch()
	case analyticsMode:
		return m.renderAnalytics()
	case logsMode:
		return m.renderLogs()
	case settingsMode:
		return m.renderSettings()
	default:
		return "Unknown mode"
	}
}

func main() {
	// Initialize model
	m := Model{
		currentMode: menuMode,
		cursor:     0,
	}

	// Create program
	p := tea.NewProgram(m, tea.WithAltScreen())

	// Run program
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error running TUI: %v\n", err)
		os.Exit(1)
	}
}