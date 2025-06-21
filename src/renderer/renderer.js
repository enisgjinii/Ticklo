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
    autoCategorizer: new AutoCategorizer()
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
    
    debug.log('Initialization complete', { settings: state.settings });
});

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar Toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
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
    
    // Theme Toggle
    document.getElementById('darkModeToggle')?.addEventListener('click', () => {
        const themes = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(state.settings.theme);
        state.settings.theme = themes[(currentIndex + 1) % themes.length];
        applyTheme();
        saveSettings();
    });
    
    // Debug Console Toggle
    document.getElementById('consoleToggle')?.addEventListener('click', () => {
        const console = document.getElementById('debugConsole');
        console.classList.toggle('open');
        state.debugMode = console.classList.contains('open');
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
            document.querySelectorAll('.toggle-btn[data-view]').forEach(b => {
                b.classList.toggle('active', b === btn);
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
    const { app, title } = windowData;
    
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
        category: getCategoryForApp(app, title),
        startTime: new Date().toISOString(),
        endTime: null,
        duration: 0
    };
    
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
    
    // Update current date
    const currentDate = document.getElementById('currentDate');
    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Update timeline current time indicator
    updateCurrentTimeIndicator();
}

function updateDashboard() {
    updateStats();
    updateTodayActivities();
    updateTopApplications();
    updateGoalProgress();
}

function updateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayActivities = getTodayActivities();
    
    let totalTime = 0;
    let productiveTime = 0;
    let breakTime = 0;
    let distractedTime = 0;
    
    todayActivities.forEach(activity => {
        const duration = activity.duration || 
            (activity === state.currentActivity ? 
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
    
    // Update displays
    document.getElementById('totalTime').textContent = formatDuration(totalTime);
    document.getElementById('productiveTime').textContent = formatDuration(productiveTime);
    document.getElementById('breakTime').textContent = formatDuration(breakTime);
    document.getElementById('distractedTime').textContent = formatDuration(distractedTime);
    
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
    
    const activities = getTodayActivities().slice(-5).reverse();
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <p class="text-muted">No activities tracked today</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getCategoryIcon(activity.category)}"></i>
            </div>
            <div class="activity-info">
                <div class="activity-app">${activity.app}</div>
                <div class="activity-title">${activity.title || 'No title'}</div>
            </div>
            <div class="activity-time">${formatDuration(activity.duration || 0)}</div>
        </div>
    `).join('');
}

function updateTopApplications() {
    const container = document.getElementById('topApplications');
    if (!container) return;
    
    const appUsage = {};
    const activities = getTodayActivities();
    
    activities.forEach(activity => {
        const duration = activity.duration || 
            (activity === state.currentActivity ? 
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
    
    const totalTime = sortedApps.reduce((sum, [, data]) => sum + data.time, 0);
    
    container.innerHTML = sortedApps.map(([app, data]) => {
        const percentage = totalTime > 0 ? (data.time / totalTime * 100).toFixed(1) : 0;
        
        return `
            <div class="app-item">
                <div class="app-icon">
                    <i class="fas fa-${getCategoryIcon(data.category)}"></i>
                </div>
                <div class="app-info">
                    <div class="app-name">${app}</div>
                    <div class="app-usage">
                        <span class="app-time">${formatDuration(data.time)}</span>
                        <span class="app-percentage">${percentage}%</span>
                    </div>
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
    const container = document.getElementById('timelineBody');
    if (!container) return;
    
    let activities = [];
    const now = new Date();
    
    switch (state.currentTimelineView) {
        case 'day':
            activities = getTodayActivities();
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            activities = state.activities.filter(a => new Date(a.startTime) >= weekStart);
            break;
        case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            activities = state.activities.filter(a => new Date(a.startTime) >= monthStart);
            break;
    }
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted">No activities in this time period</p>
            </div>
        `;
        return;
    }
    
    const tracks = groupActivitiesByHour(activities);
    
    container.innerHTML = tracks.map(track => {
        const blocks = track.activities.map(activity => {
            const startTime = new Date(activity.startTime);
            const endTime = activity.endTime ? new Date(activity.endTime) : new Date();
            const duration = endTime - startTime;
            
            const startHour = startTime.getHours();
            const startMinutes = startTime.getMinutes();
            const startPercent = ((startHour + startMinutes / 60) / 24) * 100;
            const widthPercent = Math.max((duration / (24 * 60 * 60 * 1000)) * 100, 0.5);
            
            return `
                <div class="timeline-block ${activity.category}" 
                     style="left: ${startPercent}%; width: ${widthPercent}%"
                     title="${activity.app} - ${formatDuration(duration)}">
                    ${activity.app}
                </div>
            `;
        }).join('');
        
        return `<div class="timeline-track">${blocks}</div>`;
    }).join('');
    
    updateCurrentTimeIndicator();
}

function updateCurrentTimeIndicator() {
    const indicator = document.getElementById('currentTimeLine');
    if (!indicator) return;
    
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const percentage = ((hours + minutes / 60) / 24) * 100;
    
    indicator.style.left = `${percentage}%`;
}

function updateActivitiesTable() {
    const container = document.getElementById('activitiesTable');
    if (!container) return;
    
    const activities = state.activities.slice().reverse();
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-center py-4">No activities recorded</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Application</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${activities.map(activity => `
                    <tr>
                        <td>${activity.app}</td>
                        <td>${activity.title || '-'}</td>
                        <td>
                            <span class="badge bg-${getCategoryColor(activity.category)}">
                                ${activity.category}
                            </span>
                        </td>
                        <td>${new Date(activity.startTime).toLocaleString()}</td>
                        <td>${formatDuration(activity.duration)}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="deleteActivity('${activity.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateAnalytics() {
    // This would be implemented with charts
    const container = document.querySelector('#analyticsPage .page-content');
    if (!container) return;
    
    const stats = calculateAnalytics();
    
    container.innerHTML = `
        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>Weekly Overview</h3>
                <div class="chart-placeholder">
                    <p>Total Time: ${formatDuration(stats.weekTotal)}</p>
                    <p>Daily Average: ${formatDuration(stats.dailyAverage)}</p>
                    <p>Most Productive Day: ${stats.mostProductiveDay}</p>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Category Distribution</h3>
                <div class="category-stats">
                    <div class="category-stat">
                        <span class="category-label">Productive</span>
                        <span class="category-value">${stats.productivePercent}%</span>
                    </div>
                    <div class="category-stat">
                        <span class="category-label">Break</span>
                        <span class="category-value">${stats.breakPercent}%</span>
                    </div>
                    <div class="category-stat">
                        <span class="category-label">Distracted</span>
                        <span class="category-value">${stats.distractedPercent}%</span>
                    </div>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Productivity Trends</h3>
                <div class="trend-info">
                    <p>This week vs last week: ${stats.weekTrend > 0 ? '+' : ''}${stats.weekTrend}%</p>
                    <p>Best productivity time: ${stats.bestHour}</p>
                    <p>Average session length: ${formatDuration(stats.avgSessionLength)}</p>
                </div>
            </div>
        </div>
    `;
}

function updateCategories() {
    const container = document.querySelector('#categoriesPage .page-content');
    if (!container) return;
    
    const categories = ['productive', 'break', 'distracted'];
    const categoryApps = {};
    
    // Group apps by category
    Object.entries(state.settings.categories).forEach(([app, category]) => {
        if (!categoryApps[category]) categoryApps[category] = [];
        categoryApps[category].push(app);
    });
    
    container.innerHTML = `
        <div class="categories-container">
            ${categories.map(category => `
                <div class="category-section">
                    <div class="category-header">
                        <h3>
                            <i class="fas fa-${getCategoryIcon(category)}"></i>
                            ${category.charAt(0).toUpperCase() + category.slice(1)}
                        </h3>
                        <button class="btn-primary btn-sm" onclick="addAppToCategory('${category}')">
                            <i class="fas fa-plus"></i> Add App
                        </button>
                    </div>
                    <div class="category-apps">
                        ${(categoryApps[category] || []).map(app => `
                            <div class="app-tag">
                                <span>${app}</span>
                                <button class="remove-btn" onclick="removeAppFromCategory('${app}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
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
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageName);
    });
    
    // Show page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
        state.currentPage = pageName;
        updateUI();
    }
}

// Manual Activity Entry
function showAddActivityModal() {
    // Use modal manager if available
    if (window.ModalManager) {
        // Register the modal if not already registered
        if (!window.ModalManager.modals.has('addActivityModal')) {
            const modalHTML = `
                <div class="modal fade" id="addActivityModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Add Manual Activity</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="addActivityForm">
                                    <div class="form-group">
                                        <label for="activityApp">Application</label>
                                        <input type="text" class="form-control" id="activityApp" name="app" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="activityTitle">Activity Title</label>
                                        <input type="text" class="form-control" id="activityTitle" name="title" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="activityCategory">Category</label>
                                        <select class="form-control" id="activityCategory" name="category" required>
                                            <option value="productive">Productive</option>
                                            <option value="break">Break</option>
                                            <option value="distracted">Distracted</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="activityStartTime">Start Time</label>
                                        <input type="datetime-local" class="form-control" id="activityStartTime" name="startTime" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="activityDuration">Duration (minutes)</label>
                                        <input type="number" class="form-control" id="activityDuration" name="duration" min="1" required>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" form="addActivityForm" class="btn-primary">Add Activity</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            window.ModalManager.registerModal('addActivityModal', modalHTML);
        }
        
        window.ModalManager.showModal('addActivityModal');
        return;
    }
    
    // Fallback to original method
    const modalElement = document.getElementById('addActivityModal');
    if (!modalElement) {
        console.error('Add activity modal not found');
        showToast('Modal not available', 'error');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    
    // Set default values
    const form = document.getElementById('addActivityForm');
    if (form) {
        const now = new Date();
        const startTime = new Date(now - 30 * 60 * 1000); // 30 minutes ago
        
        const startTimeInput = form.querySelector('[name="startTime"]');
        const durationInput = form.querySelector('[name="duration"]');
        
        if (startTimeInput) {
            startTimeInput.value = startTime.toISOString().slice(0, 16);
        }
        if (durationInput) {
            durationInput.value = 30;
        }
    }
    
    modal.show();
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
    const modal = bootstrap.Modal.getInstance(document.getElementById('addActivityModal'));
    modal.hide();
    e.target.reset();
    
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
        // Include auto categorizer patterns in settings
        const settingsToSave = {
            ...state.settings,
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
    
    document.body.classList.toggle('dark-mode', isDark);
    
    // Update theme button icon
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) {
        if (state.settings.theme === 'system') {
            icon.className = 'fas fa-adjust';
        } else if (isDark) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = generateId();
    const toastHtml = `
        <div class="toast" id="toast-${toastId}" role="alert">
            <div class="toast-header">
                <strong class="me-auto">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(`toast-${toastId}`);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
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