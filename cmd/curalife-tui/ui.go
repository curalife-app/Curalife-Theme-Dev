package main

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Simple rendering functions using only lipgloss

func renderMenu(m Model) string {
	var b strings.Builder

	// Title
	titleStyle := lipgloss.NewStyle().
		Foreground(primaryColor).
		Bold(true).
		Padding(1, 0).
		Align(lipgloss.Center)

	b.WriteString(titleStyle.Render("🎭 CURALIFE THEME BUILDER"))
	b.WriteString("\n\n")

	// Menu items
	for i, item := range m.menuItems {
		style := lipgloss.NewStyle().
			Padding(0, 2).
			Margin(0, 1)

		if i == m.cursor {
			style = style.
				Background(selectionColor).
				Foreground(textColor).
				Bold(true)
		} else {
			style = style.
				Foreground(mutedColor)
		}

		line := fmt.Sprintf("%s %s - %s", item.Icon, item.Title, item.Description)
		b.WriteString(style.Render(line))
		b.WriteString("\n")
	}

	// Help
	b.WriteString("\n")
	helpStyle := lipgloss.NewStyle().
		Foreground(mutedColor).
		Italic(true)

	b.WriteString(helpStyle.Render("Use ↑/↓ to navigate, Enter to select, q to quit"))

	return b.String()
}

func renderBuild(m Model) string {
	var b strings.Builder

	// Header
	headerStyle := lipgloss.NewStyle().
		Foreground(primaryColor).
		Bold(true).
		Padding(1, 0)

	b.WriteString(headerStyle.Render("🔨 BUILD MODE"))
	b.WriteString("\n\n")

	// Progress
	if m.isRunning {
		progressStyle := lipgloss.NewStyle().
			Foreground(accentColor).
			Bold(true)

		b.WriteString(progressStyle.Render(fmt.Sprintf("Progress: %.1f%%", m.buildProgress)))
		b.WriteString("\n")

		if m.buildStep != "" {
			stepStyle := lipgloss.NewStyle().
				Foreground(textColor)

			b.WriteString(stepStyle.Render(fmt.Sprintf("Step: %s", m.buildStep)))
		}
	} else {
		statusStyle := lipgloss.NewStyle().
			Foreground(successColor).
			Bold(true)

		b.WriteString(statusStyle.Render("Ready to build"))
	}

	b.WriteString("\n\n")

	// Instructions
	instructStyle := lipgloss.NewStyle().
		Foreground(mutedColor)

	b.WriteString(instructStyle.Render("Press 'Enter' to start build, 'Esc' to return to menu"))

	return b.String()
}

func renderWatch(m Model) string {
	var b strings.Builder

	// Header
	headerStyle := lipgloss.NewStyle().
		Foreground(primaryColor).
		Bold(true).
		Padding(1, 0)

	b.WriteString(headerStyle.Render("👁️ WATCH MODE"))
	b.WriteString("\n\n")

	// Status
	if m.watchStatus.IsActive {
		statusStyle := lipgloss.NewStyle().
			Foreground(successColor).
			Bold(true)

		b.WriteString(statusStyle.Render("🟢 WATCHING"))
		b.WriteString("\n\n")

		// Stats
		statsStyle := lipgloss.NewStyle().
			Foreground(textColor)

		b.WriteString(statsStyle.Render(fmt.Sprintf("Files watched: %d", m.watchStatus.FilesWatched)))
		b.WriteString("\n")
		b.WriteString(statsStyle.Render(fmt.Sprintf("Changes: %d", m.watchStatus.ChangeCount)))
		b.WriteString("\n")

		if m.watchStatus.LastChange != "" {
			b.WriteString(statsStyle.Render(fmt.Sprintf("Last change: %s", m.watchStatus.LastChange)))
			b.WriteString("\n")
		}

		if m.watchStatus.ShopifyURL != "" {
			urlStyle := lipgloss.NewStyle().
				Foreground(accentColor).
				Underline(true)

			b.WriteString("Local URL: ")
			b.WriteString(urlStyle.Render(m.watchStatus.ShopifyURL))
			b.WriteString("\n")
		}
	} else {
		statusStyle := lipgloss.NewStyle().
			Foreground(warningColor).
			Bold(true)

		b.WriteString(statusStyle.Render("⏸️ NOT WATCHING"))
	}

	b.WriteString("\n\n")

	// Instructions
	instructStyle := lipgloss.NewStyle().
		Foreground(mutedColor)

	if m.watchStatus.IsActive {
		b.WriteString(instructStyle.Render("Press 'Enter' to stop watch, 'Esc' to return to menu"))
	} else {
		b.WriteString(instructStyle.Render("Press 'Enter' to start watch, 'Esc' to return to menu"))
	}

	return b.String()
}

func renderAnalytics(m Model) string {
	var b strings.Builder

	// Header
	headerStyle := lipgloss.NewStyle().
		Foreground(primaryColor).
		Bold(true).
		Padding(1, 0)

	b.WriteString(headerStyle.Render("📊 ANALYTICS"))
	b.WriteString("\n\n")

	// Tabs
	tabs := []string{"Overview", "Performance", "System", "Cache"}
	for i, tab := range tabs {
		style := lipgloss.NewStyle().
			Padding(0, 2).
			Margin(0, 1)

		if analyticsTab(i) == m.analyticsTab {
			style = style.
				Background(selectionColor).
				Foreground(textColor).
				Bold(true)
		} else {
			style = style.
				Foreground(mutedColor)
		}

		b.WriteString(style.Render(tab))
	}

	b.WriteString("\n\n")

	// Content based on selected tab
	contentStyle := lipgloss.NewStyle().
		Foreground(textColor)

	switch m.analyticsTab {
	case overviewTab:
		b.WriteString(contentStyle.Render(fmt.Sprintf("Total Builds: %d", m.analyticsData.Overview.TotalBuilds)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Success Rate: %d/%d", m.analyticsData.Overview.Success, m.analyticsData.Overview.TotalBuilds)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Avg Build Time: %v", m.analyticsData.Overview.AvgBuildTime)))

	case performanceTab:
		b.WriteString(contentStyle.Render(fmt.Sprintf("Cache Hit Rate: %.1f%%", m.analyticsData.Performance.CacheHitRate)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Files/sec: %.1f", m.analyticsData.Performance.FilesPerSecond)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Fastest Build: %v", m.analyticsData.Performance.FastestBuild)))

	case systemTab:
		b.WriteString(contentStyle.Render(fmt.Sprintf("CPU Usage: %.1f%%", m.analyticsData.System.CPUUsage)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Memory Usage: %.1f%%", m.analyticsData.System.MemoryUsage)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Open Files: %d", m.analyticsData.System.OpenFiles)))

	case cacheTab:
		b.WriteString(contentStyle.Render(fmt.Sprintf("Cache Entries: %d", m.analyticsData.Cache.TotalEntries)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Hit Rate: %.1f%%", m.analyticsData.Cache.HitRate)))
		b.WriteString("\n")
		b.WriteString(contentStyle.Render(fmt.Sprintf("Cache Size: %d bytes", m.analyticsData.Cache.CacheSize)))
	}

	b.WriteString("\n\n")

	// Instructions
	instructStyle := lipgloss.NewStyle().
		Foreground(mutedColor)

	b.WriteString(instructStyle.Render("Use ←/→ to switch tabs, 'Esc' to return to menu"))

	return b.String()
}

func renderLogs(m Model) string {
	var b strings.Builder

	// Header
	headerStyle := lipgloss.NewStyle().
		Foreground(primaryColor).
		Bold(true).
		Padding(1, 0)

	b.WriteString(headerStyle.Render("📄 LOGS"))
	b.WriteString("\n\n")

	// Log entries
	for _, log := range m.logs {
		timeStyle := lipgloss.NewStyle().
			Foreground(mutedColor)

		var levelStyle lipgloss.Style
		switch log.Level {
		case "error":
			levelStyle = lipgloss.NewStyle().Foreground(errorColor).Bold(true)
		case "warning":
			levelStyle = lipgloss.NewStyle().Foreground(warningColor).Bold(true)
		case "success":
			levelStyle = lipgloss.NewStyle().Foreground(successColor).Bold(true)
		default:
			levelStyle = lipgloss.NewStyle().Foreground(textColor)
		}

		timeStr := log.Timestamp.Format("15:04:05")
		b.WriteString(timeStyle.Render(fmt.Sprintf("[%s] ", timeStr)))
		b.WriteString(levelStyle.Render(fmt.Sprintf("[%s] ", strings.ToUpper(log.Level))))
		b.WriteString(levelStyle.Render(log.Message))
		b.WriteString("\n")
	}

	if len(m.logs) == 0 {
		emptyStyle := lipgloss.NewStyle().
			Foreground(mutedColor).
			Italic(true)

		b.WriteString(emptyStyle.Render("No logs available"))
		b.WriteString("\n")
	}

	b.WriteString("\n")

	// Instructions
	instructStyle := lipgloss.NewStyle().
		Foreground(mutedColor)

	b.WriteString(instructStyle.Render("Press 'c' to clear logs, 'Esc' to return to menu"))

	return b.String()
}

func renderSettings(m Model) string {
	var b strings.Builder

	// Header
	headerStyle := lipgloss.NewStyle().
		Foreground(primaryColor).
		Bold(true).
		Padding(1, 0)

	b.WriteString(headerStyle.Render("⚙️ SETTINGS"))
	b.WriteString("\n\n")

	// Settings
	settingStyle := lipgloss.NewStyle().
		Foreground(textColor)

	b.WriteString(settingStyle.Render(fmt.Sprintf("Theme: %s", m.settings.Theme)))
	b.WriteString("\n")
	b.WriteString(settingStyle.Render(fmt.Sprintf("Auto Watch: %t", m.settings.AutoWatch)))
	b.WriteString("\n")
	b.WriteString(settingStyle.Render(fmt.Sprintf("Show Timestamps: %t", m.settings.ShowTimestamps)))
	b.WriteString("\n")
	b.WriteString(settingStyle.Render(fmt.Sprintf("Enable Sound: %t", m.settings.EnableSound)))
	b.WriteString("\n")
	b.WriteString(settingStyle.Render(fmt.Sprintf("Auto Refresh: %t", m.settings.AutoRefresh)))
	b.WriteString("\n")
	b.WriteString(settingStyle.Render(fmt.Sprintf("Refresh Interval: %d seconds", m.settings.RefreshInterval)))
	b.WriteString("\n")
	b.WriteString(settingStyle.Render(fmt.Sprintf("Max Log Entries: %d", m.settings.MaxLogEntries)))

	b.WriteString("\n\n")

	// Instructions
	instructStyle := lipgloss.NewStyle().
		Foreground(mutedColor)

	b.WriteString(instructStyle.Render("Press 'r' to reset to defaults, 'Esc' to return to menu"))

	return b.String()
}