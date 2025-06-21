# Example Usage Guide

## Quick Start with Both Features

### 1. Auto Categorization Example

```javascript
// Enable auto categorization
state.settings.autoCategory = true;

// The system will automatically categorize new apps:
// "Visual Studio Code" → productive (90% confidence)
// "YouTube" → distracted (98% confidence)
// "Slack" → break (85% confidence)

// Check categorization confidence
const app = "GitHub Desktop";
const category = state.autoCategorizer.categorizeApp(app);
const confidence = state.autoCategorizer.getCategoryConfidence(app);
console.log(`${app} → ${category} (${(confidence * 100).toFixed(1)}% confidence)`);

// Learn from user corrections
state.autoCategorizer.learnFromUser("Teams", "productive", "break");
```

### 2. Modular HTML Example

```javascript
// Load components dynamically
const loader = window.ComponentLoader;

// Basic component loading
await loader.include('sidebar', '#sidebarContainer');
await loader.include('dashboard', '#pageContainer');

// PHP-like usage
await loader.require('settings', '#pageContainer'); // Fails if not found
await loader.includeOnce('modal', '#modalContainer'); // Load only once

// Conditional loading
await loader.includeIf(user.isAdmin, 'admin-panel', '#adminContainer');

// With template variables
await loader.includeWithVars('user-greeting', '#header', {
    username: 'John Doe',
    lastLogin: new Date().toISOString()
});

// Preload for performance
await loader.preloadComponents(['timeline', 'analytics', 'categories']);
```

### 3. Complete Integration Example

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Starting Ticklo with enhanced features...');
        
        // 1. Initialize component system
        const loader = window.ComponentLoader;
        loader.setComponentsPath('./components/');
        
        // 2. Load essential UI components
        await loader.include('sidebar', '#sidebarContainer');
        await loader.include('dashboard', '#pageContainer');
        await loader.include('modal-add-activity', '#modalContainer');
        
        // 3. Initialize app with auto categorization
        await window.initializeApp();
        
        // 4. Enable auto categorization if not already enabled
        if (!state.settings.autoCategory) {
            state.settings.autoCategory = true;
            await saveSettings();
            console.log('🤖 Auto categorization enabled');
        }
        
        // 5. Preload other components for smooth navigation
        await loader.preloadComponents([
            'timeline', 'analytics', 'activities', 'categories', 'settings'
        ]);
        
        console.log('✅ Enhanced Ticklo initialization complete!');
        
        // Show welcome message with auto categorization info
        showToast('Enhanced Ticklo loaded with AI categorization & modular UI!', 'success');
        
    } catch (error) {
        console.error('❌ Enhanced initialization failed:', error);
        showToast('Failed to load enhanced features', 'error');
    }
});

// Enhanced navigation with component loading
document.addEventListener('click', async (e) => {
    const navLink = e.target.closest('[data-page]');
    if (navLink) {
        e.preventDefault();
        
        const pageName = navLink.dataset.page;
        const loader = window.ComponentLoader;
        
        // Show loading indicator
        const pageContainer = document.getElementById('pageContainer');
        pageContainer.innerHTML = '<div class="loading">Loading...</div>';
        
        try {
            // Load page component
            await loader.include(pageName, '#pageContainer');
            
            // Update navigation state
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link === navLink);
            });
            
            // Update app state
            window.updateCurrentPage(pageName);
            
            console.log(`📄 Navigated to: ${pageName}`);
            
        } catch (error) {
            console.error(`❌ Failed to load page: ${pageName}`, error);
            pageContainer.innerHTML = `
                <div class="error-state">
                    <h3>Page Load Error</h3>
                    <p>Could not load ${pageName} page.</p>
                    <button onclick="location.reload()" class="btn btn-primary">Refresh</button>
                </div>
            `;
        }
    }
});

// Auto categorization training example
document.addEventListener('activityAdded', (event) => {
    const activity = event.detail;
    
    // If user manually sets category different from auto categorization
    if (activity.manualCategory && activity.autoCategory !== activity.manualCategory) {
        // Train the auto categorizer
        state.autoCategorizer.learnFromUser(
            activity.app, 
            activity.manualCategory, 
            activity.autoCategory
        );
        
        console.log(`🎓 Auto categorizer learned: ${activity.app} → ${activity.manualCategory}`);
        showToast(`Learned: ${activity.app} should be ${activity.manualCategory}`, 'info');
    }
});
```

### 4. Component Structure Example

```
src/renderer/
├── components/
│   ├── sidebar.html          # ✅ Navigation sidebar
│   ├── dashboard.html        # ✅ Main dashboard
│   ├── timeline.html         # ✅ Timeline view
│   ├── settings.html         # ✅ Settings page
│   ├── modal-add-activity.html # ✅ Add activity modal
│   ├── analytics.html        # 📝 Analytics page
│   ├── activities.html       # 📝 Activities management
│   └── categories.html       # 📝 Category management
├── component-loader.js       # ✅ Component system
├── auto-categorizer.js       # ✅ AI categorization
├── renderer.js              # ✅ Enhanced main logic
├── index.html               # 📝 Original monolithic
└── index-modular.html       # ✅ New modular version
```

### 5. Development Tips

```javascript
// Debug auto categorization
console.log('Auto categorizer status:', state.autoCategorizer.exportUserPatterns());

// Debug component loading
console.log('Component status:', window.getComponentLoaderStatus());

// Test categorization
const testApps = ['Chrome', 'VS Code', 'Instagram', 'Notion'];
testApps.forEach(app => {
    const category = state.autoCategorizer.categorizeApp(app);
    const confidence = state.autoCategorizer.getCategoryConfidence(app);
    console.log(`${app}: ${category} (${(confidence * 100).toFixed(1)}%)`);
});

// Reload a component during development
await ComponentLoader.reloadComponent('dashboard', '#pageContainer');

// Clear component cache
ComponentLoader.clearCache();
```

## Benefits Summary

### Auto Categorization
- 🤖 **Intelligent**: Recognizes 100+ app patterns
- 🎯 **Contextual**: Analyzes URLs and window titles
- 🧠 **Learning**: Improves from user feedback
- ⏰ **Time-aware**: Adjusts based on work hours
- 🎯 **Confident**: Shows accuracy scores

### Modular HTML
- 🧩 **Organized**: Separate files for each component
- ⚡ **Fast**: Cached loading and preloading
- 🔄 **Dynamic**: PHP-like include/require functions
- 🎨 **Template**: Variable replacement system
- 🛠️ **Maintainable**: Easy to modify individual components

Both systems work seamlessly together to provide a modern, intelligent, and maintainable time tracking experience! 