package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

// WatchStatus represents the current watch state
type WatchStatus struct {
	IsActive      bool       `json:"isActive"`
	FilesWatched  int        `json:"filesWatched"`
	ChangeCount   int        `json:"changeCount"`
	LastChange    string     `json:"lastChange"`
	LastChangeAt  *time.Time `json:"lastChangeAt"`
	ShopifyURL    string     `json:"shopifyUrl"`
	PreviewURL    string     `json:"previewUrl"`
	CacheHits     int        `json:"cacheHits"`
	HotReloads    int        `json:"hotReloads"`
	TimeSaved     int        `json:"timeSaved"`
	Uptime        int64      `json:"uptime"`
	Mode          string     `json:"mode"`
}

// Backend handles process execution and communication
type Backend struct {
	mutex       sync.RWMutex
	watchStatus WatchStatus
	buildStatus BuildStatus
	process     *exec.Cmd
	isWatching  bool
}

// BuildStatus represents the current build state
type BuildStatus struct {
	IsRunning     bool   `json:"is_running"`
	Progress      int    `json:"progress"`
	CurrentStep   string `json:"current_step"`
	Message       string `json:"message"`
	FilesCopied   int    `json:"files_copied"`
	Duration      int64  `json:"duration"`
	CacheHits     int    `json:"cache_hits"`
	Optimizations int    `json:"optimizations"`
}

// TUI Data structure for parsing JSON output
type TUIData struct {
	Type      string      `json:"type"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
	// Watch status fields
	IsActive      *bool      `json:"isActive,omitempty"`
	FilesWatched  *int       `json:"filesWatched,omitempty"`
	ChangeCount   *int       `json:"changeCount,omitempty"`
	LastChange    *string    `json:"lastChange,omitempty"`
	LastChangeAt  *int64     `json:"lastChangeAt,omitempty"`
	ShopifyURL    *string    `json:"shopifyUrl,omitempty"`
	PreviewURL    *string    `json:"previewUrl,omitempty"`
	CacheHits     *int       `json:"cacheHits,omitempty"`
	HotReloads    *int       `json:"hotReloads,omitempty"`
	TimeSaved     *int       `json:"timeSaved,omitempty"`
	Uptime        *int64     `json:"uptime,omitempty"`
	Mode          *string    `json:"mode,omitempty"`
	// Build status fields
	IsRunning     *bool   `json:"isRunning,omitempty"`
	Progress      *int    `json:"progress,omitempty"`
	CurrentStep   *string `json:"currentStep,omitempty"`
	Message       *string `json:"message,omitempty"`
	FilesCopied   *int    `json:"filesCopied,omitempty"`
	Duration      *int64  `json:"duration,omitempty"`
	Optimizations *int    `json:"optimizations,omitempty"`
	// Additional build adapter fields
	Step         *string `json:"step,omitempty"`
	Status       *string `json:"status,omitempty"`
	TotalSteps   *int    `json:"totalSteps,omitempty"`
	ElapsedMs    *int64  `json:"elapsedMs,omitempty"`
	Level        *string `json:"level,omitempty"`
	Source       *string `json:"source,omitempty"`
}

// NewBackend creates a new backend instance
func NewBackend() *Backend {
	return &Backend{
		watchStatus: WatchStatus{
			IsActive:     false,
			FilesWatched: 0,
			ChangeCount:  0,
			LastChange:   "",
			Mode:         "standard",
		},
		buildStatus: BuildStatus{
			IsRunning: false,
			Progress:  0,
		},
		isWatching: false,
	}
}

// Initialize sets up the backend
func (b *Backend) Initialize() error {
	return nil
}

// StartBuild begins a build process
func (b *Backend) StartBuild() error {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if b.buildStatus.IsRunning {
		return fmt.Errorf("build is already running")
	}

	// Determine the adapter command (relative to project root since we set cmd.Dir)
	adapterPath := filepath.Join("build-scripts", "tui-adapters", "build-adapter.js")
	args := []string{adapterPath, "--tui-mode"}

	// Set working directory to project root
	cmd := exec.Command("node", args...)
	cmd.Dir = filepath.Join("..", "..")
	cmd.Env = append(os.Environ(), "TUI_MODE=true")

	// Get stdout pipe for reading TUI data
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	// Set stderr to avoid blocking
	cmd.Stderr = os.Stderr

	// Start the process
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start build process: %v", err)
	}

	b.buildStatus = BuildStatus{
		IsRunning:   true,
		Progress:    0,
		CurrentStep: "initializing",
		Message:     "Starting build...",
	}

	// Start goroutine to read and parse TUI data
	go b.parseBuildOutput(stdout)

	// Start goroutine to monitor process
	go b.monitorBuildProcess(cmd)

	return nil
}

// StartWatch automatically starts the watch process
func (b *Backend) StartWatch(isShopify bool) error {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if b.isWatching {
		return fmt.Errorf("watch is already running")
	}

	// Determine the adapter command (relative to project root since we set cmd.Dir)
	adapterPath := filepath.Join("build-scripts", "tui-adapters", "watch-adapter.js")
	args := []string{adapterPath, "--tui-mode"}
	if isShopify {
		args = append(args, "--shopify")
	}

	// Set working directory to project root
	cmd := exec.Command("node", args...)
	cmd.Dir = filepath.Join("..", "..")
	cmd.Env = append(os.Environ(), "TUI_MODE=true")

	// Get stdout pipe for reading TUI data
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %v", err)
	}

	// Set stderr to avoid blocking
	cmd.Stderr = os.Stderr

	// Start the process
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start watch process: %v", err)
	}

	b.process = cmd
	b.isWatching = true

	// Initialize watch status
	b.watchStatus = WatchStatus{
		IsActive:     false, // Will be set to true when watch adapter confirms startup
		FilesWatched: 0,     // Will be updated by adapter
		ChangeCount:  0,
		LastChange:   "Starting...",
		Mode:         "standard",
	}
	if isShopify {
		b.watchStatus.Mode = "shopify"
	}

	// Start goroutine to read and parse TUI data
	go b.parseWatchOutput(stdout)

	// Start goroutine to monitor process
	go b.monitorWatchProcess()

	return nil
}

func (b *Backend) parseWatchOutput(stdout interface{}) {
	if pipe, ok := stdout.(interface{ Read([]byte) (int, error) }); ok {
		scanner := bufio.NewScanner(pipe)
		for scanner.Scan() {
			line := scanner.Text()

			// Parse TUI_DATA lines
			if strings.HasPrefix(line, "TUI_DATA:") {
				jsonData := strings.TrimPrefix(line, "TUI_DATA:")
				b.parseTUIData(jsonData)
			}
		}
	}
}

func (b *Backend) parseTUIData(jsonData string) {
	var tuiData TUIData
	if err := json.Unmarshal([]byte(jsonData), &tuiData); err != nil {
		return // Ignore malformed JSON
	}

	b.mutex.Lock()
	defer b.mutex.Unlock()

	// Update watch status based on TUI data type
	switch tuiData.Type {
	case "watch_status":
		if tuiData.IsActive != nil {
			b.watchStatus.IsActive = *tuiData.IsActive
		}
		if tuiData.FilesWatched != nil {
			b.watchStatus.FilesWatched = *tuiData.FilesWatched
		}
		if tuiData.ChangeCount != nil {
			b.watchStatus.ChangeCount = *tuiData.ChangeCount
		}
		if tuiData.LastChange != nil {
			b.watchStatus.LastChange = *tuiData.LastChange
		}
		if tuiData.LastChangeAt != nil {
			changeTime := time.Unix(*tuiData.LastChangeAt/1000, 0)
			b.watchStatus.LastChangeAt = &changeTime
		}
		if tuiData.ShopifyURL != nil {
			b.watchStatus.ShopifyURL = *tuiData.ShopifyURL
		}
		if tuiData.PreviewURL != nil {
			b.watchStatus.PreviewURL = *tuiData.PreviewURL
		}
		if tuiData.CacheHits != nil {
			b.watchStatus.CacheHits = *tuiData.CacheHits
		}
		if tuiData.HotReloads != nil {
			b.watchStatus.HotReloads = *tuiData.HotReloads
		}
		if tuiData.TimeSaved != nil {
			b.watchStatus.TimeSaved = *tuiData.TimeSaved
		}
		if tuiData.Uptime != nil {
			b.watchStatus.Uptime = *tuiData.Uptime
		}
		if tuiData.Mode != nil {
			b.watchStatus.Mode = *tuiData.Mode
		}
	}
}

func (b *Backend) monitorWatchProcess() {
	if b.process == nil {
		return
	}

	// Wait for process to complete
	b.process.Wait()

	b.mutex.Lock()
	defer b.mutex.Unlock()

	// Mark as inactive when process ends
	b.isWatching = false
	b.watchStatus.IsActive = false
	b.process = nil
}

// StopWatch stops the watch process gracefully
func (b *Backend) StopWatch() error {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if !b.isWatching || b.process == nil {
		return fmt.Errorf("no watch process running")
	}

	// Try graceful shutdown first (SIGINT)
	if b.process.Process != nil {
		if err := b.process.Process.Signal(syscall.SIGINT); err != nil {
			// If graceful shutdown fails, force kill
			if killErr := b.process.Process.Kill(); killErr != nil {
				return fmt.Errorf("failed to stop watch process: %v", killErr)
			}
		}
	}

	b.isWatching = false
	b.watchStatus.IsActive = false
	b.process = nil

	return nil
}

// StopProcess stops any running process (watch or build)
func (b *Backend) StopProcess() error {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	var errs []string

	// Stop watch process if running
	if b.isWatching && b.process != nil {
		if b.process.Process != nil {
			// Try graceful shutdown first
			if err := b.process.Process.Signal(syscall.SIGINT); err != nil {
				// If graceful shutdown fails, force kill
				if killErr := b.process.Process.Kill(); killErr != nil {
					errs = append(errs, fmt.Sprintf("failed to stop watch process: %v", killErr))
				}
			}
		}
		b.isWatching = false
		b.watchStatus.IsActive = false
		b.process = nil
	}

	// Reset build status if running
	if b.buildStatus.IsRunning {
		b.buildStatus.IsRunning = false
		b.buildStatus.Message = "Build stopped"
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors stopping processes: %s", strings.Join(errs, "; "))
	}

	return nil
}

func (b *Backend) parseBuildOutput(stdout interface{}) {
	if pipe, ok := stdout.(interface{ Read([]byte) (int, error) }); ok {
		scanner := bufio.NewScanner(pipe)
		for scanner.Scan() {
			line := scanner.Text()

			// Parse TUI_DATA lines
			if strings.HasPrefix(line, "TUI_DATA:") {
				jsonData := strings.TrimPrefix(line, "TUI_DATA:")
				b.parseBuildTUIData(jsonData)
			}
		}
	}
}

func (b *Backend) parseBuildTUIData(jsonData string) {
	var tuiData TUIData
	if err := json.Unmarshal([]byte(jsonData), &tuiData); err != nil {
		return // Ignore malformed JSON
	}

	b.mutex.Lock()
	defer b.mutex.Unlock()

	// Update build status based on TUI data type
	switch tuiData.Type {
	case "progress":
		if tuiData.Progress != nil {
			b.buildStatus.Progress = *tuiData.Progress
		}
		if tuiData.Message != nil {
			b.buildStatus.Message = *tuiData.Message
		}
		// Extract step name from message or use status
		if strings.Contains(b.buildStatus.Message, "File Copy") {
			b.buildStatus.CurrentStep = "File Copy"
		} else if strings.Contains(b.buildStatus.Message, "Tailwind") || strings.Contains(b.buildStatus.Message, "styles") {
			b.buildStatus.CurrentStep = "Building Styles"
		} else if strings.Contains(b.buildStatus.Message, "Vite") || strings.Contains(b.buildStatus.Message, "scripts") {
			b.buildStatus.CurrentStep = "Building Scripts"
		} else if strings.Contains(b.buildStatus.Message, "completed") {
			b.buildStatus.CurrentStep = "Completed"
		}
	case "stats":
		if tuiData.FilesCopied != nil {
			b.buildStatus.FilesCopied = *tuiData.FilesCopied
		}
		if tuiData.Duration != nil {
			b.buildStatus.Duration = *tuiData.Duration
		}
		if tuiData.CacheHits != nil {
			b.buildStatus.CacheHits = *tuiData.CacheHits
		}
		if tuiData.Optimizations != nil {
			b.buildStatus.Optimizations = *tuiData.Optimizations
		}
		// Mark as completed when we receive final stats
		if b.buildStatus.Progress >= 100 {
			b.buildStatus.IsRunning = false
			b.buildStatus.CurrentStep = "Completed"
			b.buildStatus.Message = "Build completed successfully"
		}
	case "log":
		// Handle log messages for status updates
		if tuiData.Message != nil {
			message := *tuiData.Message
			if strings.Contains(message, "Build completed") {
				b.buildStatus.Progress = 100
				b.buildStatus.IsRunning = false
				b.buildStatus.CurrentStep = "Completed"
				b.buildStatus.Message = "Build completed successfully"
			}
		}
	}
}

func (b *Backend) monitorBuildProcess(cmd *exec.Cmd) {
	// Wait for process to complete
	cmd.Wait()

	b.mutex.Lock()
	defer b.mutex.Unlock()

	// Mark as completed when process ends
	b.buildStatus.IsRunning = false
	if b.buildStatus.Progress < 100 {
		b.buildStatus.Progress = 100
		b.buildStatus.Message = "Build completed"
	}
}

// GetWatchStatus retrieves the current watch status
func (b *Backend) GetWatchStatus() WatchStatus {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.watchStatus
}

// GetBuildStatus retrieves the current build status
func (b *Backend) GetBuildStatus() BuildStatus {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.buildStatus
}

// IsWatchActive checks if the watch process is active
func (b *Backend) IsWatchActive() bool {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.isWatching && b.watchStatus.IsActive
}

// Cleanup method to be called when the TUI exits
func (b *Backend) Cleanup() error {
	return b.StopProcess()
}

// Placeholder methods for missing functionality
func (b *Backend) GetAnalytics() error {
	// TODO: Implement analytics retrieval
	return nil
}

func (b *Backend) GetLogs() error {
	// TODO: Implement log retrieval
	return nil
}