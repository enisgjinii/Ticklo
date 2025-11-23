# Ticklo Activity Tracker - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm start
```

That's it! The app will start tracking automatically.

## 🎨 New Features Overview

### 1. Theme Switching (Dark/Light Mode)
**Location**: Toolbar (sun/moon icon)

**How to use:**
1. Look for the sun/moon icon in the top toolbar
2. Click it to toggle between dark and light modes
3. Your preference is automatically saved

**Keyboard shortcut**: None (click only)

---

### 2. Stats Dashboard
**Location**: Top of timeline view

**What you see:**
- **Total Time**: How long you've been active today
- **Active Apps**: Number of different apps used
- **Most Used**: Your most frequently used app
- **Status**: Whether tracking is active or paused

**Updates**: Automatically every 5 seconds

---

### 3. Search Activities
**Location**: Toolbar (search input box)

**How to use:**
1. Type an app name in the search box
2. Timeline filters in real-time
3. Clear the box to see all activities

**Example**: Type "Chrome" to see only Chrome activities

---

### 4. Pause/Resume Tracking
**Location**: Toolbar (play/pause icon)

**How to use:**
1. Click the pause button to stop tracking
2. Icon changes to play button
3. Click again to resume tracking
4. Status updates in the dashboard

**Use case**: Pause during breaks or when you don't want tracking

---

### 5. Export Your Data
**Location**: Toolbar (export icon) or Settings page

**Export Current Day:**
1. Click the export icon in the toolbar
2. File downloads as `ticklo-export-YYYY-MM-DD.csv`

**Export All Data:**
1. Go to Settings (sidebar)
2. Click "Export All Data"
3. File downloads with all your tracking history

**CSV Format:**
```csv
App Name,Start Time,End Time,Duration (seconds)
"Chrome","2024-11-23T09:00:00Z","2024-11-23T10:00:00Z",3600
```

---

### 6. Import Data
**Location**: Toolbar (import icon)

**How to use:**
1. Click the import icon in the toolbar
2. Select a CSV file (must be in Ticklo format)
3. Data is merged with existing activities
4. Success message appears

**Note**: Import only works with CSV files exported from Ticklo

---

### 7. Settings Page
**Location**: Sidebar → Settings

**Available Options:**

#### Appearance
- **Theme**: Toggle between dark and light modes

#### Tracking
- **Auto-start tracking**: Start tracking when app launches
- **Minimize to tray**: Keep app running in background

#### Data Management
- **Export All Data**: Download complete tracking history
- **Import Data**: Restore from backup
- **Clear All Data**: Delete all tracking data (requires confirmation)

---

## 🎯 Common Tasks

### Task 1: Change to Light Mode
1. Click the sun/moon icon in the toolbar
2. Done! Theme changes instantly

### Task 2: Find All Chrome Activities
1. Type "Chrome" in the search box
2. Timeline shows only Chrome activities
3. Clear search to see everything

### Task 3: Take a Break (Pause Tracking)
1. Click the pause button in the toolbar
2. Go on your break
3. Click play button when you return

### Task 4: Export This Week's Data
1. Navigate to each day using the date arrows
2. Click export icon for each day
3. Or use Settings → Export All Data for everything

### Task 5: Backup Your Data
1. Go to Settings
2. Click "Export All Data"
3. Save the CSV file somewhere safe
4. To restore: Click import icon and select the file

---

## 🖱️ Interface Guide

### Toolbar (Top Bar)
```
[☰] [🔍+] [🔍-] [ℹ️] [🗑️] [➕] [🌓] [📤] [📥] [⏸️] [🔍Search] [🔄]
 │    │     │     │    │    │    │    │    │    │      │      │
 │    │     │     │    │    │    │    │    │    │      │      └─ Refresh
 │    │     │     │    │    │    │    │    │    │      └──────── Search
 │    │     │     │    │    │    │    │    │    └─────────────── Pause/Play
 │    │     │     │    │    │    │    │    └──────────────────── Import
 │    │     │     │    │    │    │    └───────────────────────── Export
 │    │     │     │    │    │    └────────────────────────────── Theme
 │    │     │     │    │    └─────────────────────────────────── Add Activity
 │    │     │     │    └──────────────────────────────────────── Delete
 │    │     │     └───────────────────────────────────────────── Info
 │    │     └─────────────────────────────────────────────────── Zoom Out
 │    └───────────────────────────────────────────────────────── Zoom In
 └────────────────────────────────────────────────────────────── Menu Toggle
```

### Sidebar
```
┌─────────────┐
│ 🕐 Ticklo   │
├─────────────┤
│ ▶ Timeline  │ ← You are here
│   Settings  │
│   About     │
│   FAQ       │
├─────────────┤
│     ◀◀     │ ← Collapse
└─────────────┘
```

### Stats Dashboard
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Time   │ Active Apps  │ Most Used    │ Status       │
│   8h 32m     │      12      │   Chrome     │ 🟢 Tracking  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Timeline
```
00:00 ├────────────────────────────────────────┤
01:00 ├────────────────────────────────────────┤
02:00 ├────────────────────────────────────────┤
...
09:00 ├─[Chrome 🌐]─────────────────────────┤
      │  2h 15m                              │
10:00 ├────────────────────────────────────────┤
11:00 ├─[VS Code 💻]────────────────────────┤
      │  1h 45m                              │
12:00 ├────────────────────────────────────────┤
```

---

## 💡 Pro Tips

### Tip 1: Use Search for Quick Analysis
Type an app name to see how much time you spent on it today.

### Tip 2: Export Regularly
Export your data weekly to keep backups and analyze trends.

### Tip 3: Pause During Meetings
Pause tracking during meetings or calls to get accurate work time.

### Tip 4: Check Stats Dashboard
Glance at the dashboard to see your most used app and total time.

### Tip 5: Use Light Mode During Day
Switch to light mode during daytime for better visibility.

### Tip 6: Minimize to Tray
Enable "Minimize to tray" in settings to keep tracking in background.

### Tip 7: Auto-start Tracking
Enable "Auto-start tracking" so you never forget to start.

---

## 🎨 Theme Comparison

### Dark Mode (Default)
- **Best for**: Low-light environments, night work
- **Colors**: Black background, white text, cyan accents
- **Eye strain**: Reduced in dark environments

### Light Mode
- **Best for**: Daytime, bright environments
- **Colors**: White background, dark text, blue accents
- **Eye strain**: Reduced in bright environments

**Switch anytime** with the theme toggle button!

---

## 📊 Understanding Your Data

### Activity Blocks
Each colored block in the timeline represents:
- **App Icon**: What application you were using
- **App Name**: Name of the application
- **Duration**: How long you used it
- **Time**: When you used it

### Stats Explained
- **Total Time**: Sum of all activity durations today
- **Active Apps**: Count of unique applications
- **Most Used**: App with the longest total duration
- **Status**: 
  - 🟢 Tracking = Currently recording activities
  - 🟡 Paused = Not recording activities

---

## 🔧 Troubleshooting

### Icons Not Showing?
- **Solution**: Fallback placeholders (colored letters) are shown
- **Why**: Some apps don't provide icons
- **Impact**: None - functionality works the same

### Search Not Working?
- **Check**: Make sure you're typing the exact app name
- **Tip**: Search is case-insensitive
- **Clear**: Delete search text to see all activities

### Theme Not Saving?
- **Solution**: Theme saves automatically
- **Check**: Look in `data/settings.json`
- **Restart**: Close and reopen the app

### Export File Empty?
- **Check**: Make sure you have activities for the selected day
- **Verify**: Look at the timeline - are there activity blocks?
- **Try**: Export a different day with known activities

### Can't Import CSV?
- **Format**: Must be a CSV file exported from Ticklo
- **Check**: Open the CSV in a text editor to verify format
- **Headers**: First line should be: `App Name,Start Time,End Time,Duration (seconds)`

---

## 🎓 Advanced Usage

### Analyzing Productivity
1. Export data for a week
2. Open CSV in Excel/Google Sheets
3. Create pivot tables to analyze:
   - Time per app
   - Most productive hours
   - Daily patterns

### Backing Up Data
1. Settings → Export All Data
2. Save to cloud storage (Dropbox, Google Drive)
3. Set a reminder to export weekly

### Migrating to New Computer
1. Old computer: Settings → Export All Data
2. Copy CSV file to new computer
3. New computer: Install Ticklo → Import CSV

### Sharing Stats (Privacy-Safe)
1. Export data
2. Remove sensitive app names/titles in CSV
3. Share anonymized data

---

## 📱 Keyboard Shortcuts

Currently, most actions require clicking. Keyboard shortcuts coming in future updates!

**Available:**
- `Escape`: Close modals/dialogs
- `Tab`: Navigate between elements
- `Enter`: Activate focused button

---

## 🆘 Getting Help

### Documentation
- **README.md**: Full documentation
- **FEATURES-ENHANCED.md**: Detailed feature descriptions
- **ENHANCEMENTS-SUMMARY.md**: Overview of new features

### Support
- **Issues**: Report bugs on GitHub
- **Questions**: Check FAQ in the app
- **Community**: Join our Discord (coming soon)

---

## ✅ Quick Checklist

After reading this guide, you should be able to:
- [ ] Switch between dark and light modes
- [ ] View real-time statistics
- [ ] Search for specific activities
- [ ] Pause and resume tracking
- [ ] Export your data to CSV
- [ ] Import data from CSV
- [ ] Access and use settings
- [ ] Understand the interface
- [ ] Troubleshoot common issues

---

**Congratulations!** 🎉 You're now ready to use all the enhanced features of Ticklo Activity Tracker!

**Next Steps:**
1. Start using the app
2. Experiment with different features
3. Find your preferred theme
4. Set up auto-start and minimize to tray
5. Export your first backup

**Happy Tracking!** ⏱️
