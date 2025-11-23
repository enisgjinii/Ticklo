// Electron IPC (with fallback for direct browser access)
let ipcRenderer = null;
if (typeof window !== 'undefined' && window.require) {
    try {
        const electron = window.require('electron');
        ipcRenderer = electron.ipcRenderer;
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
    lastUpdate: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeEventListeners();
    startTracking();
    updateCurrentDate();
    renderTimeline();
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
    }

    state.activeWindow = appName;
    state.lastUpdate = now;

    // Save data periodically
    if (state.trackedApps[appName].sessions.length % 10 === 0) {
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
            activityContainer.appendChild(activityBlock);
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
    const block = document.createElement('div');
    block.className = 'activity-block absolute left-0 right-0 mx-2 bg-card border border-accent rounded p-2 flex items-center gap-2 cursor-pointer';

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
        block.appendChild(icon);
    } else {
        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.className = 'app-icon bg-secondary flex items-center justify-center text-xs font-bold';
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
        duration.className = 'text-xs text-muted-foreground';
        duration.textContent = formatDuration(activity.duration);
        info.appendChild(duration);
    }

    block.appendChild(info);

    // Duration badge (if space allows)
    if (height > 50) {
        const badge = document.createElement('div');
        badge.className = 'text-xs text-accent font-medium';
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
    if (!ipcRenderer) return;

    const dateKey = getDateKey(state.currentDate);
    ipcRenderer.send('save-tracking-data', {
        date: dateKey,
        apps: state.trackedApps
    });
}

function loadTrackingData() {
    if (!ipcRenderer) return;

    const dateKey = getDateKey(state.currentDate);
    ipcRenderer.send('load-tracking-data', dateKey);
}

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