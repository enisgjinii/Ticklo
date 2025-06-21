# Ticklo Activity Tracker

<div align="center">

![Ticklo Logo](https://via.placeholder.com/200x200/1a1a2e/ffffff?text=Ticklo)

**A beautiful, intelligent time tracking application that helps you understand your daily workflow**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/yourusername/ticklo)
[![Electron](https://img.shields.io/badge/Electron-27.0.0+-green.svg)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-orange.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/badge/Downloads-1k+-brightgreen.svg)](https://github.com/yourusername/ticklo/releases)
[![Stars](https://img.shields.io/badge/Stars-50+-yellow.svg)](https://github.com/yourusername/ticklo/stargazers)

*Built with Electron and powered by intelligent auto-categorization*

</div>

## ⚡ Quick Start

```bash
# Clone and run in 3 steps
git clone https://github.com/yourusername/ticklo.git
cd ticklo && npm install
npm start
```

**🎯 What you'll get:**
- Automatic activity tracking in the background
- Intelligent app categorization (productive/break/distracted)
- Beautiful timeline visualization
- System tray integration for always-on monitoring

## 📋 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10, macOS 10.14, Ubuntu 18.04 | Latest stable versions |
| **Node.js** | v16.0.0 | v18.0.0+ |
| **RAM** | 2 GB | 4 GB+ |
| **Storage** | 100 MB | 500 MB+ |
| **Display** | 1024x768 | 1920x1080+ |

## 🚀 Features

### 🎯 Core Functionality
- **🔄 Automatic Activity Tracking**: Monitors your active windows and applications in real-time
- **📊 Visual Timeline**: See your entire day at a glance with an intuitive timeline interface
- **📈 Productivity Insights**: Track productive, break, and distracted time with beautiful charts
- **✏️ Manual Time Entry**: Add activities manually when needed
- **🖥️ System Tray Integration**: Runs in the background, always available from your system tray
- **🎨 Modern UI**: Clean, responsive interface with collapsible sidebar and smooth animations

### 🤖 Intelligent Auto-Categorization
- **🧠 Smart Pattern Recognition**: Automatically detects development tools, design software, and productivity apps
- **🌐 Browser Intelligence**: Analyzes website URLs and page titles for accurate categorization
- **⏰ Contextual Awareness**: Adjusts categorization based on work hours vs. personal time
- **🎓 Machine Learning**: Learns from your manual corrections to improve accuracy over time
- **🎯 Confidence Scoring**: Shows how certain the AI is about each categorization

### 🧩 Modular Architecture
- **📁 Component-Based**: PHP-like include/require system for maintainable code
- **⚡ Dynamic Loading**: Components loaded on-demand with intelligent caching
- **🔄 Template System**: Support for template variables and conditional loading
- **🎨 Reusable Components**: Modular design for easy customization and extension

### 🎮 Advanced Controls
- **🔍 Zoom Controls**: Zoom in/out of your timeline for detailed or overview analysis
- **🎯 Goal Tracking**: Set daily productivity goals and track your progress
- **📱 Cross-Platform**: Works seamlessly on Windows, macOS, and Linux
- **⚙️ Customizable**: Extensive settings for personalization

## 📸 Screenshots

<div align="center">

![Main Interface](https://via.placeholder.com/800x500/1a1a2e/ffffff?text=Main+Interface)
![Timeline View](https://via.placeholder.com/800x500/2d3436/ffffff?text=Timeline+View)
![Settings Panel](https://via.placeholder.com/800x500/636e72/ffffff?text=Settings+Panel)

</div>

## 🛠️ Installation

### Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** (for cloning)

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ticklo.git
   cd ticklo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add custom icons** (Optional):
   - Add your `icon.png` (512x512px) to `src/assets/`
   - Add your `tray-icon.png` (16x16px or 32x32px) to `src/assets/`

4. **Launch the application**:
   ```bash
   npm start
   ```

### Development Mode

For development with hot reloading:
```bash
npm run dev
```

### Building for Distribution

Build for your current platform:
```bash
npm run build
```

Build for all platforms:
```bash
npm run dist
```

## 🎯 Usage Guide

### Getting Started

1. **🚀 Launch Ticklo**: Start the app and it automatically begins tracking your activities
2. **🖥️ System Tray**: The app minimizes to your system tray for continuous background tracking
3. **📊 Timeline View**: View your daily activities in a beautiful timeline format
4. **🧭 Navigation**: Use the collapsible sidebar to navigate between different sections

### Interface Overview

#### 🧭 Sidebar Navigation
- **📊 Timeline**: Main view showing your daily activity timeline
- **⚙️ Settings**: Customize tracking preferences and app categories
- **📈 Analytics**: Detailed productivity insights and reports
- **📝 Activities**: Manage and edit your activity entries
- **🏷️ Categories**: Configure app categorization rules
- **ℹ️ About**: Information about the application

#### 📊 Timeline Features
- **📅 Day/Week View**: Switch between daily and weekly views
- **🔍 Zoom Controls**: Zoom in/out for detailed analysis
- **📦 Activity Blocks**: Visual representation with duration and app info
- **📈 Right Sidebar**: Daily stats, productivity progress, and most-used apps

#### 🛠️ Toolbar Controls
- **🔍+ Zoom In**: Increase timeline detail
- **🔍- Zoom Out**: Decrease timeline detail  
- **ℹ️ Info**: Show timeline information
- **➕ Add**: Manually add an activity
- **🔄 Refresh**: Refresh activity data
- **🗑️ Delete**: Delete selected activities

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Plus` | Zoom in |
| `Ctrl/Cmd + Minus` | Zoom out |
| `Ctrl/Cmd + R` | Refresh data |
| `Ctrl/Cmd + N` | Add new activity |
| `Delete/Backspace` | Delete selected activities |
| `Escape` | Close modals |

### ⚙️ Settings Configuration

#### General Settings
- **🚀 Auto Start**: Automatically start tracking when the app launches
- **🖥️ Minimize to Tray**: Minimize to system tray instead of closing
- **🔔 Show Notifications**: Display notifications for important events
- **🤖 Auto Categorization**: Enable intelligent app categorization

#### Productivity Goals
- **📊 Daily Goal**: Set your daily productivity target (in hours)
- **⏰ Break Reminder**: Set reminder intervals for breaks (in minutes)
- **🎯 Focus Sessions**: Configure focus session duration and breaks

#### App Categories
Customize how applications are categorized:

**Productive** (Green `#00ff88`):
- Development tools (VS Code, IntelliJ, GitHub)
- Design software (Photoshop, Figma, Blender)
- Productivity apps (Office Suite, Notion, Trello)

**Break** (Orange `#ffa502`):
- Communication tools (Slack, Teams, Zoom)
- Browsers (Chrome, Firefox, Safari)
- Casual applications (Spotify, news sites)

**Distracted** (Red `#ff4757`):
- Social media (Facebook, Instagram, Twitter)
- Entertainment (YouTube, Netflix, games)
- Time-wasting applications

## 🧠 Auto-Categorization System

Ticklo features an intelligent auto-categorization system that learns from your usage patterns:

### How It Works

1. **🎯 Pattern Recognition**: Analyzes app names, window titles, and URLs
2. **🧠 Machine Learning**: Improves accuracy based on your corrections
3. **⏰ Context Awareness**: Considers time of day and session duration
4. **🎓 User Training**: Learns from manual category overrides

### Example Categorizations

```javascript
// High Confidence (90%+)
"Visual Studio Code" → productive (95% confidence)
"YouTube" → distracted (98% confidence)
"Notion" → productive (92% confidence)

// Medium Confidence (70-89%)
"Slack" → break (85% confidence)
"news.ycombinator.com" → break (78% confidence)
"Spotify" → break (82% confidence)
```

### Training the System

```javascript
// The system learns from your corrections
state.autoCategorizer.learnFromUser("Teams", "productive", "break");

// Check categorization confidence
const app = "GitHub Desktop";
const category = state.autoCategorizer.categorizeApp(app);
const confidence = state.autoCategorizer.getCategoryConfidence(app);
console.log(`${app} → ${category} (${(confidence * 100).toFixed(1)}% confidence)`);
```

## 🧩 Modular Component System

Ticklo uses a PHP-like component system for maintainable code:

### Component Loading

```javascript
// Basic component loading
await ComponentLoader.include('sidebar', '#sidebarContainer');
await ComponentLoader.include('dashboard', '#pageContainer');

// PHP-like functions
await ComponentLoader.require('settings', '#pageContainer'); // Fails if not found
await ComponentLoader.includeOnce('modal', '#modalContainer'); // Load only once

// With template variables
await ComponentLoader.includeWithVars('greeting', '#header', {
    username: 'John',
    timestamp: new Date().toISOString()
});
```

### Component Structure

```
src/renderer/components/
├── sidebar.html          # Main navigation sidebar
├── dashboard.html        # Dashboard page content
├── timeline.html         # Timeline visualization
├── settings.html         # Settings page
├── modal-add-activity.html # Add activity modal
├── analytics.html        # Analytics and reports
├── activities.html       # Activity management
└── categories.html       # Category configuration
```

## 🎨 Customization

### Adding Custom App Categories

Modify the `appCategories` object in `src/renderer/renderer.js`:

```javascript
let appCategories = {
    'Your App Name': { category: 'productive', color: '#00ff88' },
    'Custom Tool': { category: 'break', color: '#ffa502' },
    // Add more apps here
};
```

### Color Themes

Customize colors in `src/renderer/styles.css`:

```css
:root {
    --productive-color: #00ff88;    /* Green */
    --break-color: #ffa502;         /* Orange */
    --distracted-color: #ff4757;    /* Red */
    --accent-color: #00d4ff;        /* Blue */
    --background-color: #1a1a2e;    /* Dark background */
    --text-color: #ffffff;          /* White text */
}
```

### Component Customization

Create custom components in the `components/` directory:

```html
<!-- custom-widget.html -->
<div class="custom-widget">
    <h3>{{title}}</h3>
    <p>{{description}}</p>
    <div class="widget-content">
        <!-- Your custom content -->
    </div>
</div>
```

## 🔧 Development

### Project Structure

```
Ticklo/
├── src/
│   ├── main.js                 # Electron main process
│   ├── assets/                 # Icons and images
│   └── renderer/               # Frontend application
│       ├── components/         # Modular HTML components
│       ├── auto-categorizer.js # AI categorization system
│       ├── component-loader.js # Component loading system
│       ├── modal-manager.js    # Modal management
│       ├── renderer.js         # Main renderer logic
│       ├── styles.css          # Application styles
│       └── index.html          # Main HTML file
├── package.json               # Dependencies and scripts
├── README.md                  # This file
├── FEATURES.md               # Detailed feature documentation
└── example-usage.md          # Usage examples
```

### Development Scripts

```bash
# Start development server
npm run dev

# Build for distribution
npm run build

# Package application
npm run pack

# Create distributable
npm run dist
```

### Debugging

Enable debug mode for detailed logging:

```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');

// Check auto categorizer status
console.log('Auto categorizer patterns:', state.autoCategorizer.exportUserPatterns());

// Debug component loading
console.log('Component status:', window.getComponentLoaderStatus());
```

## 🐛 Troubleshooting

### Common Issues

#### App Not Tracking Activities
- ✅ Ensure the app has necessary permissions
- ✅ Check if tracking is enabled (green indicator in sidebar)
- ✅ Restart the application
- ✅ Verify system tray icon is visible

#### Activities Not Showing
- ✅ Click the refresh button
- ✅ Check if you're viewing the correct date/time range
- ✅ Ensure activities are within the last 24 hours
- ✅ Clear browser cache if using web version

#### Performance Issues
- ✅ Close unnecessary applications
- ✅ Reduce zoom level if timeline is slow
- ✅ Clear old data if needed
- ✅ Check system resources

### Platform-Specific Setup

#### macOS
1. Go to **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **"Accessibility"** from the left sidebar
3. Click the lock icon and enter your password
4. Add **Ticklo** to the list of allowed applications

#### Windows
- The app should work out of the box
- If you encounter issues, try running as administrator
- Ensure Windows Defender doesn't block the application

#### Linux
- May require additional permissions for window monitoring
- Check if your desktop environment supports system tray icons
- Install required dependencies: `sudo apt-get install libgtk-3-dev`

### Getting Help

1. **📖 Check Documentation**: Review `FEATURES.md` and `example-usage.md`
2. **🐛 Search Issues**: Look for similar problems in the GitHub issues
3. **💬 Community**: Join our Discord/community for support
4. **📧 Contact**: Reach out to the maintainers for direct support

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Create** a feature branch: `git checkout -b feature/amazing-feature`
5. **Make** your changes
6. **Test** thoroughly
7. **Commit** with clear messages: `git commit -m 'Add amazing feature'`
8. **Push** to your branch: `git push origin feature/amazing-feature`
9. **Submit** a pull request

### Contribution Guidelines

- **🎯 Focus**: Keep changes focused and well-documented
- **🧪 Testing**: Test your changes on multiple platforms
- **📝 Documentation**: Update documentation for new features
- **🎨 Style**: Follow existing code style and conventions
- **🔒 Security**: Ensure no security vulnerabilities are introduced

### Areas for Contribution

- **🐛 Bug Fixes**: Help fix reported issues
- **✨ New Features**: Add requested functionality
- **📱 Platform Support**: Improve cross-platform compatibility
- **🎨 UI/UX**: Enhance the user interface
- **📊 Analytics**: Add new insights and reports
- **🤖 AI**: Improve auto-categorization accuracy

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Ticklo Activity Tracker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- **Electron Team**: For the amazing cross-platform framework
- **get-windows Package**: For reliable window monitoring
- **Chart.js**: For beautiful data visualization
- **Community Contributors**: For feedback, bug reports, and contributions

## 📞 Support & Contact

- **🌐 Website**: [ticklo.app](https://ticklo.app)
- **📧 Email**: support@ticklo.app
- **🐦 Twitter**: [@ticklo_app](https://twitter.com/ticklo_app)
- **💬 Discord**: [Join our community](https://discord.gg/ticklo)
- **📖 Documentation**: [docs.ticklo.app](https://docs.ticklo.app)

---

<div align="center">

**Made with ❤️ by the Ticklo Team**

*Empowering productivity through intelligent time tracking*

[⭐ Star on GitHub](https://github.com/yourusername/ticklo) • [📥 Download](https://github.com/yourusername/ticklo/releases) • [🐛 Report Issues](https://github.com/yourusername/ticklo/issues)

</div> 