// Auto Categorization System for Applications
class AutoCategorizer {
    constructor() {
        // Comprehensive app database with patterns and keywords
        this.productivePatterns = [
            // Development
            { keywords: ['code', 'studio', 'intellij', 'webstorm', 'pycharm', 'atom', 'sublime', 'vim', 'emacs', 'notepad++'], weight: 10 },
            { keywords: ['git', 'github', 'gitlab', 'bitbucket', 'sourcetree'], weight: 9 },
            { keywords: ['terminal', 'cmd', 'powershell', 'bash', 'console', 'command'], weight: 8 },
            { keywords: ['docker', 'kubernetes', 'postman', 'insomnia'], weight: 9 },
            
            // Design & Creative
            { keywords: ['photoshop', 'illustrator', 'figma', 'sketch', 'canva', 'gimp', 'blender'], weight: 8 },
            { keywords: ['premiere', 'after effects', 'davinci', 'obs', 'camtasia'], weight: 8 },
            
            // Productivity
            { keywords: ['word', 'excel', 'powerpoint', 'outlook', 'onenote', 'notion', 'obsidian'], weight: 7 },
            { keywords: ['jira', 'confluence', 'trello', 'asana', 'monday', 'clickup'], weight: 8 },
            { keywords: ['calculator', 'calendar', 'notepad', 'notes', 'reminder'], weight: 6 },
            
            // Data & Analysis
            { keywords: ['tableau', 'power bi', 'excel', 'stata', 'spss', 'matlab', 'rstudio'], weight: 9 },
            { keywords: ['database', 'mysql', 'postgres', 'mongodb', 'redis'], weight: 8 },
            
            // System & Utilities
            { keywords: ['task manager', 'activity monitor', 'system preferences', 'control panel'], weight: 5 }
        ];

        this.breakPatterns = [
            // Communication
            { keywords: ['slack', 'teams', 'zoom', 'skype', 'discord', 'telegram', 'whatsapp'], weight: 7 },
            { keywords: ['email', 'gmail', 'outlook', 'mail'], weight: 6 },
            
            // Browsers (contextual)
            { keywords: ['chrome', 'firefox', 'safari', 'edge', 'browser', 'internet'], weight: 5 },
            
            // Reading & Learning
            { keywords: ['kindle', 'books', 'reader', 'pdf', 'documentation', 'manual'], weight: 6 },
            { keywords: ['news', 'medium', 'wikipedia', 'stack overflow', 'reddit'], weight: 4 },
            
            // Music & Podcasts
            { keywords: ['spotify', 'apple music', 'itunes', 'podcast', 'audible'], weight: 6 },
            
            // Shopping & Finance
            { keywords: ['amazon', 'ebay', 'shopping', 'bank', 'finance', 'wallet'], weight: 3 }
        ];

        this.distractedPatterns = [
            // Social Media
            { keywords: ['facebook', 'instagram', 'twitter', 'tiktok', 'snapchat', 'linkedin'], weight: 10 },
            { keywords: ['social', 'feed', 'timeline'], weight: 8 },
            
            // Entertainment
            { keywords: ['youtube', 'netflix', 'hulu', 'disney', 'prime video', 'twitch'], weight: 9 },
            { keywords: ['games', 'gaming', 'steam', 'epic', 'xbox', 'playstation'], weight: 10 },
            { keywords: ['entertainment', 'movie', 'tv', 'series', 'streaming'], weight: 8 },
            
            // Time Wasters
            { keywords: ['meme', 'funny', 'joke', 'viral', 'trending'], weight: 9 },
            { keywords: ['dating', 'tinder', 'bumble'], weight: 8 }
        ];

        // Learning patterns from user behavior
        this.userPatterns = {};
        this.categoryHistory = [];
    }

    // Main categorization function
    categorizeApp(appName, windowTitle = '', url = '') {
        const normalizedApp = appName.toLowerCase();
        const normalizedTitle = windowTitle.toLowerCase();
        const normalizedUrl = url.toLowerCase();
        
        // Combine all text for analysis
        const fullContext = `${normalizedApp} ${normalizedTitle} ${normalizedUrl}`;
        
        // Check user-learned patterns first
        const userCategory = this.checkUserPatterns(fullContext);
        if (userCategory) {
            return userCategory;
        }
        
        // Calculate scores for each category
        const scores = {
            productive: this.calculateScore(fullContext, this.productivePatterns),
            break: this.calculateScore(fullContext, this.breakPatterns),
            distracted: this.calculateScore(fullContext, this.distractedPatterns)
        };
        
        // Apply contextual rules
        this.applyContextualRules(scores, fullContext, normalizedApp);
        
        // Get the category with highest score
        const bestCategory = Object.keys(scores).reduce((a, b) => 
            scores[a] > scores[b] ? a : b
        );
        
        // Default fallback logic
        if (scores[bestCategory] === 0) {
            return this.getDefaultCategory(normalizedApp);
        }
        
        // Store for learning
        this.recordCategorization(appName, bestCategory);
        
        return bestCategory;
    }

    // Calculate weighted score for patterns
    calculateScore(text, patterns) {
        let totalScore = 0;
        let maxWeight = 0;
        
        patterns.forEach(pattern => {
            const matches = pattern.keywords.filter(keyword => 
                text.includes(keyword)
            ).length;
            
            if (matches > 0) {
                totalScore += (matches * pattern.weight);
                maxWeight = Math.max(maxWeight, pattern.weight);
            }
        });
        
        // Normalize score
        return maxWeight > 0 ? (totalScore / maxWeight) : 0;
    }

    // Apply contextual rules for better accuracy
    applyContextualRules(scores, fullContext, appName) {
        // Browser-specific rules
        if (this.isBrowser(appName)) {
            // Check URL/title for context
            if (this.isProductiveWebsite(fullContext)) {
                scores.productive += 5;
            } else if (this.isSocialMedia(fullContext)) {
                scores.distracted += 8;
            } else if (this.isNewsOrLearning(fullContext)) {
                scores.break += 3;
            }
        }
        
        // Time-based rules
        const currentHour = new Date().getHours();
        if (currentHour >= 9 && currentHour <= 17) {
            // Work hours - boost productive apps
            scores.productive *= 1.2;
        } else if (currentHour >= 18 || currentHour <= 8) {
            // Evening/morning - normal entertainment is less distracting
            scores.distracted *= 0.8;
        }
        
        // Duration-based rules (if app has been used for a long time)
        if (this.isLongSession(appName)) {
            if (scores.productive > 0) {
                scores.productive += 2; // Reward focused work
            }
        }
    }

    // Check if app is a browser
    isBrowser(appName) {
        const browsers = ['chrome', 'firefox', 'safari', 'edge', 'opera', 'brave'];
        return browsers.some(browser => appName.includes(browser));
    }

    // Check if website is productive
    isProductiveWebsite(context) {
        const productiveSites = [
            'github', 'stackoverflow', 'documentation', 'docs', 'api',
            'jira', 'confluence', 'trello', 'notion', 'figma',
            'aws', 'azure', 'google cloud', 'analytics',
            'learning', 'course', 'tutorial', 'education'
        ];
        return productiveSites.some(site => context.includes(site));
    }

    // Check if website is social media
    isSocialMedia(context) {
        const socialSites = [
            'facebook', 'instagram', 'twitter', 'tiktok', 'snapchat',
            'linkedin', 'reddit', 'pinterest', 'tumblr'
        ];
        return socialSites.some(site => context.includes(site));
    }

    // Check if website is news/learning
    isNewsOrLearning(context) {
        const learningSites = [
            'news', 'bbc', 'cnn', 'medium', 'wikipedia', 'coursera',
            'udemy', 'khan academy', 'documentation', 'blog'
        ];
        return learningSites.some(site => context.includes(site));
    }

    // Default category fallback
    getDefaultCategory(appName) {
        // System apps are usually productive
        if (appName.includes('system') || appName.includes('settings')) {
            return 'productive';
        }
        
        // Unknown apps default to break (safer assumption)
        return 'break';
    }

    // Learning system - record user corrections
    learnFromUser(appName, actualCategory, predictedCategory) {
        if (actualCategory !== predictedCategory) {
            const key = this.normalizeAppName(appName);
            
            if (!this.userPatterns[key]) {
                this.userPatterns[key] = {};
            }
            
            // Increase weight for correct category
            this.userPatterns[key][actualCategory] = 
                (this.userPatterns[key][actualCategory] || 0) + 1;
            
            // Decrease weight for incorrect category
            if (this.userPatterns[key][predictedCategory]) {
                this.userPatterns[key][predictedCategory] = 
                    Math.max(0, this.userPatterns[key][predictedCategory] - 0.5);
            }
        }
    }

    // Check user-learned patterns
    checkUserPatterns(context) {
        for (const [app, categories] of Object.entries(this.userPatterns)) {
            if (context.includes(app)) {
                const bestCategory = Object.keys(categories).reduce((a, b) => 
                    categories[a] > categories[b] ? a : b
                );
                
                // Only use if confidence is high enough
                if (categories[bestCategory] >= 3) {
                    return bestCategory;
                }
            }
        }
        return null;
    }

    // Track long sessions
    isLongSession(appName) {
        // This would be implemented with session tracking
        // For now, return false
        return false;
    }

    // Record categorization for analysis
    recordCategorization(appName, category) {
        this.categoryHistory.push({
            app: appName,
            category: category,
            timestamp: new Date()
        });
        
        // Keep only recent history (last 1000 entries)
        if (this.categoryHistory.length > 1000) {
            this.categoryHistory = this.categoryHistory.slice(-1000);
        }
    }

    // Normalize app name for consistent matching
    normalizeAppName(appName) {
        return appName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim();
    }

    // Get categorization confidence
    getCategoryConfidence(appName, windowTitle = '', url = '') {
        const fullContext = `${appName} ${windowTitle} ${url}`.toLowerCase();
        
        const scores = {
            productive: this.calculateScore(fullContext, this.productivePatterns),
            break: this.calculateScore(fullContext, this.breakPatterns),
            distracted: this.calculateScore(fullContext, this.distractedPatterns)
        };
        
        const maxScore = Math.max(...Object.values(scores));
        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
        
        return totalScore > 0 ? (maxScore / totalScore) : 0;
    }

    // Export user patterns for persistence
    exportUserPatterns() {
        return {
            userPatterns: this.userPatterns,
            categoryHistory: this.categoryHistory.slice(-100) // Last 100 entries
        };
    }

    // Import user patterns from storage
    importUserPatterns(data) {
        if (data.userPatterns) {
            this.userPatterns = data.userPatterns;
        }
        if (data.categoryHistory) {
            this.categoryHistory = data.categoryHistory;
        }
    }

    // Get category suggestions for unknown apps
    getSuggestions(appName) {
        const normalizedApp = this.normalizeAppName(appName);
        const suggestions = [];
        
        // Find similar apps in history
        this.categoryHistory.forEach(entry => {
            const similarity = this.calculateSimilarity(normalizedApp, 
                this.normalizeAppName(entry.app));
            
            if (similarity > 0.6) {
                suggestions.push({
                    app: entry.app,
                    category: entry.category,
                    similarity: similarity
                });
            }
        });
        
        return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
    }

    // Calculate string similarity
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    // Levenshtein distance calculation
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

// Export for use in renderer
module.exports = AutoCategorizer; 