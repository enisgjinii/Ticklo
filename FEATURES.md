# Ticklo - New Features Documentation

## 🤖 Auto Categorization System

The app now includes an intelligent auto categorization system that automatically classifies applications into productive, break, or distracted categories.

### Features

#### Smart Pattern Recognition
- **Development Tools**: Automatically detects coding environments (VS Code, IntelliJ, GitHub, etc.)
- **Design Software**: Recognizes creative tools (Photoshop, Figma, Blender, etc.)
- **Productivity Apps**: Identifies work-related software (Office Suite, Notion, Trello, etc.)
- **Communication**: Categorizes team tools (Slack, Teams, Zoom, etc.)
- **Entertainment**: Detects time-wasting apps (YouTube, Netflix, games, social media)

#### Contextual Intelligence
- **Browser Detection**: Analyzes website URLs and page titles for accurate categorization
- **Time-based Rules**: Adjusts categorization based on work hours vs. personal time
- **Session Analysis**: Rewards long focused sessions with better productivity scores
- **Confidence Scoring**: Shows how certain the AI is about each categorization

#### Machine Learning
- **User Feedback**: Learns from manual category corrections
- **Pattern Evolution**: Improves accuracy over time based on usage patterns
- **Similarity Matching**: Uses advanced algorithms to categorize new applications
- **High Confidence Auto-Add**: Automatically adds confident categorizations to manual categories

### Usage

1. **Enable Auto Categorization**: Go to Settings → General → Enable "Auto categorization"
2. **Manual Override**: User-defined categories always take precedence
3. **Training**: Correct wrong categorizations to improve future accuracy
4. **Confidence Levels**: Check debug console to see AI confidence scores

### Example Categorizations

```javascript
// Productive
"Visual Studio Code" → productive (confidence: 95%)
"github.com" → productive (confidence: 88%)
"Notion" → productive (confidence: 92%)

// Break
"Slack" → break (confidence: 85%)
"news.ycombinator.com" → break (confidence: 78%)
"Spotify" → break (confidence: 82%)

// Distracted
"YouTube" → distracted (confidence: 98%)
"Facebook" → distracted (confidence: 96%)
"Instagram" → distracted (confidence: 94%)
```

---

## 🧩 Modular HTML System (PHP-like Includes)

The app now supports a component-based architecture similar to PHP includes/requires, making the codebase more maintainable and modular.

### Features

#### Component System
- **Separate Files**: Each page/component in its own HTML file
- **Dynamic Loading**: Components loaded on-demand via fetch API
- **Caching**: Intelligent caching system for performance
- **Error Handling**: Graceful fallbacks for missing components

#### PHP-like Functions
```javascript
// Include a component (like PHP include())
await ComponentLoader.include('sidebar', '#sidebarContainer');

// Require a component (fails if not found, like PHP require())
await ComponentLoader.require('dashboard', '#pageContainer');

// Include once (like PHP include_once())
await ComponentLoader.includeOnce('modal', '#modalContainer');

// Conditional include
await ComponentLoader.includeIf(user.isLoggedIn, 'user-menu', '#menuContainer');

// Include with variables (template system)
await ComponentLoader.includeWithVars('greeting', '#header', {
    username: 'John',
    timestamp: new Date().toISOString()
});
```

#### Template Variables
Components support template variables using `{{variable}}` syntax:

```html
<!-- greeting.html -->
<div class="greeting">
    <h1>Hello, {{username}}!</h1>
    <p>Last login: {{timestamp}}</p>
</div>
```

### Component Structure

```
src/renderer/components/
├── sidebar.html          # Main navigation sidebar
├── dashboard.html        # Dashboard page content
├── timeline.html         # Timeline visualization
├── settings.html         # Settings page
├── modal-add-activity.html # Add activity modal
└── ...
```

### Usage Examples

#### Basic Component Loading
```javascript
// Load sidebar into container
await ComponentLoader.include('sidebar', '#sidebarContainer');

// Navigate to different pages
document.addEventListener('click', async (e) => {
    const navLink = e.target.closest('[data-page]');
    if (navLink) {
        const pageName = navLink.dataset.page;
        await ComponentLoader.include(pageName, '#pageContainer');
    }
});
```

#### Advanced Features
```javascript
// Preload components in parallel
await ComponentLoader.preloadComponents([
    'dashboard', 'timeline', 'settings', 'analytics'
]);

// Create layouts with sections
const layoutHTML = await ComponentLoader.createLayout('main-layout', {
    sidebar: 'sidebar',
    content: 'dashboard',
    modal: 'modal-add-activity'
});

// Reload a component (clears cache)
await ComponentLoader.reloadComponent('dashboard', '#pageContainer');

// Check component info
const info = ComponentLoader.getComponentInfo();
console.log('Cached components:', info.cachedComponents);
```

#### Event System
```javascript
// Listen for component load events
document.addEventListener('componentIncluded', (e) => {
    const { component, target } = e.detail;
    console.log(`Component '${component}' loaded into '${target}'`);
    
    // Re-initialize event listeners for new component
    reinitializeEventListeners();
});
```

### Benefits

1. **Better Organization**: Each page/component in separate files
2. **Faster Navigation**: Components cached and loaded instantly
3. **Easier Maintenance**: Modify components independently
4. **Reusability**: Components can be used in multiple places
5. **Performance**: Only load components when needed
6. **PHP-like Familiarity**: Similar to PHP include/require patterns

### Migration Guide

To use the modular system:

1. **Replace index.html**: Use `index-modular.html` as your main file
2. **Component Structure**: Move page content to `components/` directory
3. **Update Scripts**: Include `component-loader.js` before other scripts
4. **Initialize**: Call component loading in your initialization code

```javascript
// Initialize modular app
document.addEventListener('DOMContentLoaded', async () => {
    // Load essential components
    await ComponentLoader.include('sidebar', '#sidebarContainer');
    await ComponentLoader.include('dashboard', '#pageContainer');
    
    // Preload other components
    await ComponentLoader.preloadComponents([
        'timeline', 'settings', 'analytics'
    ]);
});
```

---

## 🚀 Getting Started

### Auto Categorization
1. Enable in Settings → Auto categorization
2. Start tracking activities
3. Check debug console for AI confidence scores
4. Correct any wrong categorizations to improve accuracy

### Modular HTML
1. Use `index-modular.html` as your main file
2. Components are automatically loaded from `components/` directory
3. Navigation between pages loads components dynamically
4. Check browser console for component loading status

### Example Implementation

```javascript
// Complete initialization with both features
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize component system
    await ComponentLoader.include('sidebar', '#sidebarContainer');
    await ComponentLoader.include('dashboard', '#pageContainer');
    
    // Initialize auto categorizer
    if (state.settings.autoCategory) {
        console.log('🤖 Auto categorization enabled');
    }
    
    // Start the app
    initializeApp();
});
```

Both features work seamlessly together to provide a modern, intelligent, and maintainable time tracking application! 