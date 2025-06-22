const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Data Storage Paths
const userDataPath = ipcRenderer.sendSync('get-user-data-path');
const settingsFilePath = path.join(userDataPath, 'settings.json');
const activitiesFilePath = path.join(userDataPath, 'activities.json');

// Global State - Single source of truth
let state = {
    settings: {
        autoStart: true,
        minimizeToTray: true,
        showNotifications: true,
        dailyGoal: 8,
        breakReminder: 60,
        theme: 'system', // 'light', 'dark', 'system'
        autoCategory: true, // Enable auto categorization
        categories: {
            'Visual Studio Code': 'productive',
            'IntelliJ IDEA': 'productive',
            'WebStorm': 'productive',
            'Sublime Text': 'productive',
            'Atom': 'productive',
            'Chrome': 'break',
            'Firefox': 'break',
            'Safari': 'break',
            'Edge': 'break',
            'Slack': 'break',
            'Teams': 'break',
            'Discord': 'distracted',
            'Twitter': 'distracted',
            'Facebook': 'distracted',
            'Instagram': 'distracted',
            'YouTube': 'distracted',
            'Netflix': 'distracted',
            'Spotify': 'distracted',
            'Steam': 'distracted'
        }
    },
    activities: [],
    currentActivity: null,
    isTracking: true,
    currentPage: 'dashboard',
    currentTimelineView: 'day',
    debugMode: true, // Enable debug mode by default to help troubleshoot
    sessionStartTime: new Date(),
    // Enhanced state
    currentDate: new Date(),
    selectedPeriod: 'today', // for dashboard filters
    activitiesFilter: {
        search: '',
        category: '',
        dateRange: 'today'
    },
    pagination: {
        currentPage: 1,
        entriesPerPage: 25,
        totalEntries: 0
    },
    appIconCache: new Map(),
    uiScale: 'md', // 'sm', 'md', 'lg'
    timeline: {
        zoomLevel: 1, // 0.5, 1, 2, 4
        viewMode: 'day' // 'day', 'week', 'month'
    },
    currentTimelineView: 'day'
};

// Debug Console
const debug = {
    log: (message, data = null) => {
        if (!state.debugMode) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const output = document.getElementById('debugOutput');
        if (!output) return;
        
        let logMessage = `[${timestamp}] ${message}`;
        if (data) {
            logMessage += '\n' + JSON.stringify(data, null, 2);
        }
        
        output.textContent += logMessage + '\n\n';
        output.scrollTop = output.scrollHeight;
    },
    
    clear: () => {
        const output = document.getElementById('debugOutput');
        if (output) output.textContent = '';
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    debug.log('Initializing Ticklo...');
    
    // Make refresh function available globally immediately
    window.refreshActivities = refreshActivities;
    
    await loadSettings();
    await loadActivities();
    
    setupEventListeners();
    setupIPCListeners();
    
    applyTheme();
    applyUIScale();
    
    // Initialize the default page (dashboard)
    switchPage('dashboard');
    
    // Start tracking if enabled
    if (state.settings.autoStart && state.isTracking) {
        startTracking();
    }
    
    // Update UI every second for real-time display
    setInterval(updateRealTimeElements, 1000);
    
    // Auto-save every 30 seconds
    setInterval(saveAllData, 30000);
    
    // Check break reminders
    setInterval(checkBreakReminder, 60000);
    
    debug.log('Initialization complete', { settings: state.settings });
    
    // Log helpful message to console
    console.log('🔧 Ticklo Debug: If activities are not showing, try refreshing with: refreshActivities()');
    console.log('🔧 Current activities count:', state.activities.length);
    
    // Show notification about the data directory change
    setTimeout(() => {
        showToast('Data is now stored in the app directory. Click "Open Data Folder" in Settings to access it.', 'info', 8000);
    }, 3000);
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation menu
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) switchPage(page);
        });
    });

    // Tracking toggle
    document.getElementById('trackingToggle')?.addEventListener('change', (e) => {
        state.isTracking = e.target.checked;
        if (state.isTracking) {
            startTracking();
            showToast('Time tracking started', 'success');
        } else {
            stopTracking();
            showToast('Time tracking stopped', 'info');
        }
    });

    // Theme switcher
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.settings.theme = btn.dataset.theme;
            
            // Update active state
            document.querySelectorAll('.theme-btn').forEach(b => {
                if (b === btn) {
                    b.classList.remove('bg-secondary', 'text-secondary-foreground');
                    b.classList.add('bg-primary', 'text-primary-foreground');
                } else {
                    b.classList.remove('bg-primary', 'text-primary-foreground');
                    b.classList.add('bg-secondary', 'text-secondary-foreground');
                }
            });
            
            applyTheme();
            saveSettings();
        });
    });

    // UI Scale switcher
    document.querySelectorAll('.scale-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.uiScale = btn.dataset.scale;
            
            // Update active state
            document.querySelectorAll('.scale-btn').forEach(b => {
                if (b === btn) {
                    b.classList.remove('bg-secondary', 'text-secondary-foreground');
                    b.classList.add('bg-primary', 'text-primary-foreground');
                } else {
                    b.classList.remove('bg-primary', 'text-primary-foreground');
                    b.classList.add('bg-secondary', 'text-secondary-foreground');
                }
            });
            
            applyUIScale();
        });
    });

    // Add Activity Modal
    document.getElementById('addActivityBtn')?.addEventListener('click', showAddActivityModal);
    document.getElementById('addManualActivity')?.addEventListener('click', showAddActivityModal);
    document.getElementById('addActivityForm')?.addEventListener('submit', handleAddActivity);

    // Export Data
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('exportActivitiesBtn')?.addEventListener('click', exportActivitiesToCSV);

    // Modal close handlers
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.dataset.modalClose;
            hideModal(modalId);
        });
    });

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
            const modal = e.target;
            if (modal.id && modal.id.includes('Modal')) {
                hideModal(modal.id);
            }
        }
    });

    // Date navigation
    document.getElementById('prevDate')?.addEventListener('click', () => {
        navigateDate(-1);
    });
    
    document.getElementById('nextDate')?.addEventListener('click', () => {
        navigateDate(1);
    });
    
    document.getElementById('timelinePrevDate')?.addEventListener('click', () => {
        navigateDate(-1);
    });
    
    document.getElementById('timelineNextDate')?.addEventListener('click', () => {
        navigateDate(1);
    });

    // Period filter buttons
    document.querySelectorAll('.filter-btn[data-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;
            state.selectedPeriod = period;
            
            // Update active state
            document.querySelectorAll('.filter-btn[data-period]').forEach(b => {
                b.classList.remove('bg-primary', 'text-primary-foreground');
                b.classList.add('text-muted-foreground', 'hover:bg-background', 'hover:text-foreground');
            });
            btn.classList.remove('text-muted-foreground', 'hover:bg-background', 'hover:text-foreground');
            btn.classList.add('bg-primary', 'text-primary-foreground');
            
            updateTopApplications();
        });
    });
    
    // Activities page filters
    document.getElementById('activitySearch')?.addEventListener('input', (e) => {
        state.activitiesFilter.search = e.target.value;
        state.pagination.currentPage = 1;
        updateActivitiesTable();
    });
    
    document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
        state.activitiesFilter.category = e.target.value;
        state.pagination.currentPage = 1;
        updateActivitiesTable();
    });
    
    document.getElementById('dateFilter')?.addEventListener('change', (e) => {
        state.activitiesFilter.dateRange = e.target.value;
        state.pagination.currentPage = 1;
        updateActivitiesTable();
    });
    
    document.getElementById('entriesPerPage')?.addEventListener('change', (e) => {
        state.pagination.entriesPerPage = parseInt(e.target.value);
        state.pagination.currentPage = 1;
        updateActivitiesTable();
    });

    // Settings inputs
    document.getElementById('autoStart')?.addEventListener('change', (e) => {
        state.settings.autoStart = e.target.checked;
        saveSettings();
    });
    
    document.getElementById('minimizeToTray')?.addEventListener('change', (e) => {
        state.settings.minimizeToTray = e.target.checked;
        saveSettings();
    });
    
    document.getElementById('showNotifications')?.addEventListener('change', (e) => {
        state.settings.showNotifications = e.target.checked;
        saveSettings();
    });
    
    document.getElementById('autoCategory')?.addEventListener('change', (e) => {
        state.settings.autoCategory = e.target.checked;
        saveSettings();
    });
    
    document.getElementById('dailyGoal')?.addEventListener('input', (e) => {
        state.settings.dailyGoal = parseInt(e.target.value) || 8;
        saveSettings();
        updateGoalProgress();
    });
    
    document.getElementById('breakReminder')?.addEventListener('input', (e) => {
        state.settings.breakReminder = parseInt(e.target.value) || 60;
        saveSettings();
    });
    
    // Timeline View Toggle
    document.querySelectorAll('.toggle-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentTimelineView = btn.dataset.view;
            
            // Update active state
            document.querySelectorAll('.toggle-btn[data-view]').forEach(b => {
                if (b === btn) {
                    b.classList.remove('text-muted-foreground', 'hover:bg-background', 'hover:text-foreground');
                    b.classList.add('bg-primary', 'text-primary-foreground');
                } else {
                    b.classList.remove('bg-primary', 'text-primary-foreground');
                    b.classList.add('text-muted-foreground', 'hover:bg-background', 'hover:text-foreground');
                }
            });
            
            updateTimeline();
        });
    });
    
    // Export/Import Settings
    document.getElementById('exportSettings')?.addEventListener('click', exportSettings);
    document.getElementById('importSettings')?.addEventListener('click', importSettings);
    document.getElementById('clearData')?.addEventListener('click', clearAllData);
    
    // Open Data Directory
    document.getElementById('openDataDir')?.addEventListener('click', openDataDirectory);
    
    // Refresh Button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        await refreshActivities();
    });

    // Floating Info Button
    document.getElementById('keyboardShortcutsBtn')?.addEventListener('click', () => {
        showModal('keyboardShortcutsModal');
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Enhanced Keyboard Shortcuts Handler
function handleKeyboardShortcuts(e) {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, etc. in inputs
        if (!e.ctrlKey && !e.metaKey) return;
        if (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'z') return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    // Handle Escape key
    if (key === 'escape') {
        e.preventDefault();
        // Close any open modals
        document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(modal => {
            if (modal.id && modal.id.includes('Modal')) {
                hideModal(modal.id);
            }
        });
        return;
    }

    // Handle ? key for shortcuts
    if (key === '?' && !isCtrl) {
        e.preventDefault();
        showModal('keyboardShortcutsModal');
        return;
    }

    // Navigation shortcuts (Ctrl + Number)
    if (isCtrl) {
        switch (key) {
            case '1':
                e.preventDefault();
                switchPage('dashboard');
                break;
            case '2':
                e.preventDefault();
                switchPage('timeline');
                break;
            case '3':
                e.preventDefault();
                switchPage('analytics');
                break;
            case '4':
                e.preventDefault();
                switchPage('activities');
                break;
            case '5':
                e.preventDefault();
                switchPage('categories');
                break;
            case '6':
                e.preventDefault();
                switchPage('settings');
                break;
            case 'n':
                e.preventDefault();
                showAddActivityModal();
                break;
            case 'e':
                e.preventDefault();
                exportData();
                break;
            case 't':
                e.preventDefault();
                const toggle = document.getElementById('trackingToggle');
                if (toggle) {
                    toggle.checked = !toggle.checked;
                    toggle.dispatchEvent(new Event('change'));
                }
                break;
            case 'f':
                e.preventDefault();
                const searchInput = document.getElementById('activitySearch');
                if (searchInput && state.currentPage === 'activities') {
                    searchInput.focus();
                }
                break;
            case 'm':
                e.preventDefault();
                // Focus mode - hide sidebar
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('hidden');
                    showToast(sidebar.classList.contains('hidden') ? 'Focus mode enabled' : 'Focus mode disabled', 'info');
                }
                break;
        }
        return;
    }

    // Timeline-specific shortcuts (only when on timeline page)
    if (state.currentPage === 'timeline') {
        switch (key) {
            case 'arrowleft':
                e.preventDefault();
                navigateDate(-1);
                break;
            case 'arrowright':
                e.preventDefault();
                navigateDate(1);
                break;
            case '+':
            case '=':
                e.preventDefault();
                const currentZoom = state.timeline.zoomLevel;
                const zoomLevels = [0.5, 1, 2, 4];
                const currentIndex = zoomLevels.indexOf(currentZoom);
                if (currentIndex < zoomLevels.length - 1) {
                    zoomTimeline(zoomLevels[currentIndex + 1]);
                }
                break;
            case '-':
                e.preventDefault();
                const currentZoomMinus = state.timeline.zoomLevel;
                const zoomLevelsMinus = [0.5, 1, 2, 4];
                const currentIndexMinus = zoomLevelsMinus.indexOf(currentZoomMinus);
                if (currentIndexMinus > 0) {
                    zoomTimeline(zoomLevelsMinus[currentIndexMinus - 1]);
                }
                break;
            case 'home':
                e.preventDefault();
                state.currentDate = new Date();
                updateTimeline();
                updateDateDisplays();
                showToast('Navigated to today', 'info');
                break;
        }
        return;
    }

    // Global shortcuts
    if (key === 'f5') {
        e.preventDefault();
        updateUI();
        showToast('Data refreshed', 'success');
        return;
    }
}

// Setup IPC Listeners
function setupIPCListeners() {
    ipcRenderer.on('window-focus-changed', (event, data) => {
        if (state.isTracking && data.app) {
            handleActivityChange(data);
        }
    });
    
    ipcRenderer.on('tracking-status', (event, status) => {
        state.isTracking = status;
        updateTrackingStatus();
    });
}

// Activity Tracking
function startTracking() {
    state.isTracking = true;
    ipcRenderer.send('get-active-window');
    
    // Request active window every 5 seconds
    if (!state.trackingInterval) {
        state.trackingInterval = setInterval(() => {
            if (state.isTracking) {
                ipcRenderer.send('get-active-window');
            }
        }, 5000);
    }
    
    updateTrackingStatus();
    debug.log('Tracking started');
}

function stopTracking() {
    state.isTracking = false;
    
    // End current activity
    if (state.currentActivity) {
        endCurrentActivity();
    }
    
    // Clear tracking interval
    if (state.trackingInterval) {
        clearInterval(state.trackingInterval);
        state.trackingInterval = null;
    }
    
    updateTrackingStatus();
    debug.log('Tracking stopped');
}

function handleActivityChange(windowData) {
    const { app, title, appIcon, appPath } = windowData;
    
    // Check if this is a new activity
    if (state.currentActivity && 
        state.currentActivity.app === app && 
        state.currentActivity.title === title) {
        return; // Same activity, no change needed
    }
    
    // End current activity
    if (state.currentActivity) {
        endCurrentActivity();
    }
    
    // Start new activity
    state.currentActivity = {
        id: generateId(),
        app: app,
        title: title,
        appIcon: appIcon,
        appPath: appPath,
        category: getCategoryForApp(app, title),
        startTime: new Date().toISOString(),
        endTime: null,
        duration: 0
    };

    // Cache the app icon
    if (appIcon && app) {
        state.appIconCache.set(app, appIcon);
    }
    
    debug.log('Activity changed', state.currentActivity);
    updateUI();
}

function endCurrentActivity() {
    if (!state.currentActivity) return;
    
    state.currentActivity.endTime = new Date().toISOString();
    state.currentActivity.duration = 
        new Date(state.currentActivity.endTime) - new Date(state.currentActivity.startTime);
    
    state.activities.push(state.currentActivity);
    state.currentActivity = null;
    
    saveActivities();
}

// Simple Auto-Categorization Algorithm
function autoCategorizeApp(appName, windowTitle = '', url = '') {
    const context = `${appName} ${windowTitle} ${url}`.toLowerCase();
    
    // Productive patterns
    const productiveKeywords = [
        'code', 'studio', 'intellij', 'webstorm', 'pycharm', 'atom', 'sublime', 'vim', 'notepad++',
        'git', 'github', 'gitlab', 'terminal', 'cmd', 'powershell', 'console',
        'docker', 'postman', 'figma', 'photoshop', 'illustrator', 'blender',
        'word', 'excel', 'powerpoint', 'onenote', 'notion', 'obsidian',
        'jira', 'confluence', 'trello', 'asana', 'calculator'
    ];
    
    // Break patterns  
    const breakKeywords = [
        'slack', 'teams', 'zoom', 'skype', 'email', 'gmail', 'outlook',
        'kindle', 'books', 'pdf', 'documentation', 'wikipedia', 'stackoverflow',
        'spotify', 'music', 'podcast', 'news', 'medium'
    ];
    
    // Distracted patterns
    const distractedKeywords = [
        'facebook', 'instagram', 'twitter', 'tiktok', 'snapchat', 'linkedin',
        'youtube', 'netflix', 'hulu', 'disney', 'twitch', 'steam', 'games',
        'gaming', 'entertainment', 'movie', 'meme', 'funny'
    ];
    
    // Calculate scores
    let productiveScore = productiveKeywords.filter(keyword => context.includes(keyword)).length;
    let breakScore = breakKeywords.filter(keyword => context.includes(keyword)).length;
    let distractedScore = distractedKeywords.filter(keyword => context.includes(keyword)).length;
    
    // Browser-specific logic
    if (context.includes('chrome') || context.includes('firefox') || context.includes('safari') || context.includes('edge')) {
        if (context.includes('github') || context.includes('stackoverflow') || context.includes('docs') || context.includes('api')) {
            productiveScore += 2;
        } else if (context.includes('facebook') || context.includes('youtube') || context.includes('netflix')) {
            distractedScore += 2;
        } else {
            breakScore += 1;
        }
    }
    
    // Return category with highest score
    if (productiveScore >= breakScore && productiveScore >= distractedScore) {
        return 'productive';
    } else if (distractedScore >= breakScore) {
        return 'distracted';
    } else {
        return 'break';
    }
}

function getCategoryForApp(appName, windowTitle = '', url = '') {
    // Check manual categories first (user overrides)
    if (state.settings.categories[appName]) {
        return state.settings.categories[appName];
    }
    
    // Check partial matches in manual categories
    const appLower = appName.toLowerCase();
    for (const [key, category] of Object.entries(state.settings.categories)) {
        if (appLower.includes(key.toLowerCase()) || key.toLowerCase().includes(appLower)) {
            return category;
        }
    }
    
    // Use auto categorization if enabled
    if (state.settings.autoCategory) {
        const autoCategory = autoCategorizeApp(appName, windowTitle, url);
        
        debug.log(`Auto categorized "${appName}" as "${autoCategory}"`);
        showToast(`Auto-categorized ${appName} as ${autoCategory}`, 'info');
        
        // Auto-add to manual categories for consistency
        state.settings.categories[appName] = autoCategory;
        saveSettings();
        
        return autoCategory;
    }
    
    // Fallback to simple categorization
    if (appLower.includes('code') || appLower.includes('studio') || appLower.includes('editor')) {
        return 'productive';
    } else if (appLower.includes('browser') || appLower.includes('chrome') || appLower.includes('firefox')) {
        return 'break';
    }
    
    return 'break';
}

// UI Updates
function updateUI() {
    switch (state.currentPage) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'timeline':
            updateTimeline();
            break;
        case 'activities':
            updateActivitiesTable();
            break;
        case 'analytics':
            updateAnalytics();
            break;
        case 'categories':
            updateCategories();
            break;
        case 'settings':
            updateSettings();
            break;
    }
}

function updateRealTimeElements() {
    // Update current session time
    const sessionTime = document.getElementById('currentSessionTime');
    if (sessionTime && state.currentActivity) {
        const duration = new Date() - new Date(state.currentActivity.startTime);
        sessionTime.textContent = formatDuration(duration);
    }
    
    // Update today's stats in sidebar
    updateTodayStats();
    
    // Update date displays
    updateDateDisplays();
    
    // Update timeline current time indicator
    updateCurrentTimeIndicator();
}

function updateTodayStats() {
    const todayActivities = getActivitiesForPeriod('today', new Date());
    
    let totalTime = 0;
    let productiveTime = 0;
    
    todayActivities.forEach(activity => {
        const duration = activity.duration || 
            (activity === state.currentActivity ? 
                new Date() - new Date(activity.startTime) : 0);
        
        totalTime += duration;
        
        if (activity.category === 'productive') {
            productiveTime += duration;
        }
    });
    
    // Include current activity if it's today and productive
    if (state.currentActivity) {
        const currentDuration = new Date() - new Date(state.currentActivity.startTime);
        const activityDate = new Date(state.currentActivity.startTime);
        const today = new Date();
        
        if (activityDate.toDateString() === today.toDateString()) {
            totalTime += currentDuration;
            if (state.currentActivity.category === 'productive') {
                productiveTime += currentDuration;
            }
        }
    }
    
    const todayTotalTimeEl = document.getElementById('todayTotalTime');
    const todayProductiveTimeEl = document.getElementById('todayProductiveTime');
    
    if (todayTotalTimeEl) {
        todayTotalTimeEl.textContent = formatDuration(totalTime);
    }
    
    if (todayProductiveTimeEl) {
        todayProductiveTimeEl.textContent = formatDuration(productiveTime);
    }
}

function updateDashboard() {
    updateStats();
    updateTodayActivities();
    updateTopApplications();
    updateGoalProgress();
}

function updateStats() {
    const selectedDate = new Date(state.currentDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    const selectedActivities = getActivitiesForDate(state.currentDate);
    
    // Get yesterday's activities for comparison
    const yesterday = new Date(state.currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayActivities = getActivitiesForDate(yesterday);
    
    let totalTime = 0;
    let productiveTime = 0;
    let breakTime = 0;
    let distractedTime = 0;
    
    selectedActivities.forEach(activity => {
        const duration = activity.duration || 
            (activity === state.currentActivity && 
             new Date(activity.startTime).toDateString() === selectedDate.toDateString() ? 
                new Date() - new Date(activity.startTime) : 0);
        
        totalTime += duration;
        
        switch (activity.category) {
            case 'productive':
                productiveTime += duration;
                break;
            case 'break':
                breakTime += duration;
                break;
            case 'distracted':
                distractedTime += duration;
                break;
        }
    });
    
    // Calculate yesterday's total for comparison
    let yesterdayTotalTime = 0;
    yesterdayActivities.forEach(activity => {
        yesterdayTotalTime += activity.duration || 0;
    });
    
    // Calculate percentage change
    let changePercent = 0;
    if (yesterdayTotalTime > 0) {
        changePercent = Math.round(((totalTime - yesterdayTotalTime) / yesterdayTotalTime) * 100);
    } else if (totalTime > 0) {
        changePercent = 100;
    }
    
    // Update displays
    document.getElementById('totalTime').textContent = formatDuration(totalTime);
    document.getElementById('productiveTime').textContent = formatDuration(productiveTime);
    document.getElementById('breakTime').textContent = formatDuration(breakTime);
    document.getElementById('distractedTime').textContent = formatDuration(distractedTime);
    
    // Update percentage change
    const changeEl = document.getElementById('totalTimeChange');
    if (changeEl) {
        const isPositive = changePercent >= 0;
        changeEl.innerHTML = `<i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${isPositive ? '+' : ''}${changePercent}% from yesterday`;
        changeEl.style.color = isPositive ? 'var(--success)' : 'var(--danger)';
    }
    
    // Update progress bars
    if (totalTime > 0) {
        const productiveBar = document.getElementById('productiveProgress');
        const breakBar = document.getElementById('breakProgress');
        const distractedBar = document.getElementById('distractedProgress');
        
        if (productiveBar) productiveBar.style.width = `${(productiveTime / totalTime) * 100}%`;
        if (breakBar) breakBar.style.width = `${(breakTime / totalTime) * 100}%`;
        if (distractedBar) distractedBar.style.width = `${(distractedTime / totalTime) * 100}%`;
    }
}

function updateTodayActivities() {
    const container = document.getElementById('todayActivities');
    if (!container) return;
    
    const activities = getActivitiesForDate(state.currentDate);
    
    if (activities.length === 0) {
        const isToday = state.currentDate.toDateString() === new Date().toDateString();
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-calendar-times text-muted-foreground text-2xl mb-2"></i>
                <p class="text-muted-foreground text-sm">No activities tracked ${isToday ? 'today' : 'for this day'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => {
        const appIcon = getAppIcon(activity.app);
        const iconHtml = appIcon ? 
            `<img src="${appIcon}" alt="${activity.app}" class="w-8 h-8 rounded" />` : 
            `<div class="w-8 h-8 flex items-center justify-center rounded bg-muted"><i class="fas fa-${getCategoryIcon(activity.category)} text-muted-foreground"></i></div>`;
        
        const categoryColor = {
            'productive': 'text-green-600',
            'break': 'text-yellow-600', 
            'distracted': 'text-red-600'
        }[activity.category] || 'text-muted-foreground';
            
        return `
            <div class="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                ${iconHtml}
                <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">${activity.app}</p>
                    <p class="text-sm text-muted-foreground truncate">${activity.title || 'No title'}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-medium">${formatDuration(activity.duration || 0)}</p>
                    <p class="text-xs ${categoryColor}">${activity.category}</p>
                </div>
            </div>
        `;
    }).join('');
}

function updateTopApplications() {
    const container = document.getElementById('topApplications');
    if (!container) return;
    
    const appUsage = {};
    const activities = getActivitiesForDate(state.currentDate);
    
    activities.forEach(activity => {
        const duration = activity.duration || 
            (activity === state.currentActivity && 
             new Date(activity.startTime).toDateString() === state.currentDate.toDateString() ? 
                new Date() - new Date(activity.startTime) : 0);
        
        if (!appUsage[activity.app]) {
            appUsage[activity.app] = {
                time: 0,
                category: activity.category
            };
        }
        appUsage[activity.app].time += duration;
    });
    
    const sortedApps = Object.entries(appUsage)
        .sort(([, a], [, b]) => b.time - a.time)
        .slice(0, 5);
    
    if (sortedApps.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-desktop text-muted-foreground text-2xl mb-2"></i>
                <p class="text-muted-foreground text-sm">No applications tracked</p>
            </div>
        `;
        return;
    }
    
    const totalTime = sortedApps.reduce((sum, [, data]) => sum + data.time, 0);
    
    container.innerHTML = sortedApps.map(([app, data], index) => {
        const percentage = totalTime > 0 ? Math.round((data.time / totalTime) * 100) : 0;
        const appIcon = getAppIcon(app);
        const iconHtml = appIcon ? 
            `<img src="${appIcon}" alt="${app}" class="w-10 h-10 rounded" />` : 
            `<div class="w-10 h-10 flex items-center justify-center rounded bg-muted"><i class="fas fa-${getCategoryIcon(data.category)} text-muted-foreground"></i></div>`;
        
        const categoryColor = {
            'productive': 'bg-green-500',
            'break': 'bg-yellow-500', 
            'distracted': 'bg-red-500'
        }[data.category] || 'bg-gray-500';
        
        return `
            <div class="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        ${iconHtml}
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 ${categoryColor} rounded-full border-2 border-background"></div>
                    </div>
                    <div>
                        <p class="font-medium">${app}</p>
                        <p class="text-sm text-muted-foreground">${formatDuration(data.time)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium">${percentage}%</div>
                    <div class="text-xs text-muted-foreground">#${index + 1}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateGoalProgress() {
    const activities = getTodayActivities();
    let productiveTime = 0;
    
    activities.forEach(activity => {
        if (activity.category === 'productive') {
            productiveTime += activity.duration || 
                (activity === state.currentActivity ? 
                    new Date() - new Date(activity.startTime) : 0);
        }
    });
    
    const goalHours = state.settings.dailyGoal;
    const goalMs = goalHours * 60 * 60 * 1000;
    const percentage = Math.min((productiveTime / goalMs) * 100, 100);
    
    // Update circular progress
    const progressFill = document.getElementById('goalProgress');
    if (progressFill) {
        const circumference = 283; // 2 * π * 45
        const offset = circumference - (percentage / 100) * circumference;
        progressFill.style.strokeDashoffset = offset;
    }
    
    // Update text
    document.getElementById('goalPercentage').textContent = `${Math.round(percentage)}%`;
    document.getElementById('goalProductiveTime').textContent = formatDuration(productiveTime);
    document.getElementById('goalRemaining').textContent = formatDuration(Math.max(goalMs - productiveTime, 0));
    document.getElementById('dailyGoalTarget').textContent = `${goalHours}h`;
}

function updateTimeline() {
    const timeScaleContainer = document.getElementById('timelineTimeScale');
    const activitiesContainer = document.getElementById('timelineActivities');
    
    if (!timeScaleContainer || !activitiesContainer) return;
    
    let activities = [];
    
    switch (state.currentTimelineView) {
        case 'day':
            activities = getActivitiesForDate(state.currentDate);
            break;
        case 'week':
            activities = getActivitiesForPeriod('week', state.currentDate);
            break;
        case 'month':
            activities = getActivitiesForPeriod('month', state.currentDate);
            break;
    }
    
    // Filter activities longer than 2 minutes
    activities = activities.filter(activity => {
        const duration = activity.duration || (Date.now() - new Date(activity.startTime));
        return duration >= 120000; // 2 minutes
    });
    
    // Sort activities by start time
    activities.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    // Generate time scale (24 hours) with enhanced zoom scaling
    const baseHourHeight = 80;
    const hourHeight = Math.max(40, baseHourHeight * state.timeline.zoomLevel);
    const totalHeight = hourHeight * 24;
    
    const timeScale = Array.from({length: 24}, (_, i) => {
        const isCurrentHour = new Date().getHours() === i && state.currentDate.toDateString() === new Date().toDateString();
        return `
            <div class="relative border-b border-border/50 flex items-center justify-center ${isCurrentHour ? 'bg-primary/10' : ''}" 
                 style="height: ${hourHeight}px;">
                <div class="text-xs font-medium text-muted-foreground ${isCurrentHour ? 'text-primary font-bold' : ''}">
                    ${i.toString().padStart(2, '0')}:00
                </div>
                ${isCurrentHour ? '<div class="absolute left-0 w-1 h-full bg-primary"></div>' : ''}
            </div>
        `;
    }).join('');
    
    timeScaleContainer.innerHTML = timeScale;
    timeScaleContainer.style.height = `${totalHeight}px`;
    
    if (activities.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <div class="text-center">
                    <i class="fas fa-calendar-times text-muted-foreground text-4xl mb-4"></i>
                    <h3 class="text-lg font-semibold text-muted-foreground mb-2">No Activities Found</h3>
                    <p class="text-sm text-muted-foreground">No activities tracked for this period (showing only 2+ min activities)</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Calculate activity positions for vertical layout
    let timelineHTML = '';
    let previousEndPosition = 0;
    
    const activityTracks = groupActivitiesForTimeline(activities);
    const trackCount = activityTracks.length;
    
    activityTracks.forEach((track, trackIndex) => {
        track.forEach(activity => {
            const activityStart = new Date(activity.startTime);
            const activityEnd = activity.endTime ? new Date(activity.endTime) : new Date();
            const duration = activityEnd - activityStart;
            
            // Calculate vertical position based on time
            const startHour = activityStart.getHours();
            const startMinutes = activityStart.getMinutes();
            const endHour = activityEnd.getHours();
            const endMinutes = activityEnd.getMinutes();
            
            const startPosition = (startHour * hourHeight) + (startMinutes / 60 * hourHeight);
            const endPosition = (endHour * hourHeight) + (endMinutes / 60 * hourHeight);
            const blockHeight = Math.max(20 * state.timeline.zoomLevel, endPosition - startPosition);
            
            // Add spacing if there's a gap between activities
            const gap = startPosition - previousEndPosition;
            if (gap > 10 && index > 0) {
                timelineHTML += `
                    <div class="relative flex items-center py-2 timeline-gap" style="margin-top: ${gap}px;">
                        <div class="absolute left-6 w-2 h-2 bg-muted rounded-full -ml-1"></div>
                        <div class="ml-12 text-xs text-muted-foreground italic bg-background px-2 py-1 rounded-full border border-border/50 shadow-sm">
                            <i class="fas fa-clock mr-1 opacity-50"></i>
                            ${gap > hourHeight ? `${Math.round(gap / hourHeight)}h ${Math.round((gap % hourHeight) / hourHeight * 60)}m gap` : `${Math.round(gap / hourHeight * 60)}m gap`}
                        </div>
                    </div>
                `;
            }
            
            const appIcon = getAppIcon(activity.app);
            const iconHtml = appIcon ? 
                `<img src="${appIcon}" alt="${activity.app}" class="w-6 h-6 rounded-sm mr-3 flex-shrink-0" />` : 
                `<div class="w-6 h-6 bg-muted rounded-sm mr-3 flex-shrink-0 flex items-center justify-center">
                    <i class="fas fa-${getCategoryIcon(activity.category)} text-xs text-muted-foreground"></i>
                </div>`;
            
            const categoryColors = {
                'productive': 'bg-gradient-to-r from-green-500 to-green-600 border-green-600 text-white shadow-green-100',
                'break': 'bg-gradient-to-r from-yellow-500 to-yellow-600 border-yellow-600 text-white shadow-yellow-100',
                'distracted': 'bg-gradient-to-r from-red-500 to-red-600 border-red-600 text-white shadow-red-100'
            };
            
            const categoryIcons = {
                'productive': 'code',
                'break': 'coffee',
                'distracted': 'mobile-alt'
            };
            
            timelineHTML += `
                <div class="relative flex items-start group hover:scale-[1.02] transition-all duration-200" 
                     style="margin-top: ${index === 0 ? startPosition : Math.max(0, startPosition - previousEndPosition)}px;">
                    <!-- Timeline node -->
                    <div class="absolute left-6 w-4 h-4 bg-primary rounded-full border-2 border-card shadow-sm -ml-2 mt-2 z-10 timeline-node"></div>
                    
                    <!-- Activity card -->
                    <div class="ml-12 timeline-card ${categoryColors[activity.category] || 'bg-gradient-to-r from-gray-500 to-gray-600 border-gray-600 text-white shadow-gray-100'} 
                         rounded-lg border-l-4 shadow-lg hover:shadow-xl cursor-pointer min-w-0 flex-1 activity-${activity.category}"
                         style="min-height: ${blockHeight}px;"
                         onclick="showActivityDetails('${activity.id}')"
                         title="${activity.app} - ${activity.title || 'No title'} (${formatDuration(duration)})">
                        
                        <div class="p-4 h-full flex flex-col justify-between">
                            <!-- Header -->
                            <div class="flex items-center">
                                ${state.timeline.zoomLevel >= 1 ? iconHtml : ''}
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center space-x-2 mb-1">
                                        <h4 class="font-semibold text-sm truncate">${activity.app}</h4>
                                        <i class="fas fa-${categoryIcons[activity.category]} text-xs opacity-75"></i>
                                    </div>
                                    ${state.timeline.zoomLevel >= 1.5 && activity.title ? 
                                        `<p class="text-xs opacity-90 truncate">${activity.title}</p>` : ''}
                                </div>
                                <div class="text-right flex-shrink-0 ml-3">
                                    <div class="text-xs font-medium opacity-90">
                                        ${formatDuration(duration)}
                                    </div>
                                    ${state.timeline.zoomLevel >= 1.5 ? 
                                        `<div class="text-xs opacity-75">
                                            ${activityStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>` : ''}
                                </div>
                            </div>
                            
                            <!-- Progress bar for longer activities -->
                            ${blockHeight > 60 && state.timeline.zoomLevel >= 2 ? `
                                <div class="mt-3">
                                    <div class="w-full bg-white/20 rounded-full h-1">
                                        <div class="bg-white h-1 rounded-full" style="width: 100%"></div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            previousEndPosition = endPosition;
        });
    });
    
    activitiesContainer.innerHTML = timelineHTML;
    activitiesContainer.style.minHeight = `${totalHeight}px`;
    
    // Update current time indicator
    updateCurrentTimeIndicator();
}

function updateCurrentTimeIndicator() {
    const indicator = document.getElementById('currentTimeLine');
    const timeLabel = document.getElementById('currentTimeLabel');
    if (!indicator) return;
    
    const now = new Date();
    const isToday = state.currentDate.toDateString() === now.toDateString();
    
    if (!isToday || state.currentPage !== 'timeline') {
        indicator.classList.add('hidden');
        return;
    }
    
    indicator.classList.remove('hidden');
    indicator.classList.add('current-time-line');
    
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Calculate vertical position based on current time
    const baseHourHeight = 80;
    const hourHeight = Math.max(40, baseHourHeight * state.timeline.zoomLevel);
    const topPosition = hours * hourHeight + (minutes / 60) * hourHeight;
    
    indicator.style.top = `${topPosition}px`;
    
    if (timeLabel) {
        timeLabel.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Timeline Enhancement Functions
function getTimelineHourHeight() {
    // Updated for vertical timeline layout
    const baseHourHeight = 80;
    return Math.max(40, baseHourHeight * state.timeline.zoomLevel);
}

function changeTimelineView(viewMode) {
    state.currentTimelineView = viewMode;
    state.timeline.viewMode = viewMode;
    
    // Update view buttons
    document.querySelectorAll('[data-view]').forEach(btn => {
        if (btn.dataset.view === viewMode) {
            btn.classList.remove('bg-secondary', 'text-secondary-foreground');
            btn.classList.add('bg-primary', 'text-primary-foreground');
        } else {
            btn.classList.remove('bg-primary', 'text-primary-foreground');
            btn.classList.add('bg-secondary', 'text-secondary-foreground');
        }
    });
    
    updateTimeline();
    showToast(`Timeline view changed to ${viewMode}`, 'info');
}

function zoomTimeline(zoomLevel) {
    state.timeline.zoomLevel = zoomLevel;
    
    // Update zoom buttons
    document.querySelectorAll('[data-zoom]').forEach(btn => {
        if (parseFloat(btn.dataset.zoom) === zoomLevel) {
            btn.classList.remove('bg-secondary', 'text-secondary-foreground');
            btn.classList.add('bg-primary', 'text-primary-foreground');
        } else {
            btn.classList.remove('bg-primary', 'text-primary-foreground');
            btn.classList.add('bg-secondary', 'text-secondary-foreground');
        }
    });
    
    updateTimeline();
    showToast(`Timeline zoom set to ${zoomLevel}x`, 'info');
}

function showActivityDetails(activityId) {
    const activity = state.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const modal = document.getElementById('activityDetailsModal');
    if (!modal) {
        // Create modal if it doesn't exist
        document.body.insertAdjacentHTML('beforeend', `
            <div id="activityDetailsModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
                <div class="bg-card p-6 rounded-lg shadow-lg max-w-md w-full m-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Activity Details</h3>
                        <button onclick="hideModal('activityDetailsModal')" class="text-muted-foreground hover:text-foreground text-xl">×</button>
                    </div>
                    <div id="activityDetailsContent"></div>
                </div>
            </div>
        `);
    }
    
    const content = document.getElementById('activityDetailsContent');
    const appIcon = getAppIcon(activity.app);
    const duration = formatDuration(activity.duration || 0);
    const categoryColor = getCategoryColor(activity.category);
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center space-x-3">
                ${appIcon ? `<img src="${appIcon}" alt="${activity.app}" class="w-8 h-8" />` : '<div class="w-8 h-8 bg-muted rounded"></div>'}
                <div>
                    <div class="font-medium">${activity.app}</div>
                    <div class="text-sm text-muted-foreground">${activity.title || 'No title'}</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div class="text-muted-foreground">Category</div>
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-${categoryColor} rounded-full mr-2"></div>
                        ${activity.category}
                    </div>
                </div>
                <div>
                    <div class="text-muted-foreground">Duration</div>
                    <div>${duration}</div>
                </div>
                <div>
                    <div class="text-muted-foreground">Start Time</div>
                    <div>${new Date(activity.startTime).toLocaleString()}</div>
                </div>
                <div>
                    <div class="text-muted-foreground">End Time</div>
                    <div>${activity.endTime ? new Date(activity.endTime).toLocaleString() : 'Ongoing'}</div>
                </div>
            </div>
            <div class="flex justify-end space-x-2 pt-4">
                <button onclick="hideModal('activityDetailsModal')" class="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors">
                    Close
                </button>
            </div>
        </div>
    `;
    
    showModal('activityDetailsModal');
}

function updateActivitiesTable() {
    const container = document.getElementById('activitiesTable');
    const tableInfo = document.getElementById('tableInfo');
    const paginationContainer = document.getElementById('paginationControls');
    
    if (!container) return;
    
    // Filter activities based on search and filters
    let filteredActivities = state.activities.filter(activity => {
        // Date range filter
        const activityDate = new Date(activity.startTime);
        const now = new Date();
        
        switch (state.activitiesFilter.dateRange) {
            case 'today':
                if (activityDate.toDateString() !== now.toDateString()) return false;
                break;
            case 'week': {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - 7);
                if (activityDate < weekStart) return false;
                break;
            }
            case 'month': {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                if (activityDate < monthStart) return false;
                break;
            }
        }
        
        // Category filter
        if (state.activitiesFilter.category && activity.category !== state.activitiesFilter.category) {
            return false;
        }
        
        // Search filter
        if (state.activitiesFilter.search) {
            const search = state.activitiesFilter.search.toLowerCase();
            const matchesApp = activity.app.toLowerCase().includes(search);
            const matchesTitle = (activity.title || '').toLowerCase().includes(search);
            if (!matchesApp && !matchesTitle) return false;
        }
        
        return true;
    });
    
    // Sort by start time (newest first)
    filteredActivities.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    // Update total entries count
    state.pagination.totalEntries = filteredActivities.length;
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredActivities.length / state.pagination.entriesPerPage);
    state.pagination.currentPage = Math.min(state.pagination.currentPage, Math.max(1, totalPages));
    
    const startIndex = (state.pagination.currentPage - 1) * state.pagination.entriesPerPage;
    const endIndex = startIndex + state.pagination.entriesPerPage;
    const pageActivities = filteredActivities.slice(startIndex, endIndex);
    
    // Update table info
    if (tableInfo) {
        const showing = filteredActivities.length === 0 ? 0 : startIndex + 1;
        const to = Math.min(endIndex, filteredActivities.length);
        tableInfo.textContent = `Showing ${showing} to ${to} of ${filteredActivities.length} entries`;
    }
    
    if (pageActivities.length === 0) {
        container.innerHTML = '<p class="text-center py-4">No activities found</p>';
        updatePagination(0);
        return;
    }
    
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-border">
                <thead class="bg-muted/50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Application</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Time</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-background divide-y divide-border">
                    ${pageActivities.map(activity => {
                        const appIcon = getAppIcon(activity.app);
                        const iconHtml = appIcon ? 
                            `<img src="${appIcon}" alt="${activity.app}" class="w-5 h-5 rounded mr-3" />` : 
                            `<div class="w-5 h-5 flex items-center justify-center rounded bg-muted mr-3"><i class="fas fa-${getCategoryIcon(activity.category)} text-xs text-muted-foreground"></i></div>`;
                        
                        const categoryColors = {
                            'productive': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                            'break': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
                            'distracted': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        };
                        
                        return `
                            <tr class="hover:bg-muted/50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        ${iconHtml}
                                        <span class="font-medium">${activity.app}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4 max-w-xs truncate text-sm text-muted-foreground">${activity.title || '-'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${categoryColors[activity.category] || 'bg-gray-100 text-gray-800'}">
                                        ${activity.category}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">${new Date(activity.startTime).toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${formatDuration(activity.duration)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <button class="text-red-600 hover:text-red-800 p-1 rounded transition-colors" 
                                            onclick="deleteActivity('${activity.id}')" 
                                            title="Delete activity">
                                        <i class="fas fa-trash text-sm"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const container = document.getElementById('paginationControls');
    if (!container || totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const currentPage = state.pagination.currentPage;
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}" 
                onclick="goToPage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // First page
    if (startPage > 1) {
        paginationHTML += `
            <button class="px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-secondary transition-colors" onclick="goToPage(1)">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += '<span class="px-3 py-2 text-sm text-muted-foreground">...</span>';
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="px-3 py-2 text-sm border border-border rounded-md transition-colors ${i === currentPage ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary'}" 
                    onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span class="px-3 py-2 text-sm text-muted-foreground">...</span>';
        }
        paginationHTML += `
            <button class="px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-secondary transition-colors" onclick="goToPage(${totalPages})">${totalPages}</button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button class="px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''}" 
                onclick="goToPage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    container.innerHTML = paginationHTML;
}

// Global functions for pagination and UI interactions
window.goToPage = function(page) {
    if (page >= 1 && page <= Math.ceil(state.pagination.totalEntries / state.pagination.entriesPerPage)) {
        state.pagination.currentPage = page;
        updateActivitiesTable();
    }
};

// Export global functions for onclick handlers
window.changeTimelineView = changeTimelineView;
window.zoomTimeline = zoomTimeline;
window.navigateDate = navigateDate;
window.showActivityDetails = showActivityDetails;
window.addAppToCategory = addAppToCategory;
window.removeAppFromCategory = removeAppFromCategory;
window.bulkCategorizeApps = bulkCategorizeApps;
window.processBulkCategorize = processBulkCategorize;
window.importCategoriesFromCSV = importCategoriesFromCSV;
window.exportCategoriesToCSV = exportCategoriesToCSV;
window.deleteActivity = deleteActivity;
window.handleKeyboardShortcuts = handleKeyboardShortcuts;

// Enhanced Analytics Function
function updateAnalytics() {
    const container = document.getElementById('analyticsContent');
    if (!container) return;
    
    const stats = calculateEnhancedAnalytics();
    
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Overview Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="card bg-card border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-muted-foreground">Total Today</p>
                            <p class="text-2xl font-bold">${formatDuration(stats.todayTotal)}</p>
                        </div>
                        <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                            <i class="fas fa-clock text-blue-600"></i>
                        </div>
                    </div>
                </div>
                
                <div class="card bg-card border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-muted-foreground">Productivity Score</p>
                            <p class="text-2xl font-bold text-green-600">${stats.productivityScore}/100</p>
                        </div>
                        <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <i class="fas fa-trophy text-green-600"></i>
                        </div>
                    </div>
                </div>
                
                <div class="card bg-card border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-muted-foreground">Focus Sessions</p>
                            <p class="text-2xl font-bold">${stats.focusSessions}</p>
                        </div>
                        <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                            <i class="fas fa-bullseye text-purple-600"></i>
                        </div>
                    </div>
                </div>
                
                <div class="card bg-card border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-muted-foreground">Streak Days</p>
                            <p class="text-2xl font-bold text-orange-600">${stats.streakDays}</p>
                        </div>
                        <div class="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                            <i class="fas fa-fire text-orange-600"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Detailed Analytics -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Category Distribution -->
                <div class="card bg-card border border-border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-chart-pie text-green-600 mr-2"></i>
                        Category Distribution
                    </h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                                <span class="text-muted-foreground">Productive</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="font-semibold text-green-600">${stats.productivePercent}%</span>
                                <div class="w-20 h-2 bg-muted rounded-full">
                                    <div class="h-full bg-green-500 rounded-full" style="width: ${stats.productivePercent}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                                <span class="text-muted-foreground">Break</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="font-semibold text-yellow-600">${stats.breakPercent}%</span>
                                <div class="w-20 h-2 bg-muted rounded-full">
                                    <div class="h-full bg-yellow-500 rounded-full" style="width: ${stats.breakPercent}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                                <span class="text-muted-foreground">Distracted</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="font-semibold text-red-600">${stats.distractedPercent}%</span>
                                <div class="w-20 h-2 bg-muted rounded-full">
                                    <div class="h-full bg-red-500 rounded-full" style="width: ${stats.distractedPercent}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Peak Hours -->
                <div class="card bg-card border border-border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-clock text-blue-600 mr-2"></i>
                        Peak Productivity Hours
                    </h3>
                    <div class="space-y-2">
                        ${stats.peakHours.map((hour, index) => `
                            <div class="flex items-center justify-between py-2 ${index === 0 ? 'border-b border-border' : ''}">
                                <span class="text-sm ${index === 0 ? 'font-semibold' : 'text-muted-foreground'}">${hour.time}</span>
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm ${index === 0 ? 'font-semibold' : ''}">${formatDuration(hour.duration)}</span>
                                    <div class="w-16 h-2 bg-muted rounded-full">
                                        <div class="h-full bg-blue-500 rounded-full" style="width: ${hour.percentage}%"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Weekly Trends -->
                <div class="card bg-card border border-border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-trending-up text-purple-600 mr-2"></i>
                        Weekly Trends
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Total This Week:</span>
                            <span class="font-semibold">${formatDuration(stats.weekTotal)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Daily Average:</span>
                            <span class="font-semibold">${formatDuration(stats.dailyAverage)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">vs Last Week:</span>
                            <span class="font-semibold ${stats.weekTrend >= 0 ? 'text-green-600' : 'text-red-600'}">
                                ${stats.weekTrend > 0 ? '+' : ''}${stats.weekTrend}%
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Best Day:</span>
                            <span class="font-semibold">${stats.mostProductiveDay}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Top Applications -->
                <div class="card bg-card border border-border rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-star text-yellow-600 mr-2"></i>
                        Top Applications
                    </h3>
                    <div class="space-y-3">
                        ${stats.topApps.slice(0, 5).map((app, index) => `
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <span class="text-sm font-medium w-4">${index + 1}</span>
                                    ${app.icon ? `<img src="${app.icon}" alt="${app.name}" class="w-5 h-5" />` : '<div class="w-5 h-5 bg-muted rounded"></div>'}
                                    <span class="text-sm truncate">${app.name}</span>
                                </div>
                                <div class="text-sm font-medium">${formatDuration(app.duration)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Insights -->
            <div class="card bg-card border border-border rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 flex items-center">
                    <i class="fas fa-lightbulb text-yellow-600 mr-2"></i>
                    Insights & Recommendations
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${stats.insights.map(insight => `
                        <div class="p-4 bg-accent rounded-lg">
                            <div class="flex items-start space-x-3">
                                <div class="p-2 bg-${insight.color}-100 dark:bg-${insight.color}-900/20 rounded-full">
                                    <i class="fas fa-${insight.icon} text-${insight.color}-600 text-sm"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-sm">${insight.title}</h4>
                                    <p class="text-xs text-muted-foreground mt-1">${insight.description}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function updateCategories() {
    const container = document.getElementById('categoriesContent');
    if (!container) return;
    
    const categories = ['productive', 'break', 'distracted'];
    const categoryApps = {};
    
    // Group apps by category
    Object.entries(state.settings.categories).forEach(([app, category]) => {
        if (!categoryApps[category]) categoryApps[category] = [];
        categoryApps[category].push(app);
    });
    
    const categoryColors = {
        'productive': { bg: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200', icon: 'text-green-600' },
        'break': { bg: 'bg-yellow-100 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-200', icon: 'text-yellow-600' },
        'distracted': { bg: 'bg-red-100 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200', icon: 'text-red-600' }
    };
    
    container.innerHTML = `
        <div class="space-y-6">
            ${categories.map(category => {
                const colors = categoryColors[category];
                return `
                    <div class="card bg-card border border-border rounded-lg p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold flex items-center">
                                <i class="fas fa-${getCategoryIcon(category)} ${colors.icon} mr-3"></i>
                                ${category.charAt(0).toUpperCase() + category.slice(1)}
                            </h3>
                            <button class="btn flex items-center space-x-2 px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors" 
                                    onclick="addAppToCategory('${category}')">
                                <i class="fas fa-plus text-sm"></i>
                                <span>Add App</span>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${(categoryApps[category] || []).map(app => `
                                <div class="inline-flex items-center px-3 py-1 ${colors.bg} ${colors.border} border rounded-full ${colors.text}">
                                    <span class="text-sm">${app}</span>
                                    <button class="ml-2 hover:bg-black/10 rounded p-0.5 transition-colors" 
                                            onclick="removeAppFromCategory('${app}')" 
                                            title="Remove ${app}">
                                        <i class="fas fa-times text-xs"></i>
                                    </button>
                                </div>
                            `).join('')}
                            ${(categoryApps[category] || []).length === 0 ? 
                                `<p class="text-muted-foreground text-sm italic">No apps categorized as ${category}</p>` : 
                                ''
                            }
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Categories Management Functions
function addAppToCategory(category) {
    const appName = prompt(`Enter the application name to categorize as "${category}":`);
    if (!appName || !appName.trim()) {
        showToast('Please enter a valid application name', 'warning');
        return;
    }
    
    const trimmedName = appName.trim();
    
    // Check if app already exists in any category
    const existingCategory = state.settings.categories[trimmedName];
    if (existingCategory) {
        if (existingCategory === category) {
            showToast(`${trimmedName} is already categorized as ${category}`, 'info');
            return;
        } else {
            const confirmChange = confirm(`${trimmedName} is currently categorized as "${existingCategory}". Change to "${category}"?`);
            if (!confirmChange) return;
        }
    }
    
    // Add/update the category
    state.settings.categories[trimmedName] = category;
    saveSettings();
    updateCategories();
    showToast(`${trimmedName} added to ${category} category`, 'success');
}

function removeAppFromCategory(appName) {
    const confirmRemove = confirm(`Remove "${appName}" from categories? It will be auto-categorized in the future.`);
    if (!confirmRemove) return;
    
    delete state.settings.categories[appName];
    saveSettings();
    updateCategories();
    showToast(`${appName} removed from categories`, 'success');
}

// Enhanced category management with bulk operations
function bulkCategorizeApps() {
    const modal = document.getElementById('bulkCategorizeModal');
    if (!modal) {
        // Create bulk categorize modal
        document.body.insertAdjacentHTML('beforeend', `
            <div id="bulkCategorizeModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
                <div class="bg-card p-6 rounded-lg shadow-lg max-w-md w-full m-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Bulk Categorize Apps</h3>
                        <button onclick="hideModal('bulkCategorizeModal')" class="text-muted-foreground hover:text-foreground text-xl">×</button>
                    </div>
                    <div class="space-y-4">
                        <textarea id="bulkAppsText" placeholder="Enter app names, one per line" class="w-full p-3 border border-border rounded-lg h-32 resize-none"></textarea>
                        <select id="bulkCategory" class="w-full p-3 border border-border rounded-lg">
                            <option value="productive">Productive</option>
                            <option value="break">Break</option>
                            <option value="distracted">Distracted</option>
                        </select>
                        <div class="flex justify-end space-x-2">
                            <button onclick="hideModal('bulkCategorizeModal')" class="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">Cancel</button>
                            <button onclick="processBulkCategorize()" class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">Categorize</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
    
    showModal('bulkCategorizeModal');
}

function processBulkCategorize() {
    const appsText = document.getElementById('bulkAppsText').value;
    const category = document.getElementById('bulkCategory').value;
    
    if (!appsText.trim()) {
        showToast('Please enter app names', 'warning');
        return;
    }
    
    const appNames = appsText.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    let addedCount = 0;
    appNames.forEach(appName => {
        state.settings.categories[appName] = category;
        addedCount++;
    });
    
    saveSettings();
    updateCategories();
    hideModal('bulkCategorizeModal');
    
    showToast(`${addedCount} apps categorized as ${category}`, 'success');
}

function importCategoriesFromCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const lines = text.split('\n').slice(1); // Skip header
            let importedCount = 0;
            
            lines.forEach(line => {
                const [appName, category] = line.split(',').map(s => s.trim().replace(/"/g, ''));
                if (appName && category && ['productive', 'break', 'distracted'].includes(category)) {
                    state.settings.categories[appName] = category;
                    importedCount++;
                }
            });
            
            saveSettings();
            updateCategories();
            showToast(`Imported ${importedCount} app categories`, 'success');
        } catch (error) {
            console.error('Error importing categories:', error);
            showToast('Error importing categories', 'error');
        }
    };
    
    input.click();
}

function exportCategoriesToCSV() {
    const csvContent = 'App Name,Category\n' + 
        Object.entries(state.settings.categories)
            .map(([app, category]) => `"${app}","${category}"`)
            .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticklo-categories.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Categories exported to CSV', 'success');
}

function updateSettings() {
    // Update settings form values
    document.getElementById('autoStart').checked = state.settings.autoStart;
    document.getElementById('minimizeToTray').checked = state.settings.minimizeToTray;
    document.getElementById('showNotifications').checked = state.settings.showNotifications;
    document.getElementById('autoCategory').checked = state.settings.autoCategory;
    document.getElementById('dailyGoal').value = state.settings.dailyGoal;
    document.getElementById('breakReminder').value = state.settings.breakReminder;
}

function updateTrackingStatus() {
    const toggle = document.getElementById('trackingToggle');
    if (toggle) toggle.checked = state.isTracking;
    
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    if (statusIndicator) {
        statusIndicator.classList.toggle('active', state.isTracking);
    }
    
    if (statusText) {
        statusText.textContent = state.isTracking ? 'Currently tracking' : 'Tracking paused';
    }
}

// Page Navigation
function switchPage(pageName) {
    // Update navigation state
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.page === pageName) {
            link.classList.remove('text-muted-foreground', 'hover:bg-secondary', 'hover:text-foreground');
            link.classList.add('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90');
        } else {
            link.classList.remove('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90');
            link.classList.add('text-muted-foreground', 'hover:bg-secondary', 'hover:text-foreground');
        }
    });
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('flex');
    });
    
    // Show target page
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('flex');
        state.currentPage = pageName;
        updateUI();
        debug.log(`Switched to ${pageName} page`);
    } else {
        debug.log(`Page ${pageName}Page not found`);
    }
}

// Manual Activity Entry
function showAddActivityModal() {
    showModal('addActivityModal');
    
    // Pre-fill current time
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    
    const startTimeInput = document.getElementById('activityStartTime');
    const durationInput = document.getElementById('activityDuration');
    
    if (startTimeInput) {
        startTimeInput.value = localDateTime;
    }
    if (durationInput) {
        durationInput.value = 30;
    }
}

async function handleAddActivity(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const startTime = new Date(formData.get('startTime'));
    const duration = parseInt(formData.get('duration')) * 60 * 1000;
    
    const activity = {
        id: generateId(),
        app: formData.get('app'),
        title: formData.get('title'),
        category: formData.get('category'),
        startTime: startTime.toISOString(),
        endTime: new Date(startTime.getTime() + duration).toISOString(),
        duration: duration,
        manual: true
    };
    
    state.activities.push(activity);
    await saveActivities();
    updateUI();
    
    // Close modal
    hideModal('addActivityModal');
    
    showToast('Activity added successfully', 'success');
    debug.log('Manual activity added', activity);
}

// Analytics Calculations
function calculateAnalytics() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const weekActivities = state.activities.filter(a => new Date(a.startTime) >= weekStart);
    
    let weekTotal = 0;
    let productiveTime = 0;
    let breakTime = 0;
    let distractedTime = 0;
    const dailyTotals = {};
    const hourlyTotals = {};
    
    weekActivities.forEach(activity => {
        const duration = activity.duration || 0;
        weekTotal += duration;
        
        const day = new Date(activity.startTime).toLocaleDateString();
        dailyTotals[day] = (dailyTotals[day] || 0) + duration;
        
        const hour = new Date(activity.startTime).getHours();
        hourlyTotals[hour] = (hourlyTotals[hour] || 0) + duration;
        
        switch (activity.category) {
            case 'productive':
                productiveTime += duration;
                break;
            case 'break':
                breakTime += duration;
                break;
            case 'distracted':
                distractedTime += duration;
                break;
        }
    });
    
    const mostProductiveDay = Object.entries(dailyTotals)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    
    const bestHour = Object.entries(hourlyTotals)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    
    return {
        weekTotal,
        dailyAverage: weekTotal / 7,
        productivePercent: weekTotal > 0 ? Math.round((productiveTime / weekTotal) * 100) : 0,
        breakPercent: weekTotal > 0 ? Math.round((breakTime / weekTotal) * 100) : 0,
        distractedPercent: weekTotal > 0 ? Math.round((distractedTime / weekTotal) * 100) : 0,
        mostProductiveDay,
        bestHour: `${bestHour}:00`,
        avgSessionLength: weekActivities.length > 0 ? weekTotal / weekActivities.length : 0,
        weekTrend: 0 // Would calculate vs previous week
    };
}

// Enhanced Analytics Calculation
function calculateEnhancedAnalytics() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get activities for different periods
    const todayActivities = state.activities.filter(a => new Date(a.startTime) >= today);
    const weekActivities = state.activities.filter(a => new Date(a.startTime) >= weekStart);
    const monthActivities = state.activities.filter(a => new Date(a.startTime) >= monthStart);
    
    // Calculate totals
    const todayTotal = todayActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const weekTotal = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    
    // Category calculations
    let productiveTime = 0, breakTime = 0, distractedTime = 0;
    weekActivities.forEach(activity => {
        const duration = activity.duration || 0;
        switch (activity.category) {
            case 'productive': productiveTime += duration; break;
            case 'break': breakTime += duration; break;
            case 'distracted': distractedTime += duration; break;
        }
    });
    
    // Productivity score (0-100)
    const productivityScore = weekTotal > 0 ? 
        Math.round((productiveTime / weekTotal) * 100) : 0;
    
    // Focus sessions (productive activities > 15 min)
    const focusSessions = todayActivities.filter(a => 
        a.category === 'productive' && (a.duration || 0) >= 900000
    ).length;
    
    // Streak calculation (simplified - days with productive activities)
    const streakDays = calculateProductiveStreak();
    
    // Peak hours analysis
    const hourlyData = {};
    weekActivities.forEach(activity => {
        if (activity.category === 'productive') {
            const hour = new Date(activity.startTime).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + (activity.duration || 0);
        }
    });
    
    const peakHours = Object.entries(hourlyData)
        .map(([hour, duration]) => ({
            time: `${hour.padStart(2, '0')}:00`,
            duration: duration,
            percentage: Math.round((duration / Math.max(...Object.values(hourlyData))) * 100)
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
    
    // Top applications
    const appData = {};
    weekActivities.forEach(activity => {
        if (!appData[activity.app]) {
            appData[activity.app] = {
                name: activity.app,
                duration: 0,
                icon: getAppIcon(activity.app)
            };
        }
        appData[activity.app].duration += activity.duration || 0;
    });
    
    const topApps = Object.values(appData)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    
    // Generate insights
    const insights = generateInsights({
        todayTotal,
        weekTotal,
        productiveTime,
        distractedTime,
        focusSessions,
        peakHours,
        topApps
    });
    
    // Daily totals for trends
    const dailyTotals = {};
    weekActivities.forEach(activity => {
        const day = new Date(activity.startTime).toLocaleDateString();
        dailyTotals[day] = (dailyTotals[day] || 0) + (activity.duration || 0);
    });
    
    const mostProductiveDay = Object.entries(dailyTotals)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    
    return {
        todayTotal,
        weekTotal,
        dailyAverage: weekTotal / 7,
        productivePercent: weekTotal > 0 ? Math.round((productiveTime / weekTotal) * 100) : 0,
        breakPercent: weekTotal > 0 ? Math.round((breakTime / weekTotal) * 100) : 0,
        distractedPercent: weekTotal > 0 ? Math.round((distractedTime / weekTotal) * 100) : 0,
        productivityScore,
        focusSessions,
        streakDays,
        peakHours,
        topApps,
        insights,
        mostProductiveDay,
        weekTrend: 0
    };
}

function calculateProductiveStreak() {
    const now = new Date();
    let currentDate = new Date(now);
    let streak = 0;
    
    // Check last 30 days for streak
    for (let i = 0; i < 30; i++) {
        const dayActivities = state.activities.filter(activity => {
            const activityDate = new Date(activity.startTime);
            return activityDate.toDateString() === currentDate.toDateString() &&
                   activity.category === 'productive' &&
                   (activity.duration || 0) >= 1800000; // At least 30 min productive
        });
        
        if (dayActivities.length > 0) {
            streak++;
        } else if (streak > 0) {
            break; // Streak broken
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
}

function generateInsights(data) {
    const insights = [];
    
    // Productivity insights
    if (data.productiveTime > 0) {
        const productivePercent = (data.productiveTime / data.weekTotal) * 100;
        if (productivePercent > 70) {
            insights.push({
                title: 'Great Productivity!',
                description: 'You\'re maintaining excellent focus with high productive time.',
                icon: 'trophy',
                color: 'green'
            });
        } else if (productivePercent < 30) {
            insights.push({
                title: 'Focus Opportunity',
                description: 'Consider reducing distractions to boost productivity.',
                icon: 'target',
                color: 'orange'
            });
        }
    }
    
    // Peak hours insight
    if (data.peakHours.length > 0) {
        const peakHour = data.peakHours[0].time;
        insights.push({
            title: 'Peak Performance',
            description: `You're most productive around ${peakHour}. Schedule important tasks then.`,
            icon: 'clock',
            color: 'blue'
        });
    }
    
    // Focus sessions insight
    if (data.focusSessions === 0) {
        insights.push({
            title: 'Build Focus Habits',
            description: 'Try to maintain 15+ minute focused work sessions for better productivity.',
            icon: 'bullseye',
            color: 'purple'
        });
    } else if (data.focusSessions > 5) {
        insights.push({
            title: 'Excellent Focus',
            description: `${data.focusSessions} deep work sessions today. Keep it up!`,
            icon: 'fire',
            color: 'orange'
        });
    }
    
    // Break recommendations
    const breakPercent = (data.weekTotal - data.productiveTime - data.distractedTime) / data.weekTotal * 100;
    if (breakPercent < 10) {
        insights.push({
            title: 'Take More Breaks',
            description: 'Regular breaks improve focus and prevent burnout.',
            icon: 'coffee',
            color: 'yellow'
        });
    }
    
    // App usage insight
    if (data.topApps.length > 0) {
        const topApp = data.topApps[0];
        insights.push({
            title: 'Top Application',
            description: `${topApp.name} is your most used app this week.`,
            icon: 'desktop',
            color: 'indigo'
        });
    }
    
    return insights;
}

// Activity Management Functions
function deleteActivity(activityId) {
    const confirmDelete = confirm('Are you sure you want to delete this activity? This action cannot be undone.');
    if (!confirmDelete) return;
    
    const index = state.activities.findIndex(a => a.id === activityId);
    if (index === -1) {
        showToast('Activity not found', 'error');
        return;
    }
    
    const activity = state.activities[index];
    state.activities.splice(index, 1);
    
    saveActivities();
    updateActivitiesTable();
    updateUI();
    
    showToast(`Deleted activity: ${activity.app}`, 'success');
}

// Data Management
async function saveSettings() {
    try {
        // Include auto categorizer patterns and UI preferences in settings
        const settingsToSave = {
            ...state.settings,
            uiScale: state.uiScale,
            autoCategorizerData: state.autoCategorizer ? state.autoCategorizer.exportUserPatterns() : null
        };
        
        fs.writeFileSync(settingsFilePath, JSON.stringify(settingsToSave, null, 2));
        debug.log('Settings saved');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    }
}

async function loadSettings() {
    try {
        if (fs.existsSync(settingsFilePath)) {
            const data = fs.readFileSync(settingsFilePath, 'utf8');
            const loadedData = JSON.parse(data);
            
            // Load settings
            state.settings = { ...state.settings, ...loadedData };
            
            // Load UI preferences
            if (loadedData.uiScale) {
                state.uiScale = loadedData.uiScale;
            }
            
            // Load auto categorizer patterns
            if (loadedData.autoCategorizerData && state.autoCategorizer) {
                state.autoCategorizer.importUserPatterns(loadedData.autoCategorizerData);
                debug.log('Auto categorizer patterns loaded');
            }
            
            debug.log('Settings loaded', state.settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveActivities() {
    try {
        const dataToSave = {
            activities: state.activities,
            lastSaved: new Date().toISOString()
        };
        fs.writeFileSync(activitiesFilePath, JSON.stringify(dataToSave, null, 2));
        debug.log('Activities saved', { count: state.activities.length });
    } catch (error) {
        console.error('Error saving activities:', error);
        showToast('Error saving activities', 'error');
    }
}

async function loadActivities() {
    try {
        // Load saved activities from file
        let savedActivities = [];
        if (fs.existsSync(activitiesFilePath)) {
            const data = fs.readFileSync(activitiesFilePath, 'utf8');
            const parsed = JSON.parse(data);
            savedActivities = parsed.activities || [];
        }

        // Get real-time activities from main process
        let liveActivities = [];
        try {
            liveActivities = await ipcRenderer.invoke('get-activity-data') || [];
        } catch (error) {
            console.warn('Could not fetch live activities from main process:', error);
        }

        // Merge activities, avoiding duplicates
        const allActivities = [...savedActivities];
        const savedTimestamps = new Set(savedActivities.map(a => a.timestamp || a.startTime));
        
        // Add live activities that aren't already saved
        liveActivities.forEach(liveActivity => {
            if (!savedTimestamps.has(liveActivity.timestamp)) {
                // Convert main process format to renderer format
                const rendererActivity = {
                    id: liveActivity.timestamp + '_live',
                    app: liveActivity.app,
                    title: liveActivity.title,
                    appIcon: liveActivity.appIcon,
                    appPath: liveActivity.appPath,
                    category: getCategoryForApp(liveActivity.app, liveActivity.title),
                    startTime: liveActivity.timestamp,
                    endTime: null, // Will be calculated based on duration
                    duration: liveActivity.duration,
                    timestamp: liveActivity.timestamp,
                    url: liveActivity.url
                };
                
                // Calculate endTime if we have duration
                if (liveActivity.duration) {
                    rendererActivity.endTime = new Date(
                        new Date(liveActivity.timestamp).getTime() + liveActivity.duration
                    ).toISOString();
                }
                
                allActivities.push(rendererActivity);
            }
        });

        // Sort activities by start time
        state.activities = allActivities.sort((a, b) => 
            new Date(a.startTime || a.timestamp) - new Date(b.startTime || b.timestamp)
        );
        
        debug.log('Activities loaded and merged', { 
            saved: savedActivities.length,
            live: liveActivities.length,
            total: state.activities.length 
        });
        
        // Save the merged activities back to file
        await saveActivities();
        
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

async function saveAllData() {
    await saveSettings();
    await saveActivities();
}

// Export/Import Functions
function exportData() {
    const data = {
        settings: state.settings,
        activities: state.activities,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticklo-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully', 'success');
}

function exportSettings() {
    const blob = new Blob([JSON.stringify(state.settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticklo-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Settings exported successfully', 'success');
}

function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const settings = JSON.parse(text);
            state.settings = { ...state.settings, ...settings };
            await saveSettings();
            updateUI();
            showToast('Settings imported successfully', 'success');
        } catch (error) {
            console.error('Error importing settings:', error);
            showToast('Error importing settings', 'error');
        }
    };
    
    input.click();
}

async function clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        return;
    }
    
    state.activities = [];
    state.currentActivity = null;
    
    await saveActivities();
    updateUI();
    
    showToast('All data cleared', 'success');
    debug.log('All data cleared');
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '0m';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function getTodayActivities() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activities = state.activities.filter(activity => {
        return new Date(activity.startTime) >= today;
    });
    
    // Include current activity
    if (state.currentActivity && new Date(state.currentActivity.startTime) >= today) {
        activities.push(state.currentActivity);
    }
    
    return activities;
}

function groupActivitiesForTimeline(activities) {
    if (!activities || activities.length === 0) {
        return [];
    }

    // Sort activities by start time
    const sortedActivities = activities.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const tracks = [];

    sortedActivities.forEach(activity => {
        let placed = false;
        // Try to place the activity in an existing track
        for (const track of tracks) {
            const lastActivityInTrack = track[track.length - 1];
            const lastEndTime = lastActivityInTrack.endTime ? new Date(lastActivityInTrack.endTime) : new Date(new Date(lastActivityInTrack.startTime).getTime() + (lastActivityInTrack.duration || 0));
            
            if (new Date(activity.startTime) >= lastEndTime) {
                track.push(activity);
                placed = true;
                break;
            }
        }

        // If it couldn't be placed, create a new track
        if (!placed) {
            tracks.push([activity]);
        }
    });

    return tracks;
}

function getCategoryIcon(category) {
    switch (category) {
        case 'productive': return 'code';
        case 'break': return 'coffee';
        case 'distracted': return 'mobile-alt';
        default: return 'desktop';
    }
}

function getCategoryColor(category) {
    switch (category) {
        case 'productive': return 'success';
        case 'break': return 'warning';
        case 'distracted': return 'danger';
        default: return 'secondary';
    }
}

function applyTheme() {
    let isDark = false;
    
    switch (state.settings.theme) {
        case 'dark':
            isDark = true;
            break;
        case 'light':
            isDark = false;
            break;
        case 'system':
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            break;
    }
    
    document.documentElement.classList.toggle('dark', isDark);
    
    // Update theme button states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === state.settings.theme) {
            btn.classList.remove('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
            btn.classList.add('bg-primary', 'text-primary-foreground');
        } else {
            btn.classList.remove('bg-primary', 'text-primary-foreground');
            btn.classList.add('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
        }
    });
    
    // Update scale button states
    document.querySelectorAll('.scale-btn').forEach(btn => {
        if (btn.dataset.scale === state.uiScale) {
            btn.classList.remove('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
            btn.classList.add('bg-primary', 'text-primary-foreground');
        } else {
            btn.classList.remove('bg-primary', 'text-primary-foreground');
            btn.classList.add('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
        }
    });
    
    debug.log('Theme applied:', state.settings.theme);
}

// Date Navigation
function navigateDate(direction) {
    const currentDate = new Date(state.currentDate);
    currentDate.setDate(currentDate.getDate() + direction);
    state.currentDate = currentDate;
    
    updateDateDisplays();
    updateUI();
}

function updateDateDisplays() {
    const today = new Date();
    const isToday = state.currentDate.toDateString() === today.toDateString();
    const isYesterday = state.currentDate.toDateString() === new Date(today.getTime() - 86400000).toDateString();
    const isTomorrow = state.currentDate.toDateString() === new Date(today.getTime() + 86400000).toDateString();
    
    let dateText;
    if (isToday) {
        dateText = 'Today';
    } else if (isYesterday) {
        dateText = 'Yesterday';
    } else if (isTomorrow) {
        dateText = 'Tomorrow';
    } else {
        dateText = state.currentDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
    
    document.getElementById('currentDate').textContent = dateText;
    document.getElementById('timelineCurrentDate').textContent = dateText;
}

// Get app icon from cache
function getAppIcon(appName) {
    return state.appIconCache.get(appName) || null;
}

// Enhanced CSV export
function exportActivitiesToCSV() {
    const activities = state.activities.filter(activity => {
        // Filter based on current filter settings
        if (state.activitiesFilter.category && activity.category !== state.activitiesFilter.category) {
            return false;
        }
        
        if (state.activitiesFilter.search) {
            const search = state.activitiesFilter.search.toLowerCase();
            return activity.app.toLowerCase().includes(search) || 
                   activity.title.toLowerCase().includes(search);
        }
        
        return true;
    });
    
    const headers = ['Date', 'Time', 'Application', 'Title', 'Category', 'Duration (minutes)'];
    const rows = activities.map(activity => [
        new Date(activity.startTime).toLocaleDateString(),
        new Date(activity.startTime).toLocaleTimeString(),
        activity.app,
        activity.title,
        activity.category,
        Math.round((activity.duration || 0) / (1000 * 60))
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticklo-activities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Activities exported to CSV', 'success');
}

function checkBreakReminder() {
    if (!state.settings.showNotifications || !state.settings.breakReminder) return;
    
    const activities = getTodayActivities();
    let productiveTime = 0;
    let lastBreak = null;
    
    activities.forEach(activity => {
        if (activity.category === 'productive') {
            productiveTime += activity.duration || 0;
        } else if (activity.category === 'break' && activity.endTime) {
            lastBreak = new Date(activity.endTime);
        }
    });
    
    const timeSinceBreak = lastBreak ? new Date() - lastBreak : productiveTime;
    const breakInterval = state.settings.breakReminder * 60 * 1000;
    
    if (timeSinceBreak >= breakInterval) {
        showToast('Time for a break! You\'ve been working for a while.', 'info');
        
        // Show system notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Time for a break!', {
                body: 'You\'ve been working for a while. Take a short break.',
                icon: '/assets/icon.png'
            });
        }
    }
}

// Window event handlers
window.addEventListener('beforeunload', () => {
    if (state.currentActivity) {
        endCurrentActivity();
    }
    saveAllData();
});

// Export functions for global access
window.deleteActivity = function (activityId) {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    
    state.activities = state.activities.filter(a => a.id !== activityId);
    saveActivities();
    updateUI();
    showToast('Activity deleted', 'success');
};

window.addAppToCategory = function(category) {
    const app = prompt('Enter application name:');
    if (!app) return;
    
    state.settings.categories[app] = category;
    saveSettings();
    updateCategories();
    showToast(`${app} added to ${category}`, 'success');
};

window.removeAppFromCategory = function(app) {
    if (!confirm(`Remove ${app} from categories?`)) return;
    
    delete state.settings.categories[app];
    saveSettings();
    updateCategories();
    showToast(`${app} removed`, 'success');
};

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.settings.theme === 'system') {
        applyTheme();
    }
});

// Global functions for modular system compatibility
window.initializeApp = async function() {
    debug.log('Initializing Ticklo via modular system...');
    
    await loadSettings();
    await loadActivities();
    
    setupEventListeners();
    setupIPCListeners();
    
    applyTheme();
    updateUI();
    
    // Start tracking if enabled
    if (state.settings.autoStart && state.isTracking) {
        startTracking();
    }
    
    // Update UI every second for real-time display
    setInterval(updateRealTimeElements, 1000);
    
    // Auto-save every 30 seconds
    setInterval(saveAllData, 30000);
    
    // Check break reminders
    setInterval(checkBreakReminder, 60000);
    
    debug.log('Modular initialization complete', { settings: state.settings });
};

window.updateCurrentPage = function(pageName) {
    state.currentPage = pageName;
    updateUI();
    debug.log('Current page updated:', pageName);
};

window.reinitializeEventListeners = function() {
    setupEventListeners();
    debug.log('Event listeners reinitialized for new components');
};

// Debug helper for modular system
window.getComponentLoaderStatus = function() {
    return window.ComponentLoader ? window.ComponentLoader.getComponentInfo() : null;
}; 

// UI Scale Management
function applyUIScale() {
    const body = document.getElementById('appBody');
    if (!body) return;
    
    // Remove existing scale classes
    body.classList.remove('scale-sm', 'scale-md', 'scale-lg');
    
    // Apply new scale class
    body.classList.add(`scale-${state.uiScale}`);
    
    debug.log(`UI scale changed to: ${state.uiScale}`);
}

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        // Focus trap for accessibility
        const firstInput = modal.querySelector('input, select, textarea, button');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Updated toast function for Basecoat UI
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = generateId();
    const iconClass = type === 'success' ? 'fa-check-circle text-green-500' : 
                      type === 'error' ? 'fa-exclamation-triangle text-red-500' : 
                      type === 'warning' ? 'fa-exclamation-triangle text-yellow-500' :
                      'fa-info-circle text-blue-500';
    
    const toastHtml = `
        <div class="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right-5 fade-in-0 duration-300" id="toast-${toastId}">
            <div class="flex items-center space-x-3">
                <i class="fas ${iconClass}"></i>
                <div class="flex-1">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button class="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary transition-colors" onclick="document.getElementById('toast-${toastId}').remove()">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    
    // Auto-remove after specified duration
    setTimeout(() => {
        const toast = document.getElementById(`toast-${toastId}`);
        if (toast) {
            toast.classList.add('animate-out', 'slide-out-to-right-5', 'fade-out-0');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
} 

// Add manual refresh function after loadActivities
async function refreshActivities() {
    debug.log('Manually refreshing activities...');
    await loadActivities();
    updateUI();
    showToast('Activities refreshed successfully', 'success');
}

// Export for global access
window.refreshActivities = refreshActivities;

// Function to open the data directory in file explorer
async function openDataDirectory() {
  try {
    const dirPath = await ipcRenderer.invoke('open-data-directory');
    showToast(`Opening data folder: ${dirPath}`, 'info');
  } catch (error) {
    console.error('Failed to open data directory:', error);
    showToast('Failed to open data directory', 'error');
  }
}

// Export for global access
window.openDataDirectory = openDataDirectory;

function getActivitiesForDate(targetDate) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return state.activities.filter(activity => {
        const activityStart = new Date(activity.startTime);
        return activityStart >= startOfDay && activityStart <= endOfDay;
    });
}

// Function to get activities for different periods (week, month)
function getActivitiesForPeriod(period, date = state.currentDate) {
    const targetDate = new Date(date);
    
    return state.activities.filter(activity => {
        const activityDate = new Date(activity.startTime);
        
        switch (period) {
            case 'week': {
                const startOfWeek = new Date(targetDate);
                startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                
                return activityDate >= startOfWeek && activityDate <= endOfWeek;
            }
            case 'month': {
                return activityDate.getMonth() === targetDate.getMonth() && 
                       activityDate.getFullYear() === targetDate.getFullYear();
            }
            default:
                return true;
        }
    });
}