const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Dynamic import for get-windows ES module
let activeWindow;
(async () => {
  const getWindows = await import('get-windows');
  activeWindow = getWindows.activeWindow;
})();

let mainWindow;
let tray;
let isTracking = false;
let activityData = [];
let trackingInterval;
let appIconCache = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide instead of close when user clicks X
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  // Create a simple tray icon programmatically if file doesn't exist
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(trayIconPath);
    if (trayIcon.isEmpty()) {
      throw new Error('Icon file not found');
    }
  } catch (error) {
    // Create a simple colored square as fallback icon
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwiCYKGVjY2NlYWFhY2NjRYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhb+BwAAAAAAAAAAAAAAAAAA');
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Ticklo',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: isTracking ? 'Stop Tracking' : 'Start Tracking',
      click: () => {
        toggleTracking();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Ticklo Activity Tracker');

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// Get app icon and cache it
async function getAppIcon(appName, appPath) {
  if (appIconCache.has(appName)) {
    return appIconCache.get(appName);
  }

  try {
    let iconPath = null;

    if (process.platform === 'win32') {
      // For Windows, try to get the executable icon
      if (appPath && fs.existsSync(appPath)) {
        const icon = await app.getFileIcon(appPath, { size: 'normal' });
        if (icon && !icon.isEmpty()) {
          iconPath = icon.toDataURL();
        }
      }
    } else if (process.platform === 'darwin') {
      // For macOS, try to get app bundle icon
      try {
        const icon = await app.getFileIcon(appPath || '', { size: 'normal' });
        if (icon && !icon.isEmpty()) {
          iconPath = icon.toDataURL();
        }
      } catch (error) {
        // Fallback for macOS
      }
    }

    // Cache the result (even if null)
    appIconCache.set(appName, iconPath);
    return iconPath;
  } catch (error) {
    console.error(`Error getting icon for ${appName}:`, error);
    appIconCache.set(appName, null);
    return null;
  }
}

async function trackActivity() {
  try {
    // Wait for activeWindow to be loaded
    if (!activeWindow) {
      return;
    }

    const window = await activeWindow();
    if (window && window.owner && window.title) {
      const timestamp = new Date().toISOString();

      // Get app icon
      const appIcon = await getAppIcon(window.owner.name, window.owner.path);

      const activity = {
        timestamp,
        title: window.title,
        app: window.owner.name,
        appPath: window.owner.path,
        appIcon: appIcon,
        url: window.url || null,
        duration: 1000 // 1 second intervals
      };

      // Check if this is the same activity as the last one
      const lastActivity = activityData[activityData.length - 1];
      if (lastActivity &&
        lastActivity.app === activity.app &&
        lastActivity.title === activity.title) {
        // Extend the duration of the last activity
        lastActivity.duration += 1000;
      } else {
        // Add new activity
        activityData.push(activity);
      }

      // Send update to renderer (both old and new format)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-focus-changed', {
          app: activity.app,
          title: activity.title,
          appIcon: activity.appIcon,
          appPath: activity.appPath
        });

        // New UI format
        mainWindow.webContents.send('active-window-update', {
          name: activity.app,
          title: activity.title,
          icon: activity.appIcon,
          path: activity.appPath,
          timestamp: Date.now()
        });
      }

      // Keep only last 7 days of data
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      activityData = activityData.filter(item =>
        new Date(item.timestamp) > sevenDaysAgo
      );
    }
  } catch (error) {
    console.error('Error tracking activity:', error);
  }
}

function toggleTracking() {
  if (isTracking) {
    stopTracking();
  } else {
    startTracking();
  }
}

function startTracking() {
  isTracking = true;
  trackingInterval = setInterval(trackActivity, 1000); // Track every second
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracking-status', true);
  }
  updateTrayMenu();
}

function stopTracking() {
  isTracking = false;
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracking-status', false);
  }
  updateTrayMenu();
}

function updateTrayMenu() {
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Ticklo',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: isTracking ? 'Stop Tracking' : 'Start Tracking',
        click: () => {
          toggleTracking();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  }
}

// IPC handlers
ipcMain.handle('get-activity-data', () => {
  return activityData;
});

ipcMain.handle('get-app-icon', async (event, appName, appPath) => {
  return await getAppIcon(appName, appPath);
});

ipcMain.handle('toggle-tracking', () => {
  toggleTracking();
  return isTracking;
});

ipcMain.handle('get-tracking-status', () => {
  return isTracking;
});

ipcMain.handle('add-manual-activity', (event, activity) => {
  const manualActivity = {
    ...activity,
    timestamp: new Date(activity.timestamp).toISOString(),
    manual: true
  };
  activityData.push(manualActivity);
  return manualActivity;
});

ipcMain.handle('delete-activity', (event, activityId) => {
  const index = activityData.findIndex(item => item.timestamp === activityId);
  if (index !== -1) {
    activityData.splice(index, 1);
    return true;
  }
  return false;
});

// IPC handler to open the data directory
ipcMain.handle('open-data-directory', (event) => {
  const appDirectory = path.join(process.cwd(), 'data');
  if (!fs.existsSync(appDirectory)) {
    fs.mkdirSync(appDirectory, { recursive: true });
  }

  // Open the directory in file explorer
  const { shell } = require('electron');
  shell.openPath(appDirectory);

  return appDirectory;
});

// Get user data path for storing files
ipcMain.on('get-user-data-path', (event) => {
  // Use app directory instead of default userData path
  // This stores files in the app's directory rather than AppData
  const appDirectory = path.join(process.cwd(), 'data');

  // Create the directory if it doesn't exist
  if (!fs.existsSync(appDirectory)) {
    try {
      fs.mkdirSync(appDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
      // Fall back to default location if we can't create the directory
      event.returnValue = app.getPath('userData');
      return;
    }
  }

  event.returnValue = appDirectory;
});

// Handle active window requests
ipcMain.on('get-active-window', async (event) => {
  if (!isTracking || !activeWindow) return;

  try {
    const window = await activeWindow();
    if (window && window.owner && window.title) {
      const appIcon = await getAppIcon(window.owner.name, window.owner.path);
      event.reply('window-focus-changed', {
        app: window.owner.name,
        title: window.title,
        appIcon: appIcon,
        appPath: window.owner.path
      });
    }
  } catch (error) {
    console.error('Error getting active window:', error);
  }
});

// Handle start tracking request from new UI
ipcMain.on('start-tracking', () => {
  if (!isTracking) {
    startTracking();
  }
});

// Save tracking data for a specific date
ipcMain.on('save-tracking-data', (event, data) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory:', dataDir);
    }

    const filePath = path.join(dataDir, `tracking-${data.date}.json`);
    
    // Add metadata
    const dataWithMetadata = {
      ...data,
      savedAt: new Date().toISOString(),
      version: '1.0.0',
      appCount: Object.keys(data.apps || {}).length,
      totalSessions: Object.values(data.apps || {}).reduce((sum, app) => sum + (app.sessions?.length || 0), 0)
    };
    
    // Write to file with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(dataWithMetadata, null, 2), 'utf8');
    console.log(`✅ Saved tracking data: ${filePath} (${dataWithMetadata.appCount} apps, ${dataWithMetadata.totalSessions} sessions)`);
    
    // Also save a backup every hour
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const hour = new Date().getHours();
    const backupPath = path.join(backupDir, `tracking-${data.date}-backup-${hour}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(dataWithMetadata, null, 2), 'utf8');
    
  } catch (error) {
    console.error('❌ Error saving tracking data:', error);
    // Try to notify the renderer about the error
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('save-error', error.message);
    }
  }
});

// Load tracking data for a specific date
ipcMain.on('load-tracking-data', (event, dateKey) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, `tracking-${dateKey}.json`);

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      console.log(`📂 Loaded tracking data: ${filePath} (${data.appCount || 0} apps, ${data.totalSessions || 0} sessions)`);
      event.reply('tracking-data-loaded', data);
    } else {
      console.log(`📭 No tracking data found for ${dateKey}`);
      event.reply('tracking-data-loaded', null);
    }
  } catch (error) {
    console.error('❌ Error loading tracking data:', error);
    
    // Try to load from backup
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const backupDir = path.join(dataDir, 'backups');
      const backupFiles = fs.readdirSync(backupDir).filter(f => f.startsWith(`tracking-${dateKey}-backup-`));
      
      if (backupFiles.length > 0) {
        // Load the most recent backup
        const latestBackup = backupFiles.sort().reverse()[0];
        const backupPath = path.join(backupDir, latestBackup);
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`🔄 Loaded from backup: ${latestBackup}`);
        event.reply('tracking-data-loaded', data);
        return;
      }
    } catch (backupError) {
      console.error('❌ Error loading backup:', backupError);
    }
    
    event.reply('tracking-data-loaded', null);
  }
});

// Save settings
ipcMain.on('save-settings', (event, settings) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const settingsPath = path.join(dataDir, 'settings.json');
    let existingSettings = {};
    
    if (fs.existsSync(settingsPath)) {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    
    const updatedSettings = { ...existingSettings, ...settings };
    fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
});

// Load settings
ipcMain.handle('load-settings', () => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const settingsPath = path.join(dataDir, 'settings.json');

    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
});

// Pause tracking
ipcMain.on('pause-tracking', () => {
  stopTracking();
});

// Resume tracking
ipcMain.on('resume-tracking', () => {
  startTracking();
});

// Function to migrate existing data from default location to app directory
function migrateDataIfNeeded() {
  const defaultUserDataPath = app.getPath('userData');
  const appDataDirectory = path.join(process.cwd(), 'data');

  // Create the directory if it doesn't exist
  if (!fs.existsSync(appDataDirectory)) {
    try {
      fs.mkdirSync(appDataDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
      return;
    }
  }

  // Check for files to migrate
  const filesToMigrate = ['settings.json', 'activities.json'];

  filesToMigrate.forEach(fileName => {
    const sourcePath = path.join(defaultUserDataPath, fileName);
    const destPath = path.join(appDataDirectory, fileName);

    // If the file exists in the default location but not in the app directory, copy it
    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Migrated ${fileName} from ${sourcePath} to ${destPath}`);
      } catch (error) {
        console.error(`Error migrating ${fileName}:`, error);
      }
    }
  });
}

app.whenReady().then(async () => {
  // Migrate data from default location
  migrateDataIfNeeded();

  createWindow();
  createTray();

  // Wait for get-windows to load before starting tracking
  while (!activeWindow) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Start tracking by default
  startTracking();
});

app.on('window-all-closed', () => {
  // Keep the app running in the background
  // Don't quit on macOS
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopTracking();
}); 