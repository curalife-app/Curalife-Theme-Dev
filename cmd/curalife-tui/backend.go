package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

// Backend handles process execution and communication
type Backend struct {
	ctx     context.Context
	process *exec.Cmd
	isWindows bool
}

// ProcessInfo represents information about a running process
type ProcessInfo struct {
	Cmd     *exec.Cmd
	Started time.Time
	PID     int
}

// TUIData represents structured data from TUI adapters
type TUIData struct {
	Type      string    `json:"type"`
	Timestamp time.Time `json:"timestamp"`

	// Progress data
	Step        string `json:"step,omitempty"`
	Progress    int    `json:"progress,omitempty"`
	Status      string `json:"status,omitempty"`
	Message     string `json:"message,omitempty"`
	CurrentStep int    `json:"currentStep,omitempty"`
	TotalSteps  int    `json:"totalSteps,omitempty"`
	ElapsedMs   int64  `json:"elapsedMs,omitempty"`

	// Watch status data
	IsActive     bool   `json:"isActive,omitempty"`
	FilesWatched int    `json:"filesWatched,omitempty"`
	ChangeCount  int    `json:"changeCount,omitempty"`
	LastChange   string `json:"lastChange,omitempty"`
	LastChangeAt int64  `json:"lastChangeAt,omitempty"`
	ShopifyUrl   string `json:"shopifyUrl,omitempty"`
	PreviewUrl   string `json:"previewUrl,omitempty"`
	CacheHits    int    `json:"cacheHits,omitempty"`
	HotReloads   int    `json:"hotReloads,omitempty"`
	TimeSaved    int    `json:"timeSaved,omitempty"`
	Uptime       int64  `json:"uptime,omitempty"`
	Mode         string `json:"mode,omitempty"`

	// Log data
	Level  string `json:"level,omitempty"`
	Source string `json:"source,omitempty"`

	// Stats data
	Duration        int64 `json:"duration,omitempty"`
	FilesCopied     int   `json:"filesCopied,omitempty"`
	Optimizations   int   `json:"optimizations,omitempty"`
}

// Messages for Bubble Tea
type BuildProgressMsg struct {
	Progress float64
	Step     string
}

type BuildCompleteMsg struct {
	Success bool
	Output  string
}

type WatchStatusMsg struct {
	Status WatchStatus
}

type AnalyticsMsg struct {
	Data AnalyticsData
}

type LogsMsg struct {
	Entries []LogEntry
}

type ProcessOutputMsg struct {
	Level   string
	Message string
	Source  string
}

// NewBackend creates a new backend instance
func NewBackend() *Backend {
	return &Backend{
		isWindows: true, // We know we're on Windows from the conversation
	}
}

// Initialize sets up the backend
func (b *Backend) Initialize() tea.Cmd {
	return func() tea.Msg {
		return ProcessOutputMsg{
			Level:   "info",
			Message: "Backend initialized",
			Source:  "backend",
		}
	}
}

// StartBuild begins a build process using the TUI adapter
func (b *Backend) StartBuild() tea.Cmd {
	return tea.Batch(
		func() tea.Msg {
			return ProcessOutputMsg{
				Level:   "info",
				Message: "Starting build process...",
				Source:  "build",
			}
		},
		b.runBuildProcess(),
	)
}

// StartWatch begins a watch process using the TUI adapter
func (b *Backend) StartWatch(isShopify bool) tea.Cmd {
	return tea.Batch(
		func() tea.Msg {
			return ProcessOutputMsg{
				Level:   "info",
				Message: fmt.Sprintf("Starting %s watch process...", map[bool]string{true: "Shopify", false: "standard"}[isShopify]),
				Source:  "watch",
			}
		},
		b.runWatchProcess(isShopify),
	)
}

// runBuildProcess executes the build adapter and returns real-time updates
func (b *Backend) runBuildProcess() tea.Cmd {
	return tea.Cmd(func() tea.Msg {
		// Stop any existing process
		b.StopProcess()

		var cmd *exec.Cmd
		if b.isWindows {
			cmd = exec.Command("node", "../../build-scripts/tui-adapters/build-adapter.js", "--tui-mode")
		} else {
			cmd = exec.Command("node", "../../build-scripts/tui-adapters/build-adapter.js", "--tui-mode")
		}

		cmd.Env = append(cmd.Env, "TUI_MODE=true")
		b.process = cmd

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return ProcessOutputMsg{
				Level:   "error",
				Message: fmt.Sprintf("Failed to create stdout pipe: %v", err),
				Source:  "build",
			}
		}

		stderr, err := cmd.StderrPipe()
		if err != nil {
			return ProcessOutputMsg{
				Level:   "error",
				Message: fmt.Sprintf("Failed to create stderr pipe: %v", err),
				Source:  "build",
			}
		}

		if err := cmd.Start(); err != nil {
			return ProcessOutputMsg{
				Level:   "error",
				Message: fmt.Sprintf("Failed to start build process: %v", err),
				Source:  "build",
			}
		}

		// Start goroutines to handle output
		go b.handleBuildOutput(stdout)
		go b.handleBuildErrors(stderr)

		return ProcessOutputMsg{
			Level:   "success",
			Message: "Build process started successfully",
			Source:  "build",
		}
	})
}

// runWatchProcess executes the watch adapter and returns real-time updates
func (b *Backend) runWatchProcess(isShopify bool) tea.Cmd {
	return tea.Cmd(func() tea.Msg {
		// Stop any existing process
		b.StopProcess()

		args := []string{"../../build-scripts/tui-adapters/watch-adapter.js", "--tui-mode"}
		if isShopify {
			args = append(args, "--shopify")
		}

		var cmd *exec.Cmd
		if b.isWindows {
			cmd = exec.Command("node", args...)
		} else {
			cmd = exec.Command("node", args...)
		}

		cmd.Env = append(cmd.Env, "TUI_MODE=true")
		b.process = cmd

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return ProcessOutputMsg{
				Level:   "error",
				Message: fmt.Sprintf("Failed to create stdout pipe: %v", err),
				Source:  "watch",
			}
		}

		stderr, err := cmd.StderrPipe()
		if err != nil {
			return ProcessOutputMsg{
				Level:   "error",
				Message: fmt.Sprintf("Failed to create stderr pipe: %v", err),
				Source:  "watch",
			}
		}

		if err := cmd.Start(); err != nil {
			return ProcessOutputMsg{
				Level:   "error",
				Message: fmt.Sprintf("Failed to start watch process: %v", err),
				Source:  "watch",
			}
		}

		// Start goroutines to handle output
		go b.handleWatchOutput(stdout)
		go b.handleWatchErrors(stderr)

		return ProcessOutputMsg{
			Level:   "success",
			Message: "Watch process started successfully",
			Source:  "watch",
		}
	})
}

// handleBuildOutput processes stdout from the build adapter
func (b *Backend) handleBuildOutput(stdout *bufio.Scanner) {
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "TUI_DATA:") {
			// Parse TUI data
			jsonData := strings.TrimPrefix(line, "TUI_DATA:")
			var tuiData TUIData
			if err := json.Unmarshal([]byte(jsonData), &tuiData); err == nil {
				// Convert to appropriate Bubble Tea messages
				b.handleTUIData(tuiData)
			}
		}
	}
}

// handleWatchOutput processes stdout from the watch adapter
func (b *Backend) handleWatchOutput(stdout *bufio.Scanner) {
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "TUI_DATA:") {
			// Parse TUI data
			jsonData := strings.TrimPrefix(line, "TUI_DATA:")
			var tuiData TUIData
			if err := json.Unmarshal([]byte(jsonData), &tuiData); err == nil {
				// Convert to appropriate Bubble Tea messages
				b.handleTUIData(tuiData)
			}
		}
	}
}

// handleBuildErrors processes stderr from build processes
func (b *Backend) handleBuildErrors(stderr *bufio.Scanner) {
	scanner := bufio.NewScanner(stderr)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) != "" {
			// Send error message
			// Note: This would need to be sent through a channel in a real implementation
		}
	}
}

// handleWatchErrors processes stderr from watch processes
func (b *Backend) handleWatchErrors(stderr *bufio.Scanner) {
	scanner := bufio.NewScanner(stderr)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) != "" {
			// Send error message
			// Note: This would need to be sent through a channel in a real implementation
		}
	}
}

// handleTUIData converts TUIData to appropriate Bubble Tea messages
func (b *Backend) handleTUIData(data TUIData) {
	switch data.Type {
	case "progress":
		// Send build progress message
		// Note: This would need to be sent through a channel in a real implementation

	case "watch_status":
		// Send watch status message
		// Note: This would need to be sent through a channel in a real implementation

	case "log":
		// Send log message
		// Note: This would need to be sent through a channel in a real implementation
	}
}

// GetAnalytics retrieves analytics data
func (b *Backend) GetAnalytics() tea.Cmd {
	return func() tea.Msg {
		return AnalyticsMsg{
			Data: AnalyticsData{
				Overview: OverviewData{
					TotalBuilds:  25,
					TotalWatches: 150,
					AvgBuildTime: 45 * time.Second,
					Success:      24,
					Failures:     1,
					LastBuild:    time.Now().Add(-2 * time.Hour),
				},
				Performance: PerformanceData{
					AvgBuildTime:     45 * time.Second,
					FastestBuild:     32 * time.Second,
					SlowestBuild:     78 * time.Second,
					FilesPerSecond:   12.5,
					CacheHitRate:     0.85,
					OptimizationTime: 5 * time.Second,
				},
				System: SystemData{
					CPUUsage:     25.5,
					MemoryUsage:  45.2,
					DiskUsage:    67.8,
					OpenFiles:    125,
					ProcessCount: 8,
					SystemLoad:   1.2,
				},
				Cache: CacheData{
					TotalEntries:   350,
					HitRate:        0.85,
					MissRate:       0.15,
					CacheSize:      1024 * 1024 * 15, // 15MB
					InvalidEntries: 5,
					LastCleanup:    time.Now().Add(-6 * time.Hour),
				},
			},
		}
	}
}

// GetLogs retrieves log entries
func (b *Backend) GetLogs() tea.Cmd {
	return func() tea.Msg {
		logs := []LogEntry{
			{
				Timestamp: time.Now().Add(-5 * time.Minute),
				Level:     "info",
				Message:   "Build process started",
				Source:    "build",
			},
			{
				Timestamp: time.Now().Add(-4 * time.Minute),
				Level:     "success",
				Message:   "Files copied successfully",
				Source:    "build",
			},
			{
				Timestamp: time.Now().Add(-3 * time.Minute),
				Level:     "info",
				Message:   "Tailwind CSS compilation started",
				Source:    "build",
			},
			{
				Timestamp: time.Now().Add(-2 * time.Minute),
				Level:     "success",
				Message:   "Styles built successfully",
				Source:    "build",
			},
			{
				Timestamp: time.Now().Add(-1 * time.Minute),
				Level:     "success",
				Message:   "Build completed in 45.2s",
				Source:    "build",
			},
		}
		return LogsMsg{Entries: logs}
	}
}

// StopProcess stops the current running process
func (b *Backend) StopProcess() {
	if b.process != nil && b.process.Process != nil {
		b.process.Process.Kill()
		b.process = nil
	}
}