const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const AutoCategorizer = require('./auto-categorizer');

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
    debugMode: false,
    sessionStartTime: new Date(),
    autoCategorizer: new AutoCategorizer(),
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
    uiScale: 'md' // 'sm', 'md', 'lg'
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
});

// Setup Event Listeners
function setupEventListeners() {
    // Enhanced theme switching
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            state.settings.theme = theme;
            
            // Update active state
            document.querySelectorAll('.theme-btn').forEach(b => {
                b.classList.remove('bg-primary', 'text-primary-foreground');
                b.classList.add('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
            });
            btn.classList.remove('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
            btn.classList.add('bg-primary', 'text-primary-foreground');
            
            applyTheme();
            saveSettings();
        });
    });

    // UI Scale switching
    document.querySelectorAll('.scale-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scale = btn.dataset.scale;
            state.uiScale = scale;
            
            // Update active state
            document.querySelectorAll('.scale-btn').forEach(b => {
                b.classList.remove('bg-primary', 'text-primary-foreground');
                b.classList.add('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
            });
            btn.classList.remove('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80');
            btn.classList.add('bg-primary', 'text-primary-foreground');
            
            applyUIScale();
            saveSettings();
        });
    });

    // Modal handling
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => {
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
    
    // Tracking Toggle
    document.getElementById('trackingToggle')?.addEventListener('change', (e) => {
        state.isTracking = e.target.checked;
        if (state.isTracking) {
            startTracking();
        } else {
            stopTracking();
        }
        updateTrackingStatus();
        debug.log('Tracking toggled', { isTracking: state.isTracking });
    });
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) {
                switchPage(page);
            }
        });
    });
    
    // Quick Actions
    document.getElementById('addActivityBtn')?.addEventListener('click', () => {
        showAddActivityModal();
    });
    
    // Add Activity button in activities page
    document.getElementById('addManualActivity')?.addEventListener('click', () => {
        showAddActivityModal();
    });
    
    document.getElementById('exportDataBtn')?.addEventListener('click', () => {
        exportData();
    });
    
    // Activities table controls
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

    document.getElementById('exportActivitiesBtn')?.addEventListener('click', () => {
        exportActivitiesToCSV();
    });
    
    // Debug Console Toggle
    document.getElementById('consoleToggle')?.addEventListener('click', () => {
        const console = document.getElementById('debugConsole');
        console.classList.toggle('hidden');
        state.debugMode = !console.classList.contains('hidden');
        debug.log(`Debug console ${state.debugMode ? 'opened' : 'closed'}`);
    });
    
    // Add Activity Form
    document.getElementById('addActivityForm')?.addEventListener('submit', handleAddActivity);
    
    // Settings
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
        debug.log('Auto categorization setting changed:', e.target.checked);
        
        if (e.target.checked) {
            showToast('Auto categorization enabled - apps will be categorized automatically', 'success');
        } else {
            showToast('Auto categorization disabled - manual categories only', 'info');
        }
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
    
    // Refresh Button
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        updateUI();
        showToast('Data refreshed', 'success');
    });
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
    if (state.settings.autoCategory && state.autoCategorizer) {
        const autoCategory = state.autoCategorizer.categorizeApp(appName, windowTitle, url);
        
        // Show confidence level in debug
        const confidence = state.autoCategorizer.getCategoryConfidence(appName, windowTitle, url);
        debug.log(`Auto categorized "${appName}" as "${autoCategory}" with ${(confidence * 100).toFixed(1)}% confidence`);
        
        // If confidence is high, auto-add to manual categories for future use
        if (confidence > 0.8) {
            state.settings.categories[appName] = autoCategory;
            saveSettings();
            debug.log(`High confidence: Auto-added "${appName}" to manual categories as "${autoCategory}"`);
        }
        
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
    
    const selectedActivities = getActivitiesForPeriod('today', state.currentDate);
    
    // Get yesterday's activities for comparison
    const yesterday = new Date(state.currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayActivities = getActivitiesForPeriod('today', yesterday);
    
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
    
    const activities = getActivitiesForPeriod('today', state.currentDate).slice(-5).reverse();
    
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
    const activities = getActivitiesForPeriod(state.selectedPeriod, state.currentDate);
    
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
    const hoursContainer = document.getElementById('timelineHours');
    const activitiesContainer = document.getElementById('timelineActivities');
    
    if (!hoursContainer || !activitiesContainer) return;
    
    let activities = [];
    
    switch (state.currentTimelineView) {
        case 'day':
            activities = getActivitiesForPeriod('today', state.currentDate);
            break;
        case 'week':
            activities = getActivitiesForPeriod('week', state.currentDate);
            break;
        case 'month':
            activities = getActivitiesForPeriod('month', state.currentDate);
            break;
    }
    
    // Generate hour labels (24 hours)
    const hours = Array.from({length: 24}, (_, i) => {
        return `
            <div class="h-16 px-3 py-2 text-xs text-muted-foreground border-b border-border flex items-center justify-center">
                ${i.toString().padStart(2, '0')}:00
            </div>
        `;
    }).join('');
    
    hoursContainer.innerHTML = hours;
    
    if (activities.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <div class="text-center">
                    <i class="fas fa-calendar-times text-muted-foreground text-3xl mb-3"></i>
                    <p class="text-muted-foreground">No activities in this time period</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Generate 24 hour segments
    const segments = Array.from({length: 24}, (_, hour) => {
        // Find activities that occur in this hour
        const hourActivities = activities.filter(activity => {
            const activityStart = new Date(activity.startTime);
            const activityEnd = activity.endTime ? new Date(activity.endTime) : new Date();
            const activityHour = activityStart.getHours();
            
            // Check if activity spans into this hour
            return activityHour === hour || 
                   (activityStart.getHours() < hour && activityEnd.getHours() >= hour);
        });
        
        // Create activity blocks for this hour
        const blocks = hourActivities.map((activity, index) => {
            const activityStart = new Date(activity.startTime);
            const activityEnd = activity.endTime ? new Date(activity.endTime) : new Date();
            
            // Calculate position within the hour
            const startMinutes = activityStart.getHours() === hour ? activityStart.getMinutes() : 0;
            const endMinutes = activityEnd.getHours() === hour ? activityEnd.getMinutes() : 60;
            
            const left = (startMinutes / 60) * 100;
            const width = ((endMinutes - startMinutes) / 60) * 100;
            const top = index * 28; // Stack overlapping activities
            
            const duration = activityEnd - activityStart;
            const appIcon = getAppIcon(activity.app);
            const iconHtml = appIcon ? 
                `<img src="${appIcon}" alt="${activity.app}" class="w-4 h-4 rounded mr-2" />` : 
                `<i class="fas fa-${getCategoryIcon(activity.category)} text-sm mr-2"></i>`;
            
            const categoryColors = {
                'productive': 'bg-green-500 border-green-600 text-white',
                'break': 'bg-yellow-500 border-yellow-600 text-white',
                'distracted': 'bg-red-500 border-red-600 text-white'
            };
            
            return `
                <div class="absolute px-2 py-1 text-xs rounded border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${categoryColors[activity.category] || 'bg-gray-500 border-gray-600 text-white'}" 
                     style="left: ${left}%; width: ${width}%; top: ${top}px; min-height: 24px;"
                     title="${activity.app} - ${activity.title || 'No title'} (${formatDuration(duration)})">
                    <div class="flex items-center">
                        ${iconHtml}
                        <span class="truncate">${activity.app}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="relative h-16 border-b border-border bg-background hover:bg-muted/20 transition-colors">
                ${blocks}
            </div>
        `;
    }).join('');
    
    activitiesContainer.innerHTML = segments;
    updateCurrentTimeIndicator();
}

function updateCurrentTimeIndicator() {
    const indicator = document.getElementById('currentTimeLine');
    if (!indicator) return;
    
    const now = new Date();
    const isToday = state.currentDate.toDateString() === now.toDateString();
    
    if (!isToday || state.currentPage !== 'timeline') {
        indicator.classList.add('hidden');
        return;
    }
    
    indicator.classList.remove('hidden');
    
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Calculate vertical position based on hour and minute (64px per hour segment)
    const segmentHeight = 64; // Height of each hour segment (h-16 = 64px)
    const headerHeight = 56; // Height of the header
    const topPosition = headerHeight + hours * segmentHeight + (minutes / 60) * segmentHeight;
    
    indicator.style.top = `${topPosition}px`;
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

// Global function for pagination
window.goToPage = function(page) {
    if (page >= 1 && page <= Math.ceil(state.pagination.totalEntries / state.pagination.entriesPerPage)) {
        state.pagination.currentPage = page;
        updateActivitiesTable();
    }
};

function updateAnalytics() {
    const container = document.getElementById('analyticsContent');
    if (!container) return;
    
    const stats = calculateAnalytics();
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="card bg-card border border-border rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 flex items-center">
                    <i class="fas fa-chart-line text-blue-600 mr-2"></i>
                    Weekly Overview
                </h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-muted-foreground">Total Time:</span>
                        <span class="font-semibold">${formatDuration(stats.weekTotal)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-foreground">Daily Average:</span>
                        <span class="font-semibold">${formatDuration(stats.dailyAverage)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-foreground">Most Productive Day:</span>
                        <span class="font-semibold">${stats.mostProductiveDay}</span>
                    </div>
                </div>
            </div>
            
            <div class="card bg-card border border-border rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 flex items-center">
                    <i class="fas fa-chart-pie text-green-600 mr-2"></i>
                    Category Distribution
                </h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <span class="text-muted-foreground">Productive</span>
                        </div>
                        <span class="font-semibold text-green-600">${stats.productivePercent}%</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                            <span class="text-muted-foreground">Break</span>
                        </div>
                        <span class="font-semibold text-yellow-600">${stats.breakPercent}%</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                            <span class="text-muted-foreground">Distracted</span>
                        </div>
                        <span class="font-semibold text-red-600">${stats.distractedPercent}%</span>
                    </div>
                </div>
            </div>
            
            <div class="card bg-card border border-border rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 flex items-center">
                    <i class="fas fa-trending-up text-purple-600 mr-2"></i>
                    Productivity Trends
                </h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-muted-foreground">Week vs Last Week:</span>
                        <span class="font-semibold ${stats.weekTrend >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${stats.weekTrend > 0 ? '+' : ''}${stats.weekTrend}%
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-foreground">Best Time:</span>
                        <span class="font-semibold">${stats.bestHour}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-foreground">Avg Session:</span>
                        <span class="font-semibold">${formatDuration(stats.avgSessionLength)}</span>
                    </div>
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
        if (fs.existsSync(activitiesFilePath)) {
            const data = fs.readFileSync(activitiesFilePath, 'utf8');
            const parsed = JSON.parse(data);
            state.activities = parsed.activities || [];
            debug.log('Activities loaded', { count: state.activities.length });
        }
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

function groupActivitiesByHour(activities) {
    // Group activities into tracks to avoid overlaps
    const tracks = [];
    
    activities.forEach(activity => {
        let placed = false;
        
        for (const track of tracks) {
            const lastActivity = track.activities[track.activities.length - 1];
            const lastEnd = lastActivity.endTime ? 
                new Date(lastActivity.endTime) : new Date();
            
            if (new Date(activity.startTime) >= lastEnd) {
                track.activities.push(activity);
                placed = true;
                break;
            }
        }
        
        if (!placed) {
            tracks.push({ activities: [activity] });
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

// Enhanced activity filtering
function getActivitiesForPeriod(period, date = state.currentDate) {
    const targetDate = new Date(date);
    
    return state.activities.filter(activity => {
        const activityDate = new Date(activity.startTime);
        
        switch (period) {
            case 'today':
                return activityDate.toDateString() === targetDate.toDateString();
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
function showToast(message, type = 'info') {
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
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const toast = document.getElementById(`toast-${toastId}`);
        if (toast) {
            toast.classList.add('animate-out', 'slide-out-to-right-5', 'fade-out-0');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
} 