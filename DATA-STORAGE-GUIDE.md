# Ticklo Data Storage Guide

## 📁 Overview

Ticklo stores all tracking data locally on your computer in JSON format. This ensures complete privacy and gives you full control over your data.

## 🗂️ Data Structure

### Main Data Directory
```
./data/
├── tracking-2024-11-23.json      # Daily tracking data
├── tracking-2024-11-22.json
├── tracking-2024-11-21.json
├── settings.json                  # User preferences
└── backups/                       # Automatic hourly backups
    ├── tracking-2024-11-23-backup-9.json
    ├── tracking-2024-11-23-backup-10.json
    └── tracking-2024-11-23-backup-11.json
```

## 📄 File Formats

### Tracking Data File (`tracking-YYYY-MM-DD.json`)

```json
{
  "date": "2024-11-23",
  "savedAt": "2024-11-23T10:30:45.123Z",
  "version": "1.0.0",
  "appCount": 5,
  "totalSessions": 23,
  "apps": {
    "Chrome": {
      "icon": "data:image/png;base64,...",
      "sessions": [
        {
          "start": 1700734800000,
          "end": 1700738400000
        }
      ],
      "totalTime": 3600
    },
    "Visual Studio Code": {
      "icon": "data:image/png;base64,...",
      "sessions": [
        {
          "start": 1700738400000,
          "end": 1700742000000
        }
      ],
      "totalTime": 3600
    }
  }
}
```

**Fields:**
- `date`: Date in YYYY-MM-DD format
- `savedAt`: ISO timestamp of last save
- `version`: Data format version
- `appCount`: Number of unique apps tracked
- `totalSessions`: Total number of tracking sessions
- `apps`: Object containing app tracking data
  - `icon`: Base64-encoded app icon (optional)
  - `sessions`: Array of tracking sessions
    - `start`: Unix timestamp (milliseconds)
    - `end`: Unix timestamp (milliseconds)
  - `totalTime`: Total time in seconds

### Settings File (`settings.json`)

```json
{
  "theme": "dark",
  "autoStart": true,
  "minimizeToTray": true,
  "showNotifications": true,
  "dailyGoal": 3,
  "breakReminder": 15,
  "autoCategory": true,
  "categories": {
    "Visual Studio Code": "productive",
    "Chrome": "break",
    "Slack": "break"
  }
}
```

## 💾 Auto-Save System

### How It Works

1. **Continuous Tracking**: App monitors active windows every second
2. **Session Merging**: Consecutive activities within 5 seconds are merged
3. **Periodic Saves**: Data saved every 30 seconds automatically
4. **Activity-Based Saves**: Also saves every 60 session updates (~1 minute of activity)
5. **Exit Save**: Data saved when app closes

### Save Indicators

- **💾 Saving...**: Data is being written to disk
- **✅ Saved**: Data successfully saved
- **❌ Error**: Save failed (check console for details)

### Backup System

- **Hourly Backups**: Automatic backup created every hour
- **Location**: `data/backups/` directory
- **Format**: `tracking-YYYY-MM-DD-backup-HH.json`
- **Recovery**: Automatically used if main file is corrupted

## 🔄 Data Operations

### Manual Save

**From UI:**
1. Go to Settings
2. Click "💾 Save Now" button
3. Confirmation message appears

**From Code:**
```javascript
saveTrackingData();
```

### Export Data

**Current Day:**
1. Click export icon (📤) in toolbar
2. CSV file downloads: `ticklo-export-YYYY-MM-DD.csv`

**All Data:**
1. Go to Settings → Data Management
2. Click "📤 Export All Data"
3. CSV file downloads: `ticklo-full-export-YYYY-MM-DD.csv`

**CSV Format:**
```csv
Date,App Name,Start Time,End Time,Duration (seconds)
"2024-11-23","Chrome","2024-11-23T09:00:00Z","2024-11-23T10:00:00Z",3600
"2024-11-23","VS Code","2024-11-23T10:00:00Z","2024-11-23T11:30:00Z",5400
```

### Import Data

1. Click import icon (📥) in toolbar
2. Select CSV file (must be Ticklo format)
3. Data merges with existing activities
4. Success message appears

### Clear Data

1. Go to Settings → Data Management
2. Click "🗑️ Clear All Data"
3. Confirm twice (destructive action)
4. All tracking files deleted

## 📊 Data Statistics

View current session stats in Settings:

- **Apps Tracked**: Number of unique applications
- **Total Sessions**: Number of tracking sessions
- **Last Saved**: Time since last save
- **Auto-save**: Status indicator (✓ Active)

## 🔍 Accessing Data Files

### From UI

1. Go to Settings → Data Management
2. Click "Open Folder" button
3. File explorer opens to data directory

### From File System

**Windows:**
```
C:\path\to\ticklo\data\
```

**macOS:**
```
/path/to/ticklo/data/
```

**Linux:**
```
/path/to/ticklo/data/
```

## 🛠️ Advanced Usage

### Reading Data Programmatically

**Node.js:**
```javascript
const fs = require('fs');
const path = require('path');

// Read tracking data
const dataPath = path.join(__dirname, 'data', 'tracking-2024-11-23.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`Apps tracked: ${data.appCount}`);
console.log(`Total sessions: ${data.totalSessions}`);

// Iterate through apps
Object.entries(data.apps).forEach(([appName, appData]) => {
  console.log(`${appName}: ${appData.totalTime}s`);
});
```

**Python:**
```python
import json
from pathlib import Path

# Read tracking data
data_path = Path('data/tracking-2024-11-23.json')
with open(data_path) as f:
    data = json.load(f)

print(f"Apps tracked: {data['appCount']}")
print(f"Total sessions: {data['totalSessions']}")

# Iterate through apps
for app_name, app_data in data['apps'].items():
    print(f"{app_name}: {app_data['totalTime']}s")
```

### Analyzing Data

**Calculate total time per app:**
```javascript
const totalTimeByApp = {};
Object.entries(data.apps).forEach(([appName, appData]) => {
  totalTimeByApp[appName] = appData.totalTime;
});

// Sort by time
const sorted = Object.entries(totalTimeByApp)
  .sort(([,a], [,b]) => b - a);

console.log('Top 5 apps:');
sorted.slice(0, 5).forEach(([app, time]) => {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  console.log(`${app}: ${hours}h ${minutes}m`);
});
```

**Calculate productivity score:**
```javascript
const productiveApps = ['Visual Studio Code', 'IntelliJ IDEA', 'Sublime Text'];
const productiveTime = Object.entries(data.apps)
  .filter(([name]) => productiveApps.includes(name))
  .reduce((sum, [, app]) => sum + app.totalTime, 0);

const totalTime = Object.values(data.apps)
  .reduce((sum, app) => sum + app.totalTime, 0);

const productivityScore = (productiveTime / totalTime * 100).toFixed(1);
console.log(`Productivity: ${productivityScore}%`);
```

## 🔐 Privacy & Security

### Local Storage Only
- **No Cloud**: All data stays on your computer
- **No Tracking**: No analytics or telemetry
- **No Network**: No data sent to external servers

### Data Control
- **Full Access**: You own and control all data files
- **Easy Backup**: Simple file-based storage
- **Easy Migration**: Copy `data/` folder to move between computers
- **Easy Deletion**: Delete `data/` folder to remove all data

### Sensitive Data
- **Window Titles**: Not stored (only app names)
- **URLs**: Not stored (only app names)
- **Content**: Not stored (only app names and times)

## 🔄 Backup Strategies

### Manual Backup

**Daily:**
```bash
# Copy data folder
cp -r data/ backups/data-$(date +%Y-%m-%d)/
```

**Weekly:**
```bash
# Create compressed archive
tar -czf backups/ticklo-backup-$(date +%Y-%m-%d).tar.gz data/
```

### Automated Backup

**Using cron (Linux/macOS):**
```bash
# Add to crontab
0 0 * * * tar -czf ~/backups/ticklo-$(date +\%Y-\%m-\%d).tar.gz ~/ticklo/data/
```

**Using Task Scheduler (Windows):**
1. Create batch file: `backup-ticklo.bat`
```batch
@echo off
set BACKUP_DIR=C:\Backups\Ticklo
set DATA_DIR=C:\path\to\ticklo\data
xcopy /E /I /Y "%DATA_DIR%" "%BACKUP_DIR%\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%"
```
2. Schedule in Task Scheduler

### Cloud Backup

**Dropbox/Google Drive:**
1. Move `data/` folder to cloud folder
2. Create symlink in Ticklo directory
```bash
# Linux/macOS
ln -s ~/Dropbox/Ticklo/data ./data

# Windows (as admin)
mklink /D data "C:\Users\YourName\Dropbox\Ticklo\data"
```

## 🐛 Troubleshooting

### Data Not Saving

**Check:**
1. Data directory exists: `./data/`
2. Write permissions on directory
3. Disk space available
4. Console for error messages

**Fix:**
```bash
# Create directory if missing
mkdir -p data/backups

# Fix permissions (Linux/macOS)
chmod 755 data/
chmod 644 data/*.json
```

### Corrupted Data File

**Recovery:**
1. Check `data/backups/` for recent backup
2. Copy backup to main directory
3. Rename to `tracking-YYYY-MM-DD.json`

**Manual Fix:**
```bash
# Find latest backup
ls -lt data/backups/tracking-2024-11-23-backup-*.json | head -1

# Copy to main directory
cp data/backups/tracking-2024-11-23-backup-11.json data/tracking-2024-11-23.json
```

### Missing Data

**Check:**
1. Correct date selected in UI
2. File exists: `data/tracking-YYYY-MM-DD.json`
3. File not empty: `cat data/tracking-YYYY-MM-DD.json`
4. Valid JSON: Use JSON validator

### Large File Size

**Optimize:**
```javascript
// Remove old data (keep last 30 days)
const fs = require('fs');
const path = require('path');

const dataDir = './data';
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('tracking-'))
  .map(f => ({
    name: f,
    time: fs.statSync(path.join(dataDir, f)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time);

// Keep only last 30 files
files.slice(30).forEach(file => {
  fs.unlinkSync(path.join(dataDir, file.name));
  console.log(`Deleted: ${file.name}`);
});
```

## 📈 Data Analysis Tools

### Built-in Tools
- **Timeline View**: Visual representation of daily activity
- **Week View**: Overview of weekly patterns
- **Stats Dashboard**: Real-time metrics
- **Export to CSV**: For external analysis

### External Tools

**Excel/Google Sheets:**
1. Export data to CSV
2. Open in spreadsheet software
3. Create pivot tables and charts

**Python Analysis:**
```python
import pandas as pd
import matplotlib.pyplot as plt

# Load CSV
df = pd.read_csv('ticklo-export-2024-11-23.csv')

# Convert to datetime
df['Start Time'] = pd.to_datetime(df['Start Time'])
df['End Time'] = pd.to_datetime(df['End Time'])

# Group by app
app_time = df.groupby('App Name')['Duration (seconds)'].sum() / 3600

# Plot
app_time.plot(kind='bar', title='Time per App (hours)')
plt.show()
```

**R Analysis:**
```r
library(tidyverse)

# Load CSV
data <- read_csv('ticklo-export-2024-11-23.csv')

# Convert to datetime
data <- data %>%
  mutate(
    start = as.POSIXct(`Start Time`),
    end = as.POSIXct(`End Time`),
    hours = `Duration (seconds)` / 3600
  )

# Plot
ggplot(data, aes(x = `App Name`, y = hours)) +
  geom_bar(stat = 'identity') +
  theme_minimal() +
  labs(title = 'Time per App', y = 'Hours')
```

## 🎯 Best Practices

### Data Management
1. **Regular Exports**: Export data weekly for backup
2. **Clean Old Data**: Remove data older than 90 days
3. **Monitor Size**: Check data folder size monthly
4. **Verify Backups**: Test backup restoration quarterly

### Performance
1. **Limit History**: Keep only necessary historical data
2. **Archive Old Data**: Move old files to archive folder
3. **Optimize Icons**: Icons can increase file size significantly

### Privacy
1. **Secure Storage**: Keep data folder in encrypted location
2. **Regular Cleanup**: Delete data you no longer need
3. **Careful Sharing**: Remove sensitive data before sharing exports

## 📚 Additional Resources

- **README.md**: General documentation
- **FEATURES-ENHANCED.md**: Feature details
- **QUICK-START-GUIDE.md**: Getting started guide
- **CHANGELOG.md**: Version history

---

**Last Updated**: November 2024
**Version**: 1.0.0
