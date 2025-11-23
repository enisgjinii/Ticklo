// Electron IPC (with fallback for direct browser access)
let ipcRenderer = null;
if (typeof window !== 'undefined' && window.require) {
    try {
        const electron = window.require('electron');
        ipcRenderer = electron.ipcRenderer;3
    } catch (e) {
        console.warn('Running outside Electron environment');
    }
}

// Application State
const state = {
    view: 'day', // 'day' or 'week'
    currentDate: new Date(),
    sidebarCollapsed: false,
    zoomLevel: 1, // 1 = normal, 2 = zoomed in, 0.5 = zoomed out
    currentPage: 'timeline',
    trackedApps: {}, // { appName: { icon, sessions: [{start, end}], totalTime } }
    activeWindow: null,
    lastUpdate: null,
    theme: 'dark', // 'dark' or 'light'
    isPaused: false,
    searchQuery: ''
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeEventListeners();
    loadSettings();
    startTracking();
    updateCurrentDate();
    renderTimeline();
    startAutoSave(); // Start automatic data saving
});

// Initialize UI
function initializeUI() {
    // Set initial date display
    updateCurrentDate();

    // Start with day view
    showView('day');

    // Initialize sidebar state
    state.sidebarCollapsed = false;
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Sidebar toggles
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('topbarSidebarToggle')?.addEventListener('click', toggleSidebar);

    // View tabs
    document.getElementById('dayTab')?.addEventListener('click', () => switchView('day'));
    document.getElementById('weekTab')?.addEventListener('click', () => switchView('week'));

    // Date navigation
    document.getElementById('prevDate')?.addEventListener('click', navigatePrevious);
    document.getElementById('nextDate')?.addEventListener('click', navigateNext);

    // Topbar actions
    document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
    document.getElementById('info')?.addEventListener('click', showInfo);
    document.getElementById('delete')?.addEventListener('click', deleteSelected);
    document.getElementById('plus')?.addEventListener('click', addActivity);
    document.getElementById('refresh')?.addEventListener('click', refreshData);
    
    // New features
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('exportCsv')?.addEventListener('click', exportToCsv);
    document.getElementById('importCsv')?.addEventListener('click', importFromCsv);
    document.getElementById('pauseToggle')?.addEventListener('click', togglePause);
    document.getElementById('searchInput')?.addEventListener('input', handleSearch);
}

// Theme Toggle
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveSettings();
}

function applyTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    if (state.theme === 'light') {
        body.classList.remove('bg-black', 'text-foreground');
        body.classList.add('bg-white', 'text-gray-900');
        body.style.setProperty('--bg-background', '#ffffff');
        body.style.setProperty('--bg-card', '#f9fafb');
        body.style.setProperty('--border-color', '#e5e7eb');
        body.style.setProperty('--text-foreground', '#111827');
        body.style.setProperty('--text-muted', '#6b7280');
        
        // Update icon to moon
        if (themeIcon) {
            themeIcon.setAttribute('d', 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z');
        }
    } else {
        body.classList.remove('bg-white', 'text-gray-900');
        body.classList.add('bg-black', 'text-foreground');
        body.style.setProperty('--bg-background', '#0a0a0a');
        body.style.setProperty('--bg-card', '#0f0f0f');
        body.style.setProperty('--border-color', '#1f1f1f');
        body.style.setProperty('--text-foreground', '#ffffff');
        body.style.setProperty('--text-muted', '#717171');
        
        // Update icon to sun
        if (themeIcon) {
            themeIcon.setAttribute('d', 'M12 3v1m0 16v1m8.66-12.66l-.71.71M5.05 18.95l-.71.71M21 12h-1M4 12H3m15.66 5.66l-.71-.71M5.05 5.05l-.71-.71');
        }
    }
    
    // Re-render to apply theme to all elements
    renderTimeline();
}

// Export to CSV
function exportToCsv() {
    const apps = Object.entries(state.trackedApps);
    if (apps.length === 0) {
        alert('No data to export');
        return;
    }
    
    let csv = 'App Name,Start Time,End Time,Duration (seconds)\n';
    
    apps.forEach(([appName, appData]) => {
        appData.sessions.forEach(session => {
            const start = new Date(session.start).toISOString();
            const end = new Date(session.end).toISOString();
            const duration = Math.round((session.end - session.start) / 1000);
            csv += `"${appName}","${start}","${end}",${duration}\n`;
        });
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticklo-export-${getDateKey(state.currentDate)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import from CSV
function importFromCsv() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target.result;
                const lines = csv.split('\n').slice(1); // Skip header
                
                lines.forEach(line => {
                    if (!line.trim()) return;
                    
                    const match = line.match(/"([^"]+)","([^"]+)","([^"]+)",(\d+)/);
                    if (!match) return;
                    
                    const [, appName, start, end] = match;
                    
                    if (!state.trackedApps[appName]) {
                        state.trackedApps[appName] = {
                            icon: null,
                            sessions: [],
                            totalTime: 0
                        };
                    }
                    
                    state.trackedApps[appName].sessions.push({
                        start: new Date(start).getTime(),
                        end: new Date(end).getTime()
                    });
                });
                
                recalculateTotalTime();
                saveTrackingData();
                renderTimeline();
                alert('Import successful!');
            } catch (error) {
                alert('Error importing CSV: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Pause/Resume Tracking
function togglePause() {
    state.isPaused = !state.isPaused;
    const btn = document.getElementById('pauseToggle');
    const icon = btn?.querySelector('svg path');
    
    if (state.isPaused) {
        // Show play icon
        if (icon) {
            icon.setAttribute('d', 'M6 18L18 12L6 6V18z');
        }
        btn?.setAttribute('title', 'Resume Tracking');
        
        if (ipcRenderer) {
            ipcRenderer.send('pause-tracking');
        }
    } else {
        // Show pause icon
        if (icon) {
            icon.setAttribute('d', 'M6 4h4v16H6V4zm8 0h4v16h-4V4z');
        }
        btn?.setAttribute('title', 'Pause Tracking');
        
        if (ipcRenderer) {
            ipcRenderer.send('resume-tracking');
        }
    }
}

// Search Handler
function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase();
    renderTimeline();
}

// Load Settings
function loadSettings() {
    if (!ipcRenderer) {
        applyTheme();
        return;
    }
    
    ipcRenderer.invoke('load-settings').then(settings => {
        if (settings && settings.theme) {
            state.theme = settings.theme;
        }
        applyTheme();
    });
}

// Save Settings
function saveSettings() {
    if (!ipcRenderer) return;
    
    ipcRenderer.send('save-settings', {
        theme: state.theme,
        autoStart: true,
        minimizeToTray: true
    });
}



// Navigation
function navigateToPage(page) {
    state.currentPage = page;

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });

    // Show corresponding view
    const views = {
        'timeline': 'timelineView',
        'settings': 'settingsView',
        'about': 'aboutView',
        'faq': 'faqView'
    };

    // Hide all views
    Object.values(views).forEach(viewId => {
        const element = document.getElementById(viewId);
        if (element) element.classList.add('hidden');
    });

    // Show selected view
    const targetView = views[page];
    if (targetView) {
        const element = document.getElementById(targetView);
        if (element) element.classList.remove('hidden');
    }
    
    // Update data stats when opening settings
    if (page === 'settings') {
        updateDataStats();
    }
}

// Sidebar Toggle
function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const labels = document.querySelectorAll('.sidebar-label');
    const title = document.getElementById('sidebarTitle');
    const icon = document.getElementById('collapseIcon');

    if (state.sidebarCollapsed) {
        sidebar.classList.remove('w-48');
        sidebar.classList.add('w-16');
        labels.forEach(label => label.classList.add('hidden'));
        if (title) title.classList.add('hidden');

        // Update icon
        if (icon) {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>';
        }
    } else {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('w-48');
        labels.forEach(label => label.classList.remove('hidden'));
        if (title) title.classList.remove('hidden');

        // Update icon
        if (icon) {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>';
        }
    }
}

// View Switching
function switchView(view) {
    state.view = view;

    // Update tab active state
    const dayTab = document.getElementById('dayTab');
    const weekTab = document.getElementById('weekTab');

    if (view === 'day') {
        dayTab?.classList.add('active');
        weekTab?.classList.remove('active');
        showView('day');
    } else {
        weekTab?.classList.add('active');
        dayTab?.classList.remove('active');
        showView('week');
    }

    renderTimeline();
}

function showView(view) {
    const dayView = document.getElementById('dayView');
    const weekView = document.getElementById('weekView');

    if (view === 'day') {
        dayView?.classList.remove('hidden');
        weekView?.classList.add('hidden');
    } else {
        dayView?.classList.add('hidden');
        weekView?.classList.remove('hidden');
    }
}

// Zoom Controls
function zoomIn() {
    state.zoomLevel = Math.min(state.zoomLevel * 1.5, 3);
    renderTimeline();
}

function zoomOut() {
    state.zoomLevel = Math.max(state.zoomLevel / 1.5, 0.5);
    renderTimeline();
}

// Topbar Actions
function showInfo() {
    const totalApps = Object.keys(state.trackedApps).length;
    const totalTime = Object.values(state.trackedApps).reduce((sum, app) => sum + (app.totalTime || 0), 0);
    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);

    alert(`Tracking Info:\n\nTotal Apps: ${totalApps}\nTotal Time Today: ${hours}h ${minutes}m\n\nZoom Level: ${state.zoomLevel.toFixed(1)}x`);
}

function deleteSelected() {
    if (confirm('Clear all tracking data for today?')) {
        state.trackedApps = {};
        saveTrackingData();
        renderTimeline();
    }
}

function addActivity() {
    const appName = prompt('Enter app name:');
    if (!appName) return;

    const duration = prompt('Enter duration in minutes:');
    if (!duration || isNaN(duration)) return;

    const now = new Date();
    const start = new Date(now.getTime() - (parseInt(duration) * 60 * 1000));

    if (!state.trackedApps[appName]) {
        state.trackedApps[appName] = {
            icon: null,
            sessions: [],
            totalTime: 0
        };
    }

    state.trackedApps[appName].sessions.push({
        start: start.getTime(),
        end: now.getTime()
    });

    recalculateTotalTime();
    saveTrackingData();
    renderTimeline();
}

function refreshData() {
    loadTrackingData();
    renderTimeline();
}

// Date Navigation
function navigatePrevious() {
    if (state.view === 'day') {
        state.currentDate.setDate(state.currentDate.getDate() - 1);
    } else {
        state.currentDate.setDate(state.currentDate.getDate() - 7);
    }
    updateCurrentDate();
    loadTrackingData();
    renderTimeline();
}

function navigateNext() {
    const today = new Date();
    if (state.view === 'day') {
        const nextDay = new Date(state.currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        if (nextDay <= today) {
            state.currentDate = nextDay;
            updateCurrentDate();
            loadTrackingData();
            renderTimeline();
        }
    } else {
        const nextWeek = new Date(state.currentDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        if (nextWeek <= today) {
            state.currentDate = nextWeek;
            updateCurrentDate();
            loadTrackingData();
            renderTimeline();
        }
    }
}

function updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (!dateEl) return;

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    if (state.view === 'day') {
        dateEl.textContent = state.currentDate.toLocaleDateString('en-US', options);
    } else {
        // Show week range
        const startOfWeek = getStartOfWeek(state.currentDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const start = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateEl.textContent = `${start} - ${end}`;
    }
}

// Time Tracking
function startTracking() {
    if (!ipcRenderer) {
        console.warn('IPC not available - running in demo mode');
        // Load demo data for testing
        loadDemoData();
        return;
    }

    // Request active window updates from main process
    ipcRenderer.send('start-tracking');

    // Listen for active window updates
    ipcRenderer.on('active-window-update', (event, windowInfo) => {
        handleWindowUpdate(windowInfo);
    });

    // Load existing tracking data
    loadTrackingData();

    // Update UI every second
    setInterval(() => {
        recalculateTotalTime();
        renderTimeline();
    }, 5000); // Update every 5 seconds
}

// Listen for active window updates (real tracking)
if (ipcRenderer) {
    ipcRenderer.on('active-window-update', (event, data) => {
        const { name, title, icon, path, timestamp } = data;
        const now = Date.now();
        // Initialize app entry if needed
        if (!state.trackedApps[name]) {
            state.trackedApps[name] = {
                icon: icon || null,
                sessions: [],
                totalTime: 0
            };
        } else if (icon && !state.trackedApps[name].icon) {
            // Update icon if we just received it later
            state.trackedApps[name].icon = icon;
        }

        // Determine if we should extend the last session or start a new one
        const app = state.trackedApps[name];
        const lastSession = app.sessions[app.sessions.length - 1];
        if (lastSession && now - lastSession.end < 5000) {
            // Extend existing session
            lastSession.end = now;
        } else {
            // New session
            app.sessions.push({ start: now, end: now });
        }

        // Recalculate totals and re-render timeline
        recalculateTotalTime();
        renderTimeline();
    });
}

function handleWindowUpdate(windowInfo) {
    if (!windowInfo || !windowInfo.name) return;

    const appName = windowInfo.name;
    const now = Date.now();

    // Initialize app tracking if needed
    if (!state.trackedApps[appName]) {
        state.trackedApps[appName] = {
            icon: windowInfo.icon || null,
            sessions: [],
            totalTime: 0
        };
        console.log(`📱 New app tracked: ${appName}`);
    }

    // Update icon if we have a new one
    if (windowInfo.icon && !state.trackedApps[appName].icon) {
        state.trackedApps[appName].icon = windowInfo.icon;
    }

    // Check if this is a new session or continuation
    const lastSession = state.trackedApps[appName].sessions[state.trackedApps[appName].sessions.length - 1];

    if (lastSession && (now - lastSession.end) < 5000) {
        // Continue existing session (within 5 seconds)
        lastSession.end = now;
    } else {
        // Start new session
        state.trackedApps[appName].sessions.push({
            start: now,
            end: now
        });
        console.log(`▶️ New session started: ${appName}`);
    }

    state.activeWindow = appName;
    state.lastUpdate = now;

    // Save data every 5 minutes of activity
    const totalSessions = Object.values(state.trackedApps).reduce((sum, app) => sum + app.sessions.length, 0);
    if (totalSessions % 60 === 0) { // Every 60 session updates (roughly 1 minute)
        saveTrackingData();
    }
}

function recalculateTotalTime() {
    Object.keys(state.trackedApps).forEach(appName => {
        const app = state.trackedApps[appName];
        // Sum all session durations (end - start) and convert ms to seconds
        const totalMs = app.sessions.reduce((total, session) => {
            const duration = (session.end || Date.now()) - session.start;
            return total + duration;
        }, 0);
        app.totalTime = Math.round(totalMs / 1000); // store as integer seconds
    });
}

// Render App Summary (total time per app)
function renderAppSummary() {
    const container = document.getElementById('appSummaryContent');
    if (!container) return;
    container.innerHTML = '';
    const apps = Object.entries(state.trackedApps)
        .filter(([, app]) => app.totalTime > 0)
        .sort(([, a], [, b]) => b.totalTime - a.totalTime);
    if (apps.length === 0) {
        container.innerHTML = '<p class="text-muted-foreground text-sm">No app usage data.</p>';
        return;
    }
    apps.forEach(([name, app]) => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 p-2 bg-card border border-border rounded';
        // Icon
        if (app.icon) {
            const img = document.createElement('img');
            img.className = 'app-icon';
            img.src = app.icon;
            img.alt = name;
            div.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'app-icon bg-secondary flex items-center justify-center text-xs font-bold';
            placeholder.textContent = name.charAt(0).toUpperCase();
            div.appendChild(placeholder);
        }
        // Name and time
        const info = document.createElement('div');
        info.className = 'flex-1 min-w-0';
        const nameEl = document.createElement('div');
        nameEl.className = 'text-sm font-medium truncate';
        nameEl.textContent = name;
        const timeEl = document.createElement('div');
        timeEl.className = 'text-xs text-muted-foreground';
        timeEl.textContent = formatDuration(app.totalTime);
        info.appendChild(nameEl);
        info.appendChild(timeEl);
        div.appendChild(info);
        container.appendChild(div);
    });
}

// Render Timeline
function renderTimeline() {
    if (state.view === 'day') {
        renderDayView();
    } else {
        renderWeekView();
    }
    renderAppSummary();
    updateStatsDashboard();
}

// Update Stats Dashboard
function updateStatsDashboard() {
    const apps = Object.entries(state.trackedApps);
    const totalTime = apps.reduce((sum, [, app]) => sum + (app.totalTime || 0), 0);
    const activeAppsCount = apps.filter(([, app]) => app.totalTime > 0).length;
    
    // Find most used app
    let mostUsedApp = '-';
    if (apps.length > 0) {
        const sorted = apps.sort(([, a], [, b]) => (b.totalTime || 0) - (a.totalTime || 0));
        if (sorted[0] && sorted[0][1].totalTime > 0) {
            mostUsedApp = sorted[0][0];
        }
    }
    
    // Update DOM
    const totalTimeEl = document.getElementById('totalTime');
    if (totalTimeEl) {
        const hours = Math.floor(totalTime / 3600);
        const minutes = Math.floor((totalTime % 3600) / 60);
        totalTimeEl.textContent = `${hours}h ${minutes}m`;
    }
    
    const activeAppsEl = document.getElementById('activeApps');
    if (activeAppsEl) {
        activeAppsEl.textContent = activeAppsCount;
    }
    
    const mostUsedEl = document.getElementById('mostUsed');
    if (mostUsedEl) {
        mostUsedEl.textContent = mostUsedApp;
        mostUsedEl.title = mostUsedApp;
    }
    
    const statusEl = document.getElementById('trackingStatus');
    if (statusEl) {
        if (state.isPaused) {
            statusEl.innerHTML = '<span class="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>Paused';
        } else {
            statusEl.innerHTML = '<span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>Tracking';
        }
    }
}

function renderDayView() {
    const container = document.getElementById('timelineGrid');
    const noDataMessage = document.getElementById('noDataMessage');

    if (!container) return;

    // Check if we have data
    const hasData = Object.keys(state.trackedApps).length > 0 &&
        Object.values(state.trackedApps).some(app => app.sessions.length > 0);

    if (!hasData) {
        if (noDataMessage) noDataMessage.classList.remove('hidden');
        container.innerHTML = '';
        return;
    }

    if (noDataMessage) noDataMessage.classList.add('hidden');

    // Clear container
    container.innerHTML = '';

    // Calculate height based on zoom
    const hourHeight = 60 * state.zoomLevel;

    // Render 24 hours
    for (let hour = 0; hour < 24; hour++) {
        const hourDiv = document.createElement('div');
        hourDiv.className = 'timeline-hour flex items-start border-b border-border';
        hourDiv.style.height = `${hourHeight}px`;

        // Hour label
        const label = document.createElement('div');
        label.className = 'w-16 text-xs text-muted-foreground pt-1 px-2';
        label.textContent = `${hour.toString().padStart(2, '0')}:00`;
        hourDiv.appendChild(label);

        // Activity container
        const activityContainer = document.createElement('div');
        activityContainer.className = 'flex-1 relative';

        // Find activities for this hour
        const activities = getActivitiesForHour(hour);

        // Render activities
        activities.forEach(activity => {
            const activityBlock = createActivityBlock(activity, hourHeight);
            if (activityBlock) {
                activityContainer.appendChild(activityBlock);
            }
        });

        hourDiv.appendChild(activityContainer);
        container.appendChild(hourDiv);
    }
}

function getActivitiesForHour(hour) {
    const activities = [];
    const dayStart = new Date(state.currentDate);
    dayStart.setHours(0, 0, 0, 0);

    const hourStart = new Date(dayStart);
    hourStart.setHours(hour);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hour + 1);

    Object.entries(state.trackedApps).forEach(([appName, appData]) => {
        appData.sessions.forEach(session => {
            const sessionStart = new Date(session.start);
            const sessionEnd = new Date(session.end);

            // Check if session overlaps with this hour
            if (sessionStart < hourEnd && sessionEnd > hourStart) {
                activities.push({
                    appName,
                    icon: appData.icon,
                    start: Math.max(session.start, hourStart.getTime()),
                    end: Math.min(session.end, hourEnd.getTime()),
                    duration: (Math.min(session.end, hourEnd.getTime()) - Math.max(session.start, hourStart.getTime())) / 1000
                });
            }
        });
    });

    return activities;
}

function createActivityBlock(activity, hourHeight) {
    // Filter by search query
    if (state.searchQuery && !activity.appName.toLowerCase().includes(state.searchQuery)) {
        return null;
    }
    
    const block = document.createElement('div');
    const bgColor = state.theme === 'light' ? 'bg-blue-50 border-blue-300' : 'bg-card border-accent';
    const textColor = state.theme === 'light' ? 'text-gray-900' : 'text-foreground';
    block.className = `activity-block absolute left-0 right-0 mx-2 ${bgColor} border rounded p-2 flex items-center gap-2 cursor-pointer ${textColor}`;

    // Calculate position and height
    const hourStart = new Date(activity.start);
    hourStart.setMinutes(0, 0, 0);
    const minutesFromHourStart = (activity.start - hourStart.getTime()) / 1000 / 60;
    const durationMinutes = activity.duration / 60;

    const top = (minutesFromHourStart / 60) * hourHeight;
    const height = Math.max((durationMinutes / 60) * hourHeight, 30);

    block.style.top = `${top}px`;
    block.style.height = `${height}px`;

    // App icon
    if (activity.icon) {
        const icon = document.createElement('img');
        icon.className = 'app-icon';
        icon.src = activity.icon;
        icon.alt = activity.appName;
        icon.onerror = () => {
            // Fallback to placeholder if icon fails to load
            icon.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'app-icon bg-secondary flex items-center justify-center text-xs font-bold';
            placeholder.textContent = activity.appName.charAt(0).toUpperCase();
            block.insertBefore(placeholder, block.firstChild);
        };
        block.appendChild(icon);
    } else {
        const iconPlaceholder = document.createElement('div');
        const placeholderBg = state.theme === 'light' ? 'bg-gray-200 text-gray-700' : 'bg-secondary text-foreground';
        iconPlaceholder.className = `app-icon ${placeholderBg} flex items-center justify-center text-xs font-bold`;
        iconPlaceholder.textContent = activity.appName.charAt(0).toUpperCase();
        block.appendChild(iconPlaceholder);
    }

    // App info
    const info = document.createElement('div');
    info.className = 'flex-1 min-w-0';

    const name = document.createElement('div');
    name.className = 'text-sm font-medium truncate';
    name.textContent = activity.appName;
    info.appendChild(name);

    if (height > 40) {
        const duration = document.createElement('div');
        const mutedColor = state.theme === 'light' ? 'text-gray-600' : 'text-muted-foreground';
        duration.className = `text-xs ${mutedColor}`;
        duration.textContent = formatDuration(activity.duration);
        info.appendChild(duration);
    }

    block.appendChild(info);

    // Duration badge (if space allows)
    if (height > 50) {
        const badge = document.createElement('div');
        const accentColor = state.theme === 'light' ? 'text-blue-600' : 'text-accent';
        badge.className = `text-xs ${accentColor} font-medium`;
        badge.textContent = formatDuration(activity.duration);
        block.appendChild(badge);
    }

    return block;
}

function renderWeekView() {
    const container = document.getElementById('weekGrid');
    if (!container) return;

    container.innerHTML = '';

    const startOfWeek = getStartOfWeek(state.currentDate);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    days.forEach((dayName, index) => {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + index);

        const dayCard = document.createElement('div');
        dayCard.className = 'bg-card border border-border rounded-lg p-4';

        const header = document.createElement('div');
        header.className = 'text-sm font-semibold mb-4 pb-2 border-b border-border';
        header.textContent = `${dayName} ${day.getDate()}`;
        dayCard.appendChild(header);

        // Get total time for this day
        const dayApps = getAppsForDay(day);
        const totalTime = Object.values(dayApps).reduce((sum, time) => sum + time, 0);

        if (totalTime > 0) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'text-xs text-muted-foreground mb-3';
            timeDiv.textContent = formatDuration(totalTime);
            dayCard.appendChild(timeDiv);

            // Top apps
            const topApps = Object.entries(dayApps)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3);

            topApps.forEach(([appName, time]) => {
                const appDiv = document.createElement('div');
                appDiv.className = 'flex items-center gap-2 mb-2 text-xs';

                const dot = document.createElement('div');
                dot.className = 'w-2 h-2 rounded-full bg-accent';
                appDiv.appendChild(dot);

                const name = document.createElement('span');
                name.className = 'flex-1 truncate';
                name.textContent = appName;
                appDiv.appendChild(name);

                const duration = document.createElement('span');
                duration.className = 'text-muted-foreground';
                duration.textContent = formatDuration(time);
                appDiv.appendChild(duration);

                dayCard.appendChild(appDiv);
            });
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-xs text-muted-foreground text-center py-8';
            emptyDiv.textContent = 'No data';
            dayCard.appendChild(emptyDiv);
        }

        container.appendChild(dayCard);
    });
}

function getAppsForDay(day) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const apps = {};

    Object.entries(state.trackedApps).forEach(([appName, appData]) => {
        let totalTime = 0;

        appData.sessions.forEach(session => {
            if (session.start >= dayStart.getTime() && session.end <= dayEnd.getTime()) {
                totalTime += (session.end - session.start) / 1000;
            }
        });

        if (totalTime > 0) {
            apps[appName] = totalTime;
        }
    });

    return apps;
}

// Utility Functions
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Data Persistence
function saveTrackingData() {
    if (!ipcRenderer) {
        console.warn('Cannot save: IPC not available');
        return;
    }

    try {
        const dateKey = getDateKey(state.currentDate);
        const dataToSave = {
            date: dateKey,
            apps: state.trackedApps,
            savedAt: new Date().toISOString(),
            version: '1.0.0'
        };
        
        // Show saving indicator
        showSaveIndicator('saving');
        
        ipcRenderer.send('save-tracking-data', dataToSave);
        console.log(`✅ Data saved for ${dateKey}`);
        
        // Show saved indicator
        setTimeout(() => showSaveIndicator('saved'), 500);
    } catch (error) {
        console.error('Error saving tracking data:', error);
        showSaveIndicator('error');
    }
}

// Show save indicator
function showSaveIndicator(status) {
    const indicator = document.getElementById('saveIndicator');
    const statusText = document.getElementById('saveStatus');
    
    if (!indicator || !statusText) return;
    
    if (status === 'saving') {
        statusText.textContent = '💾 Saving...';
        indicator.style.opacity = '1';
    } else if (status === 'saved') {
        statusText.textContent = '✅ Saved';
        indicator.style.opacity = '1';
        
        // Fade out after 2 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    } else if (status === 'error') {
        statusText.textContent = '❌ Error';
        indicator.style.opacity = '1';
        
        // Fade out after 3 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 3000);
    }
}

function loadTrackingData() {
    if (!ipcRenderer) {
        console.warn('Cannot load: IPC not available');
        return;
    }

    try {
        const dateKey = getDateKey(state.currentDate);
        ipcRenderer.send('load-tracking-data', dateKey);
        console.log(`📂 Loading data for ${dateKey}`);
    } catch (error) {
        console.error('Error loading tracking data:', error);
    }
}

// Auto-save function - saves data every 30 seconds
function startAutoSave() {
    setInterval(() => {
        if (Object.keys(state.trackedApps).length > 0) {
            saveTrackingData();
        }
    }, 30000); // Save every 30 seconds
    
    console.log('🔄 Auto-save enabled (every 30 seconds)');
}

// Save data before page unload
window.addEventListener('beforeunload', () => {
    saveTrackingData();
    console.log('💾 Data saved before exit');
});

// Listen for loaded data
if (ipcRenderer) {
    ipcRenderer.on('tracking-data-loaded', (event, data) => {
        if (data) {
            state.trackedApps = data.apps || {};
            recalculateTotalTime();
            renderTimeline();
        }
    });
}

// Demo data for testing
function loadDemoData() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    state.trackedApps = {
        'Visual Studio Code': {
            icon: null,
            sessions: [
                { start: today.getTime() + (9 * 3600000), end: today.getTime() + (10.5 * 3600000) },
                { start: today.getTime() + (14 * 3600000), end: today.getTime() + (16 * 3600000) }
            ],
            totalTime: 0
        },
        'Chrome': {
            icon: null,
            sessions: [
                { start: today.getTime() + (10.5 * 3600000), end: today.getTime() + (11 * 3600000) },
                { start: today.getTime() + (13 * 3600000), end: today.getTime() + (14 * 3600000) }
            ],
            totalTime: 0
        },
        'Slack': {
            icon: null,
            sessions: [
                { start: today.getTime() + (11 * 3600000), end: today.getTime() + (11.5 * 3600000) }
            ],
            totalTime: 0
        }
    };

    recalculateTotalTime();
    renderTimeline();
}

// Settings Page Handlers
function initializeSettingsHandlers() {
    // Theme toggle in settings
    document.getElementById('settingsThemeToggle')?.addEventListener('click', () => {
        toggleTheme();
        updateSettingsUI();
    });

    // Auto-start toggle
    document.getElementById('autoStartToggle')?.addEventListener('change', (e) => {
        saveSettings();
    });

    // Minimize to tray toggle
    document.getElementById('minimizeToTrayToggle')?.addEventListener('change', (e) => {
        saveSettings();
    });

    // Save now button
    document.getElementById('saveNow')?.addEventListener('click', () => {
        saveTrackingData();
        updateDataStats();
        alert('Data saved successfully!');
    });

    // Open data folder
    document.getElementById('openDataFolder')?.addEventListener('click', () => {
        if (ipcRenderer) {
            ipcRenderer.invoke('open-data-directory');
        }
    });

    // Export all data
    document.getElementById('exportAllData')?.addEventListener('click', exportAllData);

    // Import data
    document.getElementById('importData')?.addEventListener('click', importFromCsv);

    // Clear all data
    document.getElementById('clearAllData')?.addEventListener('click', clearAllData);
    
    // Update stats when settings page is opened
    updateDataStats();
}

// Update data statistics in settings
function updateDataStats() {
    const appsCount = Object.keys(state.trackedApps).length;
    const totalSessions = Object.values(state.trackedApps).reduce((sum, app) => sum + (app.sessions?.length || 0), 0);
    
    const appsCountEl = document.getElementById('statsAppsCount');
    if (appsCountEl) appsCountEl.textContent = appsCount;
    
    const sessionsEl = document.getElementById('statsSessions');
    if (sessionsEl) sessionsEl.textContent = totalSessions;
    
    const lastSavedEl = document.getElementById('statsLastSaved');
    if (lastSavedEl && state.lastUpdate) {
        const now = new Date();
        const lastUpdate = new Date(state.lastUpdate);
        const diffSeconds = Math.floor((now - lastUpdate) / 1000);
        
        if (diffSeconds < 60) {
            lastSavedEl.textContent = 'Just now';
        } else if (diffSeconds < 3600) {
            lastSavedEl.textContent = `${Math.floor(diffSeconds / 60)}m ago`;
        } else {
            lastSavedEl.textContent = `${Math.floor(diffSeconds / 3600)}h ago`;
        }
    }
}

function updateSettingsUI() {
    const themeBtn = document.getElementById('currentTheme');
    if (themeBtn) {
        themeBtn.textContent = state.theme === 'dark' ? 'Dark' : 'Light';
    }
}

function exportAllData() {
    if (!ipcRenderer) {
        alert('Export feature requires Electron environment');
        return;
    }

    try {
        const dataDir = ipcRenderer.sendSync('get-user-data-path');
        const fs = window.require('fs');
        const path = window.require('path');

        // Collect all tracking files
        const files = fs.readdirSync(dataDir).filter(f => f.startsWith('tracking-'));
        
        if (files.length === 0) {
            alert('No data to export');
            return;
        }

        let allData = [];
        files.forEach(file => {
            const filePath = path.join(dataDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            allData.push(data);
        });

        // Create CSV
        let csv = 'Date,App Name,Start Time,End Time,Duration (seconds)\n';
        
        allData.forEach(dayData => {
            const date = dayData.date;
            Object.entries(dayData.apps || {}).forEach(([appName, appData]) => {
                (appData.sessions || []).forEach(session => {
                    const start = new Date(session.start).toISOString();
                    const end = new Date(session.end).toISOString();
                    const duration = Math.round((session.end - session.start) / 1000);
                    csv += `"${date}","${appName}","${start}","${end}",${duration}\n`;
                });
            });
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticklo-full-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        alert('Export successful!');
    } catch (error) {
        alert('Error exporting data: ' + error.message);
    }
}

function clearAllData() {
    if (!confirm('Are you sure you want to clear ALL tracking data? This cannot be undone!')) {
        return;
    }

    if (!confirm('This will permanently delete all your activity history. Continue?')) {
        return;
    }

    state.trackedApps = {};
    saveTrackingData();
    renderTimeline();

    if (ipcRenderer) {
        try {
            const dataDir = ipcRenderer.sendSync('get-user-data-path');
            const fs = window.require('fs');
            const path = window.require('path');

            const files = fs.readdirSync(dataDir).filter(f => f.startsWith('tracking-'));
            files.forEach(file => {
                fs.unlinkSync(path.join(dataDir, file));
            });

            alert('All data cleared successfully');
        } catch (error) {
            alert('Error clearing data: ' + error.message);
        }
    }
}

// Call this in initializeEventListeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSettingsHandlers);
} else {
    initializeSettingsHandlers();
}
