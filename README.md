# Ticklo Activity Tracker

A beautiful, intuitive time tracking application that helps you understand your daily workflow. Built with Electron and powered by the `get-windows` package for automatic activity detection.

![Ticklo Preview](https://via.placeholder.com/800x500/1a1a2e/ffffff?text=Ticklo+Activity+Tracker)

## Features

- **Automatic Activity Tracking**: Monitors your active windows and applications automatically
- **Visual Timeline**: See your entire day at a glance with an intuitive timeline interface
- **Productivity Insights**: Track productive, break, and distracted time with beautiful charts
- **Manual Time Entry**: Add activities manually when needed
- **System Tray Integration**: Runs in the background, always available from your system tray
- **Collapsible Sidebar**: Clean, modern interface with expandable navigation
- **Zoom Controls**: Zoom in/out of your timeline for detailed or overview analysis
- **Goal Tracking**: Set daily productivity goals and track your progress
- **App Categorization**: Automatically categorizes applications into productive, break, or distracted time
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Steps

1. **Clone or Download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add Icons** (Optional):
   - Add your `icon.png` (512x512px) to `src/assets/`
   - Add your `tray-icon.png` (16x16px or 32x32px) to `src/assets/`

4. **Run the application**:
   ```bash
   npm start
   ```

## Development

To run in development mode:
```bash
npm run dev
```

To build for distribution:
```bash
npm run build
```

## Usage

### Getting Started

1. **Launch the App**: Start Ticklo and it will automatically begin tracking your activities
2. **System Tray**: The app minimizes to your system tray for continuous background tracking
3. **Timeline View**: View your daily activities in a beautiful timeline format
4. **Sidebar Navigation**: Use the collapsible sidebar to navigate between different sections

### Interface Overview

#### Sidebar
- **Timeline**: Main view showing your daily activity timeline
- **Settings**: Customize tracking preferences and app categories
- **About**: Information about the application
- **FAQ**: Common questions and answers

#### Timeline Features
- **Day/Week View**: Switch between daily and weekly views
- **Zoom Controls**: Zoom in/out for detailed analysis
- **Activity Blocks**: Visual representation of your activities with duration and app info
- **Right Sidebar**: Shows daily stats, productivity progress, and most-used apps

#### Toolbar Controls
- **🔍+ Zoom In**: Increase timeline detail
- **🔍- Zoom Out**: Decrease timeline detail  
- **ℹ️ Info**: Show timeline information
- **➕ Add**: Manually add an activity
- **🔄 Refresh**: Refresh activity data
- **🗑️ Delete**: Delete selected activities

### Keyboard Shortcuts

- **Ctrl/Cmd + Plus**: Zoom in
- **Ctrl/Cmd + Minus**: Zoom out
- **Ctrl/Cmd + R**: Refresh data
- **Ctrl/Cmd + N**: Add new activity
- **Delete/Backspace**: Delete selected activities
- **Escape**: Close modals

### Settings

#### General Settings
- **Auto Start**: Automatically start tracking when the app launches
- **Minimize to Tray**: Minimize to system tray instead of closing
- **Show Notifications**: Display notifications for important events

#### Productivity Goals
- **Daily Goal**: Set your daily productivity target (in hours)
- **Break Reminder**: Set reminder intervals for breaks (in minutes)

#### App Categories
Customize how applications are categorized:
- **Productive**: Development tools, work applications
- **Break**: Browsers, casual applications
- **Distracted**: Social media, entertainment applications

### Privacy & Data

- **Local Storage**: All data is stored locally on your computer
- **No Cloud Sync**: Your data never leaves your device
- **Secure**: Uses the `get-windows` package for safe, system-level window monitoring

## Customization

### Adding Custom App Categories

You can modify the `appCategories` object in `src/renderer/renderer.js` to customize how apps are categorized:

```javascript
let appCategories = {
    'Your App Name': { category: 'productive', color: '#00ff88' },
    // Add more apps here
};
```

### Color Themes

Colors can be customized in `src/renderer/styles.css`:
- **Productive**: `#00ff88` (Green)
- **Break**: `#ffa502` (Orange)  
- **Distracted**: `#ff4757` (Red)
- **Accent**: `#00d4ff` (Blue)

## Troubleshooting

### Common Issues

1. **App not tracking activities**:
   - Ensure the app has necessary permissions
   - Check if tracking is enabled (green indicator in sidebar)
   - Restart the application

2. **Activities not showing**:
   - Click the refresh button
   - Check if you're viewing the correct date/time range
   - Ensure activities are within the last 24 hours

3. **Performance issues**:
   - Close unnecessary applications
   - Reduce zoom level if timeline is slow
   - Clear old data if needed

### macOS Specific

On macOS, you may need to grant accessibility permissions:
1. Go to System Preferences > Security & Privacy > Privacy
2. Select "Accessibility" from the left sidebar
3. Click the lock icon and enter your password
4. Add Ticklo to the list of allowed applications

### Windows Specific

On Windows, the app should work out of the box. If you encounter issues, try running as administrator.

## Building for Distribution

### All Platforms
```bash
npm run dist
```

### Specific Platform
```bash
# Windows
npm run build -- --win

# macOS
npm run build -- --mac

# Linux
npm run build -- --linux
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

- Built with [Electron](https://electronjs.org/)
- Activity tracking powered by [get-windows](https://github.com/sindresorhus/get-windows)
- Icons by [Font Awesome](https://fontawesome.com/)
- UI inspired by modern productivity applications

## Support

If you encounter any issues or have questions:
1. Check the FAQ section in the app
2. Review this README
3. Create an issue on the project repository

---

**Enjoy tracking your productivity with Ticklo! 🚀** 