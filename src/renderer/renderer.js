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
    view: 'day',
    currentDate: new Date(),
    sidebarCollapsed: false,
    zoomLevel: 1,
    currentPage: 'timeline',
    trackedApps: {},
    activeWindow: null,
    lastUpdate: null,
    theme: 'dark',
    isPaused: false,
    searchQuery: '',
    settings: {
        autoStart: true,
        minimizeToTray: true
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeEventListeners();
    loadSettings();
    startTracking();
    updateCurrentDate();
    renderTimeline();
    startAutoSave();
    initializeFAQ();
});

// Initialize UI
function initializeUI() {
    updateCurrentDate();
    showView('day');
    state.sidebarCollapsed = false;
    updatePageHeader('timeline');
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
    document.getElementById('todayBtn')?.addEventListener('click', goToToday);
    document.getElementById('datePickerBtn')?.addEventListener('click', openDatePicker);
    document.getElementById('hiddenDatePicker')?.addEventListener('change', handleDatePickerChange);

    // Topbar actions
    document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
    document.getElementById('addActivity')?.addEventListener('click', addActivity);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('pauseToggle')?.addEventListener('click', togglePause);

    // Settings page handlers
    initializeSettingsHandlers();
}

// Page Header Updates
function updatePageHeader(page) {
    const titles = {
        'timeline': { title: 'Timeline', subtitle: 'Track your daily activities' },
        'analytics': { title: 'Analytics', subtitle: 'Insights into your productivity' },
        'settings': { title: 'Settings', subtitle: 'Customize your experience' },
        'about': { title: 'About', subtitle: 'Learn more about Ticklo' },
        'faq': { title: 'FAQ', subtitle: 'Frequently asked questions' }
    };
    
    const pageInfo = titles[page] || titles['timeline'];
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    
    if (titleEl) titleEl.textContent = pageInfo.title;
    if (subtitleEl) subtitleEl.textContent = pageInfo.subtitle;
    
    // Show/hide date navigation based on page
    const dateNav = document.getElementById('dateNavigation');
    const viewTabs = document.getElementById('viewTabs');
    if (dateNav) dateNav.style.display = (page === 'timeline') ? 'flex' : 'none';
    if (viewTabs) viewTabs.style.display = (page === 'timeline') ? 'flex' : 'none';
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

    // Update page header
    updatePageHeader(page);

    // Show corresponding view
    const views = {
        'timeline': 'timelineView',
        'analytics': 'analyticsView',
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
    
    // Update specific page data
    if (page === 'settings') updateDataStats();
    if (page === 'analytics') updateAnalytics();
}

// Sidebar Toggle
function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const labels = document.querySelectorAll('.sidebar-label');
    const title = document.getElementById('sidebarTitle');
    const icon = document.getElementById('collapseIcon');
    const sidebarStatus = document.getElementById('sidebarStatus');

    if (state.sidebarCollapsed) {
        sidebar.classList.remove('w-56');
        sidebar.classList.add('w-16');
        labels.forEach(label => label.classList.add('hidden'));
        if (title) title.classList.add('hidden');
        if (sidebarStatus) sidebarStatus.classList.add('hidden');
        if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>';
    } else {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('w-56');
        labels.forEach(label => label.classList.remove('hidden'));
        if (title) title.classList.remove('hidden');
        if (sidebarStatus) sidebarStatus.classList.remove('hidden');
        if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>';
    }
}

// View Switching
function switchView(view) {
    state.view = view;
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
    updateCurrentDate();
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

// Theme Toggle
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveSettings();
}

function applyTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const settingsToggle = document.getElementById('settingsThemeToggle');
    
    if (state.theme === 'light') {
        body.classList.remove('bg-black', 'text-foreground');
        body.classList.add('bg-white', 'text-gray-900', 'light-mode');
        if (themeIcon) themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
        if (settingsToggle) {
            settingsToggle.classList.add('active');
            settingsToggle.dataset.active = 'true';
        }
    } else {
        body.classList.remove('bg-white', 'text-gray-900', 'light-mode');
        body.classList.add('bg-black', 'text-foreground');
        if (themeIcon) themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
        if (settingsToggle) {
            settingsToggle.classList.remove('active');
            settingsToggle.dataset.active = 'false';
        }
    }
    renderTimeline();
}

// Pause/Resume Tracking
function togglePause() {
    state.isPaused = !state.isPaused;
    const pauseIcon = document.getElementById('pauseIcon');
    const trackingDot = document.getElementById('trackingDot');
    const sidebarStatus = document.getElementById('sidebarStatus');
    const trackingStatus = document.getElementById('trackingStatus');
    
    if (state.isPaused) {
        if (pauseIcon) pauseIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        if (trackingDot) { trackingDot.classList.remove('bg-green-500', 'animate-pulse'); trackingDot.classList.add('bg-yellow-500'); }
        if (sidebarStatus) sidebarStatus.textContent = 'Paused';
        if (trackingStatus) trackingStatus.innerHTML = '<span class="w-2 h-2 bg-yellow-500 rounded-full"></span><span>Paused</span>';
        if (ipcRenderer) ipcRenderer.send('pause-tracking');
    } else {
        if (pauseIcon) pauseIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        if (trackingDot) { trackingDot.classList.remove('bg-yellow-500'); trackingDot.classList.add('bg-green-500', 'animate-pulse'); }
        if (sidebarStatus) sidebarStatus.textContent = 'Tracking';
        if (trackingStatus) trackingStatus.innerHTML = '<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span><span>Tracking</span>';
        if (ipcRenderer) ipcRenderer.send('resume-tracking');
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

// Add Activity
function addActivity() {
    const appName = prompt('Enter app name:');
    if (!appName) return;

    const duration = prompt('Enter duration in minutes:');
    if (!duration || isNaN(duration)) return;

    const now = new Date();
    const start = new Date(now.getTime() - (parseInt(duration) * 60 * 1000));

    if (!state.trackedApps[appName]) {
        state.trackedApps[appName] = { icon: null, sessions: [], totalTime: 0 };
    }

    state.trackedApps[appName].sessions.push({ start: start.getTime(), end: now.getTime() });
    recalculateTotalTime();
    saveTrackingData();
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
    today.setHours(23, 59, 59, 999);
    
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

function goToToday() {
    state.currentDate = new Date();
    updateCurrentDate();
    loadTrackingData();
    renderTimeline();
}

function openDatePicker() {
    const picker = document.getElementById('hiddenDatePicker');
    if (picker) {
        picker.value = getDateKey(state.currentDate);
        picker.showPicker();
    }
}

function handleDatePickerChange(e) {
    const selectedDate = new Date(e.target.value + 'T12:00:00');
    if (!isNaN(selectedDate.getTime())) {
        state.currentDate = selectedDate;
        updateCurrentDate();
        loadTrackingData();
        renderTimeline();
    }
}

function updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (!dateEl) return;

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    if (state.view === 'day') {
        const today = new Date();
        const isToday = state.currentDate.toDateString() === today.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = state.currentDate.toDateString() === yesterday.toDateString();
        
        if (isToday) {
            dateEl.textContent = 'Today';
        } else if (isYesterday) {
            dateEl.textContent = 'Yesterday';
        } else {
            dateEl.textContent = state.currentDate.toLocaleDateString('en-US', options);
        }
    } else {
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
        loadDemoData();
        return;
    }

    ipcRenderer.send('start-tracking');
    ipcRenderer.on('active-window-update', (event, windowInfo) => {
        handleWindowUpdate(windowInfo);
    });
    loadTrackingData();

    setInterval(() => {
        recalculateTotalTime();
        renderTimeline();
    }, 5000);
}

// Listen for active window updates
if (ipcRenderer) {
    ipcRenderer.on('active-window-update', (event, data) => {
        const { name, title, icon, path, timestamp } = data;
        const now = Date.now();
        
        if (!state.trackedApps[name]) {
            state.trackedApps[name] = { icon: icon || null, sessions: [], totalTime: 0 };
        } else if (icon && !state.trackedApps[name].icon) {
            state.trackedApps[name].icon = icon;
        }

        const app = state.trackedApps[name];
        const lastSession = app.sessions[app.sessions.length - 1];
        if (lastSession && now - lastSession.end < 5000) {
            lastSession.end = now;
        } else {
            app.sessions.push({ start: now, end: now });
        }

        recalculateTotalTime();
        renderTimeline();
    });
}

function handleWindowUpdate(windowInfo) {
    if (!windowInfo || !windowInfo.name) return;

    const appName = windowInfo.name;
    const now = Date.now();

    if (!state.trackedApps[appName]) {
        state.trackedApps[appName] = { icon: windowInfo.icon || null, sessions: [], totalTime: 0 };
    }

    if (windowInfo.icon && !state.trackedApps[appName].icon) {
        state.trackedApps[appName].icon = windowInfo.icon;
    }

    const lastSession = state.trackedApps[appName].sessions[state.trackedApps[appName].sessions.length - 1];
    if (lastSession && (now - lastSession.end) < 5000) {
        lastSession.end = now;
    } else {
        state.trackedApps[appName].sessions.push({ start: now, end: now });
    }

    state.activeWindow = appName;
    state.lastUpdate = now;

    const totalSessions = Object.values(state.trackedApps).reduce((sum, app) => sum + app.sessions.length, 0);
    if (totalSessions % 60 === 0) saveTrackingData();
}

function recalculateTotalTime() {
    Object.keys(state.trackedApps).forEach(appName => {
        const app = state.trackedApps[appName];
        const totalMs = app.sessions.reduce((total, session) => {
            return total + ((session.end || Date.now()) - session.start);
        }, 0);
        app.totalTime = Math.round(totalMs / 1000);
    });
}

// Render Timeline
function renderTimeline() {
    if (state.view === 'day') {
        renderDayView();
    } else {
        renderWeekView();
    }
    updateStatsDashboard();
}

function updateStatsDashboard() {
    const apps = Object.entries(state.trackedApps);
    const totalTime = apps.reduce((sum, [, app]) => sum + (app.totalTime || 0), 0);
    const activeAppsCount = apps.filter(([, app]) => app.totalTime > 0).length;
    
    let mostUsedApp = '-';
    if (apps.length > 0) {
        const sorted = [...apps].sort(([, a], [, b]) => (b.totalTime || 0) - (a.totalTime || 0));
        if (sorted[0] && sorted[0][1].totalTime > 0) mostUsedApp = sorted[0][0];
    }
    
    const totalTimeEl = document.getElementById('totalTime');
    if (totalTimeEl) {
        const hours = Math.floor(totalTime / 3600);
        const minutes = Math.floor((totalTime % 3600) / 60);
        totalTimeEl.textContent = `${hours}h ${minutes}m`;
    }
    
    const activeAppsEl = document.getElementById('activeApps');
    if (activeAppsEl) activeAppsEl.textContent = activeAppsCount;
    
    const mostUsedEl = document.getElementById('mostUsed');
    if (mostUsedEl) { mostUsedEl.textContent = mostUsedApp; mostUsedEl.title = mostUsedApp; }
    
    const statusEl = document.getElementById('trackingStatus');
    if (statusEl) {
        if (state.isPaused) {
            statusEl.innerHTML = '<span class="w-2 h-2 bg-yellow-500 rounded-full"></span><span>Paused</span>';
        } else {
            statusEl.innerHTML = '<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span><span>Tracking</span>';
        }
    }
}

function renderDayView() {
    const container = document.getElementById('timelineGrid');
    const noDataMessage = document.getElementById('noDataMessage');
    if (!container) return;

    const hasData = Object.keys(state.trackedApps).length > 0 &&
        Object.values(state.trackedApps).some(app => app.sessions.length > 0);

    if (!hasData) {
        if (noDataMessage) noDataMessage.classList.remove('hidden');
        container.innerHTML = '';
        return;
    }

    if (noDataMessage) noDataMessage.classList.add('hidden');
    container.innerHTML = '';

    const hourHeight = 60 * state.zoomLevel;

    for (let hour = 0; hour < 24; hour++) {
        const hourDiv = document.createElement('div');
        hourDiv.className = 'timeline-hour flex items-start';
        hourDiv.style.height = `${hourHeight}px`;

        const label = document.createElement('div');
        label.className = 'w-16 text-xs text-muted-foreground pt-2 px-3 flex-shrink-0';
        label.textContent = `${hour.toString().padStart(2, '0')}:00`;
        hourDiv.appendChild(label);

        const activityContainer = document.createElement('div');
        activityContainer.className = 'flex-1 relative';

        const activities = getActivitiesForHour(hour);
        activities.forEach(activity => {
            const activityBlock = createActivityBlock(activity, hourHeight);
            if (activityBlock) activityContainer.appendChild(activityBlock);
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
    if (state.searchQuery && !activity.appName.toLowerCase().includes(state.searchQuery)) return null;
    
    const block = document.createElement('div');
    const isLight = state.theme === 'light';
    block.className = `activity-block absolute left-0 right-0 mx-2 ${isLight ? 'bg-blue-50 border-blue-300 text-gray-900' : 'bg-card border-accent text-foreground'} border rounded-lg p-2 flex items-center gap-2 cursor-pointer`;

    const hourStart = new Date(activity.start);
    hourStart.setMinutes(0, 0, 0);
    const minutesFromHourStart = (activity.start - hourStart.getTime()) / 1000 / 60;
    const durationMinutes = activity.duration / 60;

    const top = (minutesFromHourStart / 60) * hourHeight;
    const height = Math.max((durationMinutes / 60) * hourHeight, 28);

    block.style.top = `${top}px`;
    block.style.height = `${height}px`;

    if (activity.icon) {
        const icon = document.createElement('img');
        icon.className = 'w-6 h-6 rounded';
        icon.src = activity.icon;
        icon.alt = activity.appName;
        icon.onerror = () => { icon.style.display = 'none'; };
        block.appendChild(icon);
    } else {
        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.className = `w-6 h-6 rounded ${isLight ? 'bg-gray-200 text-gray-700' : 'bg-secondary text-foreground'} flex items-center justify-center text-xs font-bold`;
        iconPlaceholder.textContent = activity.appName.charAt(0).toUpperCase();
        block.appendChild(iconPlaceholder);
    }

    const info = document.createElement('div');
    info.className = 'flex-1 min-w-0';
    const name = document.createElement('div');
    name.className = 'text-xs font-medium truncate';
    name.textContent = activity.appName;
    info.appendChild(name);
    block.appendChild(info);

    if (height > 35) {
        const badge = document.createElement('div');
        badge.className = `text-xs ${isLight ? 'text-blue-600' : 'text-accent'} font-medium`;
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
        dayCard.className = 'bg-card border border-border rounded-xl p-4 min-h-[200px]';

        const header = document.createElement('div');
        header.className = 'text-sm font-semibold mb-3 pb-2 border-b border-border flex items-center justify-between';
        
        const dayLabel = document.createElement('span');
        dayLabel.textContent = dayName;
        header.appendChild(dayLabel);
        
        const dateLabel = document.createElement('span');
        dateLabel.className = 'text-xs text-muted-foreground';
        dateLabel.textContent = day.getDate();
        header.appendChild(dateLabel);
        
        dayCard.appendChild(header);

        const dayApps = getAppsForDay(day);
        const totalTime = Object.values(dayApps).reduce((sum, time) => sum + time, 0);

        if (totalTime > 0) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'text-lg font-bold mb-3';
            timeDiv.textContent = formatDuration(totalTime);
            dayCard.appendChild(timeDiv);

            const topApps = Object.entries(dayApps).sort(([, a], [, b]) => b - a).slice(0, 3);
            topApps.forEach(([appName, time]) => {
                const appDiv = document.createElement('div');
                appDiv.className = 'flex items-center gap-2 mb-2 text-xs';

                const dot = document.createElement('div');
                dot.className = 'w-2 h-2 rounded-full bg-accent flex-shrink-0';
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
        if (totalTime > 0) apps[appName] = totalTime;
    });

    return apps;
}

// Analytics
function updateAnalytics() {
    const apps = Object.entries(state.trackedApps);
    const totalTime = apps.reduce((sum, [, app]) => sum + (app.totalTime || 0), 0);
    
    const weeklyTimeEl = document.getElementById('weeklyTime');
    if (weeklyTimeEl) {
        const hours = Math.floor(totalTime / 3600);
        const minutes = Math.floor((totalTime % 3600) / 60);
        weeklyTimeEl.textContent = `${hours}h ${minutes}m`;
    }
    
    const dailyAvgEl = document.getElementById('dailyAverage');
    if (dailyAvgEl) {
        const avgSeconds = Math.round(totalTime / 7);
        const hours = Math.floor(avgSeconds / 3600);
        const minutes = Math.floor((avgSeconds % 3600) / 60);
        dailyAvgEl.textContent = `${hours}h ${minutes}m`;
    }
    
    const productiveDayEl = document.getElementById('productiveDay');
    if (productiveDayEl) {
        const today = new Date();
        productiveDayEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Top apps list
    const topAppsList = document.getElementById('topAppsList');
    if (topAppsList) {
        if (apps.length === 0) {
            topAppsList.innerHTML = '<p class="text-sm text-muted-foreground">No data available yet</p>';
        } else {
            const sorted = [...apps].sort(([, a], [, b]) => (b.totalTime || 0) - (a.totalTime || 0)).slice(0, 5);
            const maxTime = sorted[0]?.[1]?.totalTime || 1;
            
            topAppsList.innerHTML = sorted.map(([name, data]) => {
                const percentage = Math.round((data.totalTime / maxTime) * 100);
                return `
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-sm font-medium truncate">${name}</span>
                                <span class="text-xs text-muted-foreground">${formatDuration(data.totalTime)}</span>
                            </div>
                            <div class="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div class="h-full bg-accent rounded-full" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Utility Functions
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Data Persistence
function saveTrackingData() {
    if (!ipcRenderer) return;

    try {
        const dateKey = getDateKey(state.currentDate);
        const dataToSave = {
            date: dateKey,
            apps: state.trackedApps,
            savedAt: new Date().toISOString(),
            version: '1.0.0'
        };
        
        showSaveIndicator('saving');
        ipcRenderer.send('save-tracking-data', dataToSave);
        setTimeout(() => showSaveIndicator('saved'), 500);
    } catch (error) {
        console.error('Error saving tracking data:', error);
        showSaveIndicator('error');
    }
}

function showSaveIndicator(status) {
    const indicator = document.getElementById('saveIndicator');
    const statusText = document.getElementById('saveStatus');
    if (!indicator || !statusText) return;
    
    if (status === 'saving') {
        statusText.textContent = '💾 Saving...';
        indicator.style.opacity = '1';
    } else if (status === 'saved') {
        statusText.textContent = '✓ Saved';
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
    } else if (status === 'error') {
        statusText.textContent = '✗ Error';
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; }, 3000);
    }
}

function loadTrackingData() {
    if (!ipcRenderer) return;
    try {
        const dateKey = getDateKey(state.currentDate);
        ipcRenderer.send('load-tracking-data', dateKey);
    } catch (error) {
        console.error('Error loading tracking data:', error);
    }
}

function startAutoSave() {
    setInterval(() => {
        if (Object.keys(state.trackedApps).length > 0) saveTrackingData();
    }, 30000);
}

window.addEventListener('beforeunload', () => { saveTrackingData(); });

if (ipcRenderer) {
    ipcRenderer.on('tracking-data-loaded', (event, data) => {
        if (data) {
            state.trackedApps = data.apps || {};
            recalculateTotalTime();
            renderTimeline();
        }
    });
}

// Demo data
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
        },
        'Figma': {
            icon: null,
            sessions: [
                { start: today.getTime() + (16 * 3600000), end: today.getTime() + (17.5 * 3600000) }
            ],
            totalTime: 0
        }
    };

    recalculateTotalTime();
    renderTimeline();
}

// Settings Handlers
function initializeSettingsHandlers() {
    // Theme toggle in settings
    document.getElementById('settingsThemeToggle')?.addEventListener('click', function() {
        toggleTheme();
    });

    // Toggle switches
    document.getElementById('autoStartToggle')?.addEventListener('click', function() {
        this.classList.toggle('active');
        this.dataset.active = this.classList.contains('active');
        state.settings.autoStart = this.classList.contains('active');
        saveSettings();
    });

    document.getElementById('minimizeToTrayToggle')?.addEventListener('click', function() {
        this.classList.toggle('active');
        this.dataset.active = this.classList.contains('active');
        state.settings.minimizeToTray = this.classList.contains('active');
        saveSettings();
    });

    // Data management buttons
    document.getElementById('saveNow')?.addEventListener('click', () => {
        saveTrackingData();
        updateDataStats();
        showSaveIndicator('saved');
    });

    document.getElementById('openDataFolder')?.addEventListener('click', () => {
        if (ipcRenderer) ipcRenderer.invoke('open-data-directory');
    });

    document.getElementById('exportAllData')?.addEventListener('click', exportAllData);
    document.getElementById('importData')?.addEventListener('click', importFromCsv);
    document.getElementById('clearAllData')?.addEventListener('click', clearAllData);
}

function updateDataStats() {
    const appsCount = Object.keys(state.trackedApps).length;
    const totalSessions = Object.values(state.trackedApps).reduce((sum, app) => sum + (app.sessions?.length || 0), 0);
    
    const appsCountEl = document.getElementById('statsAppsCount');
    if (appsCountEl) appsCountEl.textContent = appsCount;
    
    const sessionsEl = document.getElementById('statsSessions');
    if (sessionsEl) sessionsEl.textContent = totalSessions;
    
    const lastSavedEl = document.getElementById('statsLastSaved');
    if (lastSavedEl) {
        if (state.lastUpdate) {
            const now = new Date();
            const lastUpdate = new Date(state.lastUpdate);
            const diffSeconds = Math.floor((now - lastUpdate) / 1000);
            
            if (diffSeconds < 60) lastSavedEl.textContent = 'Just now';
            else if (diffSeconds < 3600) lastSavedEl.textContent = `${Math.floor(diffSeconds / 60)}m ago`;
            else lastSavedEl.textContent = `${Math.floor(diffSeconds / 3600)}h ago`;
        } else {
            lastSavedEl.textContent = 'Never';
        }
    }
}

// Load/Save Settings
function loadSettings() {
    if (!ipcRenderer) {
        applyTheme();
        return;
    }
    
    ipcRenderer.invoke('load-settings').then(settings => {
        if (settings) {
            if (settings.theme) state.theme = settings.theme;
            if (settings.autoStart !== undefined) state.settings.autoStart = settings.autoStart;
            if (settings.minimizeToTray !== undefined) state.settings.minimizeToTray = settings.minimizeToTray;
        }
        applyTheme();
        
        // Update toggle states
        const autoStartToggle = document.getElementById('autoStartToggle');
        if (autoStartToggle) {
            if (state.settings.autoStart) autoStartToggle.classList.add('active');
            else autoStartToggle.classList.remove('active');
        }
        
        const minimizeToggle = document.getElementById('minimizeToTrayToggle');
        if (minimizeToggle) {
            if (state.settings.minimizeToTray) minimizeToggle.classList.add('active');
            else minimizeToggle.classList.remove('active');
        }
    });
}

function saveSettings() {
    if (!ipcRenderer) return;
    ipcRenderer.send('save-settings', {
        theme: state.theme,
        autoStart: state.settings.autoStart,
        minimizeToTray: state.settings.minimizeToTray
    });
}

// Export/Import
function exportAllData() {
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
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticklo-export-${getDateKey(state.currentDate)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

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
                const lines = csv.split('\n').slice(1);
                
                lines.forEach(line => {
                    if (!line.trim()) return;
                    const match = line.match(/"([^"]+)","([^"]+)","([^"]+)",(\d+)/);
                    if (!match) return;
                    
                    const [, appName, start, end] = match;
                    if (!state.trackedApps[appName]) {
                        state.trackedApps[appName] = { icon: null, sessions: [], totalTime: 0 };
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

function clearAllData() {
    if (!confirm('Are you sure you want to clear ALL tracking data? This cannot be undone!')) return;
    if (!confirm('This will permanently delete all your activity history. Continue?')) return;

    state.trackedApps = {};
    saveTrackingData();
    renderTimeline();
    alert('All data cleared successfully');
}

// FAQ Accordion
function initializeFAQ() {
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            item.classList.toggle('open');
        });
    });
}
