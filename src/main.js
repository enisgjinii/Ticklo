const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

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
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwiCYKGVjY2NlYWFhY2NjRYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhb+BwAAAAAAAAAAAAAAAAAA');
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

async function trackActivity() {
  try {
    // Wait for activeWindow to be loaded
    if (!activeWindow) {
      return;
    }
    
    const window = await activeWindow();
    if (window && window.owner && window.title) {
      const timestamp = new Date().toISOString();
      const activity = {
        timestamp,
        title: window.title,
        app: window.owner.name,
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

      // Send update to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('activity-update', activity);
      }

      // Keep only last 24 hours of data
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      activityData = activityData.filter(item => 
        new Date(item.timestamp) > twentyFourHoursAgo
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

// Get user data path for storing files
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});

// Handle active window requests
ipcMain.on('get-active-window', async (event) => {
  if (!isTracking || !activeWindow) return;
  
  try {
    const window = await activeWindow();
    if (window && window.owner && window.title) {
      event.reply('window-focus-changed', {
        app: window.owner.name,
        title: window.title
      });
    }
  } catch (error) {
    console.error('Error getting active window:', error);
  }
});

app.whenReady().then(async () => {
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