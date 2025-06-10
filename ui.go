package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
)

// Dracula color scheme
var (
	// Primary colors
	backgroundColor = lipgloss.Color("#282a36")
	foregroundColor = lipgloss.Color("#f8f8f2")

	// Accent colors
	purpleColor  = lipgloss.Color("#bd93f9")
	pinkColor    = lipgloss.Color("#ff79c6")
	cyanColor    = lipgloss.Color("#8be9fd")
	greenColor   = lipgloss.Color("#50fa7b")
	orangeColor  = lipgloss.Color("#ffb86c")
	redColor     = lipgloss.Color("#ff5555")
	yellowColor  = lipgloss.Color("#f1fa8c")

	// Neutral colors
	commentColor = lipgloss.Color("#6272a4")
	mutedColor   = lipgloss.Color("#44475a")
)

// Styles
var (
	titleStyle = lipgloss.NewStyle().
		Foreground(purpleColor).
		Bold(true).
		Padding(0, 1)

	headerStyle = lipgloss.NewStyle().
		Foreground(pinkColor).
		Bold(true).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(mutedColor).
		Padding(1, 2).
		Margin(1, 0)

	menuItemStyle = lipgloss.NewStyle().
		Foreground(foregroundColor).
		Padding(0, 4)

	selectedMenuItemStyle = lipgloss.NewStyle().
		Foreground(backgroundColor).
		Background(pinkColor).
		Bold(true).
		Padding(0, 4)

	descriptionStyle = lipgloss.NewStyle().
		Foreground(commentColor).
		Padding(0, 4, 0, 8)

	statusActiveStyle = lipgloss.NewStyle().
		Foreground(greenColor).
		Bold(true)

	statusInactiveStyle = lipgloss.NewStyle().
		Foreground(commentColor)

	keyStyle = lipgloss.NewStyle().
		Foreground(pinkColor).
		Bold(true)

	helpStyle = lipgloss.NewStyle().
		Foreground(commentColor).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(mutedColor).
		Padding(1).
		Margin(1, 0)

	tabActiveStyle = lipgloss.NewStyle().
		Foreground(backgroundColor).
		Background(pinkColor).
		Bold(true).
		Padding(0, 2)

	tabInactiveStyle = lipgloss.NewStyle().
		Foreground(commentColor).
		Padding(0, 2)

	borderStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(mutedColor).
		Padding(1)
)

// renderMenu renders the main menu
func (m Model) renderMenu() string {
	var content strings.Builder

	// Title
	title := titleStyle.Render("🎨 Curalife Theme Builder")
	subtitle := lipgloss.NewStyle().
		Foreground(commentColor).
		Render("Professional development workflow with modern TUI")

	header := lipgloss.JoinVertical(
		lipgloss.Center,
		title,
		subtitle,
	)

	content.WriteString(headerStyle.Render(header))
	content.WriteString("\n\n")

	// Menu items
	for i, item := range m.menuItems {
		icon := lipgloss.NewStyle().Foreground(cyanColor).Render(item.Icon)
		key := keyStyle.Render(fmt.Sprintf("[%s]", item.Key))

		var itemText string
		if i == m.cursor {
			itemText = selectedMenuItemStyle.Render(fmt.Sprintf("%s %s %s", icon, key, item.Title))
		} else {
			itemText = menuItemStyle.Render(fmt.Sprintf("%s %s %s", icon, key, item.Title))
		}

		content.WriteString(itemText)
		content.WriteString("\n")

		// Description for selected item
		if i == m.cursor {
			desc := descriptionStyle.Render(item.Description)
			content.WriteString(desc)
			content.WriteString("\n")
		}
		content.WriteString("\n")
	}

	// Footer with help
	footer := helpStyle.Render("Press ? for help • Use ↑↓ or keys to navigate • Enter to select • q to quit")
	content.WriteString(footer)

	return borderStyle.Render(content.String())
}

// renderBuild renders the build progress view
func (m Model) renderBuild() string {
	var content strings.Builder

	// Header
	header := headerStyle.Render("🔨 Building Theme")
	content.WriteString(header)
	content.WriteString("\n\n")

	// Build progress
	progressPercent := int(m.buildProgress * 100)
	progressBar := renderProgressBar(progressPercent, 40)

	content.WriteString(lipgloss.NewStyle().Foreground(cyanColor).Render("Progress:"))
	content.WriteString("\n")
	content.WriteString(progressBar)
	content.WriteString(fmt.Sprintf(" %d%%", progressPercent))
	content.WriteString("\n\n")

	// Current step
	content.WriteString(lipgloss.NewStyle().Foreground(yellowColor).Render("Current Step:"))
	content.WriteString("\n")
	content.WriteString(lipgloss.NewStyle().Foreground(foregroundColor).Render(m.buildStep))
	content.WriteString("\n\n")

	// Status
	if m.isRunning {
		content.WriteString(statusActiveStyle.Render("⚡ Building..."))
	} else {
		if m.buildProgress >= 1.0 {
			content.WriteString(statusActiveStyle.Render("✅ Build Complete!"))
		} else {
			content.WriteString(statusInactiveStyle.Render("⏸️ Build Stopped"))
		}
	}

	content.WriteString("\n\n")
	content.WriteString(helpStyle.Render("Press Esc to return to menu"))

	return borderStyle.Render(content.String())
}

// renderWatch renders the watch status view
func (m Model) renderWatch() string {
	var content strings.Builder

	// Header
	icon := "👁️"
	if m.watchStatus.Mode == "shopify" {
		icon = "🛍️"
	}
	header := headerStyle.Render(fmt.Sprintf("%s Watch Mode (%s)", icon, strings.Title(m.watchStatus.Mode)))
	content.WriteString(header)
	content.WriteString("\n\n")

	// Status
	if m.watchStatus.IsActive {
		content.WriteString(statusActiveStyle.Render("🟢 Active"))
	} else {
		content.WriteString(statusInactiveStyle.Render("🔴 Inactive"))
	}
	content.WriteString("\n\n")

	// Statistics
	stats := []struct {
		label string
		value string
		color lipgloss.Color
	}{
		{"Files Watched", fmt.Sprintf("%d", m.watchStatus.FilesWatched), cyanColor},
		{"Changes Detected", fmt.Sprintf("%d", m.watchStatus.ChangeCount), greenColor},
		{"Hot Reloads", fmt.Sprintf("%d", m.watchStatus.HotReloads), pinkColor},
		{"Cache Hits", fmt.Sprintf("%d", m.watchStatus.CacheHits), orangeColor},
	}

	for _, stat := range stats {
		label := lipgloss.NewStyle().Foreground(stat.color).Render(stat.label + ":")
		value := lipgloss.NewStyle().Foreground(foregroundColor).Render(stat.value)
		content.WriteString(fmt.Sprintf("%-20s %s\n", label, value))
	}

	content.WriteString("\n\n")
	content.WriteString(helpStyle.Render("Press Esc to return to menu"))

	return borderStyle.Render(content.String())
}

// renderAnalytics renders the analytics view
func (m Model) renderAnalytics() string {
	var content strings.Builder

	// Header
	header := headerStyle.Render("📊 Analytics Dashboard")
	content.WriteString(header)
	content.WriteString("\n\n")

	// Tabs
	tabs := []string{"Overview", "Performance", "System", "Cache"}
	var tabsContent strings.Builder

	for i, tab := range tabs {
		var tabStyle lipgloss.Style
		if analyticsTab(i) == m.analyticsTab {
			tabStyle = tabActiveStyle
		} else {
			tabStyle = tabInactiveStyle
		}
		tabsContent.WriteString(tabStyle.Render(tab))
		if i < len(tabs)-1 {
			tabsContent.WriteString(" ")
		}
	}

	content.WriteString(tabsContent.String())
	content.WriteString("\n\n")

	// Tab content
	switch m.analyticsTab {
	case overviewTab:
		content.WriteString(renderOverviewTab(m.analyticsData.Overview))
	case performanceTab:
		content.WriteString(renderPerformanceTab(m.analyticsData.Performance))
	case systemTab:
		content.WriteString(renderSystemTab(m.analyticsData.System))
	case cacheTab:
		content.WriteString(renderCacheTab(m.analyticsData.Cache))
	}

	content.WriteString("\n\n")
	content.WriteString(helpStyle.Render("Press Tab/← → to switch tabs • Esc to return to menu"))

	return borderStyle.Render(content.String())
}

// renderLogs renders the logs view
func (m Model) renderLogs() string {
	var content strings.Builder

	// Header
	header := headerStyle.Render("📋 Build & Watch Logs")
	content.WriteString(header)
	content.WriteString("\n\n")

	// Show recent logs
	maxLogs := 10
	startIdx := 0
	if len(m.logs) > maxLogs {
		startIdx = len(m.logs) - maxLogs
	}

	for i := startIdx; i < len(m.logs); i++ {
		entry := m.logs[i]
		timestamp := ""
		if m.settings.ShowTimestamps {
			timestamp = entry.Timestamp.Format("15:04:05") + " "
		}

		levelColor := cyanColor
		switch entry.Level {
		case "success":
			levelColor = greenColor
		case "warning":
			levelColor = orangeColor
		case "error":
			levelColor = redColor
		}

		levelText := lipgloss.NewStyle().Foreground(levelColor).Render(fmt.Sprintf("[%s]", entry.Level))
		content.WriteString(fmt.Sprintf("%s%s %s\n", timestamp, levelText, entry.Message))
	}

	content.WriteString("\n\n")
	content.WriteString(helpStyle.Render("Showing last 10 entries • Esc to return to menu"))

	return borderStyle.Render(content.String())
}

// renderSettings renders the settings view
func (m Model) renderSettings() string {
	var content strings.Builder

	// Header
	header := headerStyle.Render("⚙️ Settings")
	content.WriteString(header)
	content.WriteString("\n\n")

	// Settings list
	settings := []struct {
		name  string
		value string
		desc  string
	}{
		{"Theme", m.settings.Theme, "UI color scheme"},
		{"Auto Watch", fmt.Sprintf("%t", m.settings.AutoWatch), "Start watching on launch"},
		{"Show Timestamps", fmt.Sprintf("%t", m.settings.ShowTimestamps), "Show timestamps in logs"},
		{"Enable Sound", fmt.Sprintf("%t", m.settings.EnableSound), "Audio notifications"},
		{"Auto Refresh", fmt.Sprintf("%t", m.settings.AutoRefresh), "Auto refresh data"},
		{"Refresh Interval", fmt.Sprintf("%ds", m.settings.RefreshInterval), "Data refresh rate"},
		{"Max Log Entries", fmt.Sprintf("%d", m.settings.MaxLogEntries), "Maximum log entries to keep"},
	}

	for _, setting := range settings {
		name := lipgloss.NewStyle().Foreground(cyanColor).Render(setting.name + ":")
		value := lipgloss.NewStyle().Foreground(greenColor).Render(setting.value)
		desc := lipgloss.NewStyle().Foreground(commentColor).Render(setting.desc)

		content.WriteString(fmt.Sprintf("%-20s %-10s %s\n", name, value, desc))
	}

	content.WriteString("\n\n")
	content.WriteString(helpStyle.Render("Settings are read-only in this version • Esc to return to menu"))

	return borderStyle.Render(content.String())
}

// Helper functions for analytics tabs
func renderOverviewTab(overview OverviewData) string {
	var content strings.Builder

	stats := []struct {
		label string
		value string
		color lipgloss.Color
	}{
		{"Total Builds", fmt.Sprintf("%d", overview.TotalBuilds), cyanColor},
		{"Total Watches", fmt.Sprintf("%d", overview.TotalWatches), greenColor},
		{"Success Rate", fmt.Sprintf("%.1f%%", float64(overview.Success)/float64(overview.TotalBuilds)*100), pinkColor},
		{"Avg Build Time", overview.AvgBuildTime.Truncate(time.Second).String(), orangeColor},
	}

	for _, stat := range stats {
		label := lipgloss.NewStyle().Foreground(stat.color).Render(stat.label + ":")
		value := lipgloss.NewStyle().Foreground(foregroundColor).Render(stat.value)
		content.WriteString(fmt.Sprintf("%-20s %s\n", label, value))
	}

	return content.String()
}

func renderPerformanceTab(perf PerformanceData) string {
	var content strings.Builder

	stats := []struct {
		label string
		value string
		color lipgloss.Color
	}{
		{"Average Build Time", perf.AvgBuildTime.Truncate(time.Second).String(), cyanColor},
		{"Fastest Build", perf.FastestBuild.Truncate(time.Second).String(), greenColor},
		{"Slowest Build", perf.SlowestBuild.Truncate(time.Second).String(), redColor},
		{"Files per Second", fmt.Sprintf("%.1f", perf.FilesPerSecond), pinkColor},
		{"Cache Hit Rate", fmt.Sprintf("%.1f%%", perf.CacheHitRate*100), orangeColor},
	}

	for _, stat := range stats {
		label := lipgloss.NewStyle().Foreground(stat.color).Render(stat.label + ":")
		value := lipgloss.NewStyle().Foreground(foregroundColor).Render(stat.value)
		content.WriteString(fmt.Sprintf("%-20s %s\n", label, value))
	}

	return content.String()
}

func renderSystemTab(sys SystemData) string {
	var content strings.Builder

	stats := []struct {
		label string
		value string
		color lipgloss.Color
	}{
		{"CPU Usage", fmt.Sprintf("%.1f%%", sys.CPUUsage), cyanColor},
		{"Memory Usage", fmt.Sprintf("%.1f%%", sys.MemoryUsage), greenColor},
		{"Disk Usage", fmt.Sprintf("%.1f%%", sys.DiskUsage), orangeColor},
		{"Open Files", fmt.Sprintf("%d", sys.OpenFiles), pinkColor},
		{"Process Count", fmt.Sprintf("%d", sys.ProcessCount), yellowColor},
		{"System Load", fmt.Sprintf("%.2f", sys.SystemLoad), purpleColor},
	}

	for _, stat := range stats {
		label := lipgloss.NewStyle().Foreground(stat.color).Render(stat.label + ":")
		value := lipgloss.NewStyle().Foreground(foregroundColor).Render(stat.value)
		content.WriteString(fmt.Sprintf("%-20s %s\n", label, value))
	}

	return content.String()
}

func renderCacheTab(cache CacheData) string {
	var content strings.Builder

	stats := []struct {
		label string
		value string
		color lipgloss.Color
	}{
		{"Total Entries", fmt.Sprintf("%d", cache.TotalEntries), cyanColor},
		{"Hit Rate", fmt.Sprintf("%.1f%%", cache.HitRate*100), greenColor},
		{"Miss Rate", fmt.Sprintf("%.1f%%", cache.MissRate*100), redColor},
		{"Cache Size", formatBytes(cache.CacheSize), pinkColor},
		{"Invalid Entries", fmt.Sprintf("%d", cache.InvalidEntries), orangeColor},
	}

	for _, stat := range stats {
		label := lipgloss.NewStyle().Foreground(stat.color).Render(stat.label + ":")
		value := lipgloss.NewStyle().Foreground(foregroundColor).Render(stat.value)
		content.WriteString(fmt.Sprintf("%-20s %s\n", label, value))
	}

	return content.String()
}

// renderProgressBar creates a visual progress bar
func renderProgressBar(percent, width int) string {
	if percent > 100 {
		percent = 100
	}
	if percent < 0 {
		percent = 0
	}

	filled := int(float64(width) * float64(percent) / 100.0)
	empty := width - filled

	bar := strings.Repeat("█", filled) + strings.Repeat("░", empty)

	// Color gradient
	if percent < 30 {
		return lipgloss.NewStyle().Foreground(redColor).Render(bar)
	} else if percent < 60 {
		return lipgloss.NewStyle().Foreground(orangeColor).Render(bar)
	} else if percent < 90 {
		return lipgloss.NewStyle().Foreground(yellowColor).Render(bar)
	} else {
		return lipgloss.NewStyle().Foreground(greenColor).Render(bar)
	}
}

// formatBytes formats bytes into human readable format
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}