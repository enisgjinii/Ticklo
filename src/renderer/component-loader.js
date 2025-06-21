// Component Loader System - Similar to PHP includes/requires
class ComponentLoader {
    constructor() {
        this.components = new Map();
        this.componentCache = new Map();
        this.loadedComponents = new Set();
        this.componentsPath = './components/';
    }

    // Load and cache a component
    async loadComponent(componentName, useCache = true) {
        // Check cache first
        if (useCache && this.componentCache.has(componentName)) {
            return this.componentCache.get(componentName);
        }

        try {
            const componentPath = `${this.componentsPath}${componentName}.html`;
            const response = await fetch(componentPath);
            
            if (!response.ok) {
                throw new Error(`Component ${componentName} not found: ${response.status}`);
            }
            
            const componentHTML = await response.text();
            
            // Cache the component
            this.componentCache.set(componentName, componentHTML);
            
            console.log(`✓ Component '${componentName}' loaded successfully`);
            return componentHTML;
            
        } catch (error) {
            console.error(`✗ Failed to load component '${componentName}':`, error.message);
            return `<!-- Component ${componentName} failed to load -->`;
        }
    }

    // Include component - like PHP include()
    async include(componentName, targetSelector = null, replaceContent = true) {
        try {
            const componentHTML = await this.loadComponent(componentName);
            
            if (targetSelector) {
                const target = document.querySelector(targetSelector);
                if (target) {
                    if (replaceContent) {
                        target.innerHTML = componentHTML;
                    } else {
                        target.insertAdjacentHTML('beforeend', componentHTML);
                    }
                    
                    // Track loaded component
                    this.loadedComponents.add(`${componentName}->${targetSelector}`);
                    
                    // Dispatch custom event for component loaded
                    this.dispatchComponentEvent('componentIncluded', {
                        component: componentName,
                        target: targetSelector
                    });
                    
                    console.log(`✓ Component '${componentName}' included in '${targetSelector}'`);
                    return true;
                } else {
                    console.error(`✗ Target selector '${targetSelector}' not found`);
                    return false;
                }
            } else {
                return componentHTML;
            }
        } catch (error) {
            console.error(`✗ Failed to include component '${componentName}':`, error.message);
            return false;
        }
    }

    // Require component - like PHP require() (fails if component not found)
    async require(componentName, targetSelector = null, replaceContent = true) {
        const result = await this.include(componentName, targetSelector, replaceContent);
        
        if (!result) {
            throw new Error(`Required component '${componentName}' could not be loaded`);
        }
        
        return result;
    }

    // Include component once - like PHP include_once()
    async includeOnce(componentName, targetSelector = null, replaceContent = true) {
        const key = `${componentName}->${targetSelector}`;
        
        if (this.loadedComponents.has(key)) {
            console.log(`⚠ Component '${componentName}' already included in '${targetSelector}'`);
            return true;
        }
        
        return await this.include(componentName, targetSelector, replaceContent);
    }

    // Require component once - like PHP require_once()
    async requireOnce(componentName, targetSelector = null, replaceContent = true) {
        const key = `${componentName}->${targetSelector}`;
        
        if (this.loadedComponents.has(key)) {
            console.log(`⚠ Component '${componentName}' already required in '${targetSelector}'`);
            return true;
        }
        
        return await this.require(componentName, targetSelector, replaceContent);
    }

    // Load multiple components in parallel
    async loadComponents(componentNames) {
        const promises = componentNames.map(name => this.loadComponent(name));
        const results = await Promise.allSettled(promises);
        
        const loadedComponents = {};
        const failedComponents = [];
        
        results.forEach((result, index) => {
            const componentName = componentNames[index];
            if (result.status === 'fulfilled') {
                loadedComponents[componentName] = result.value;
            } else {
                failedComponents.push({
                    name: componentName,
                    error: result.reason
                });
            }
        });
        
        if (failedComponents.length > 0) {
            console.warn('Some components failed to load:', failedComponents);
        }
        
        return { loadedComponents, failedComponents };
    }

    // Replace template variables in components
    replaceVariables(componentHTML, variables = {}) {
        let processedHTML = componentHTML;
        
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processedHTML = processedHTML.replace(placeholder, value);
        });
        
        return processedHTML;
    }

    // Include component with template variables
    async includeWithVars(componentName, targetSelector, variables = {}, replaceContent = true) {
        try {
            const componentHTML = await this.loadComponent(componentName);
            const processedHTML = this.replaceVariables(componentHTML, variables);
            
            if (targetSelector) {
                const target = document.querySelector(targetSelector);
                if (target) {
                    if (replaceContent) {
                        target.innerHTML = processedHTML;
                    } else {
                        target.insertAdjacentHTML('beforeend', processedHTML);
                    }
                    
                    this.dispatchComponentEvent('componentIncluded', {
                        component: componentName,
                        target: targetSelector,
                        variables: variables
                    });
                    
                    return true;
                }
            }
            
            return processedHTML;
        } catch (error) {
            console.error(`✗ Failed to include component with variables:`, error);
            return false;
        }
    }

    // Conditional include - include component based on condition
    async includeIf(condition, componentName, targetSelector = null, replaceContent = true) {
        if (typeof condition === 'function') {
            condition = condition();
        }
        
        if (condition) {
            return await this.include(componentName, targetSelector, replaceContent);
        } else {
            console.log(`⚠ Conditional include skipped for '${componentName}' (condition: false)`);
            return true;
        }
    }

    // Create a component layout system
    async createLayout(layoutName, sections = {}) {
        try {
            const layoutHTML = await this.loadComponent(layoutName);
            let processedLayout = layoutHTML;
            
            // Replace section placeholders with actual components
            for (const [sectionName, componentName] of Object.entries(sections)) {
                const sectionHTML = await this.loadComponent(componentName);
                const sectionPlaceholder = new RegExp(`\\{\\{${sectionName}\\}\\}`, 'g');
                processedLayout = processedLayout.replace(sectionPlaceholder, sectionHTML);
            }
            
            return processedLayout;
        } catch (error) {
            console.error(`✗ Failed to create layout '${layoutName}':`, error);
            return null;
        }
    }

    // Refresh/reload a component
    async reloadComponent(componentName, targetSelector = null) {
        // Clear from cache
        this.componentCache.delete(componentName);
        
        // Remove from loaded components
        if (targetSelector) {
            const key = `${componentName}->${targetSelector}`;
            this.loadedComponents.delete(key);
        }
        
        // Load fresh component
        return await this.include(componentName, targetSelector);
    }

    // Get component info
    getComponentInfo() {
        return {
            cachedComponents: Array.from(this.componentCache.keys()),
            loadedComponents: Array.from(this.loadedComponents),
            totalCached: this.componentCache.size,
            totalLoaded: this.loadedComponents.size
        };
    }

    // Clear cache
    clearCache() {
        this.componentCache.clear();
        this.loadedComponents.clear();
        console.log('✓ Component cache cleared');
    }

    // Dispatch custom events
    dispatchComponentEvent(eventName, detail) {
        const event = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true,
            cancelable: true
        });
        
        document.dispatchEvent(event);
    }

    // Set base path for components
    setComponentsPath(path) {
        this.componentsPath = path.endsWith('/') ? path : path + '/';
        console.log(`✓ Components path set to: ${this.componentsPath}`);
    }

    // Preload commonly used components
    async preloadComponents(componentNames) {
        console.log(`⏳ Preloading ${componentNames.length} components...`);
        const { loadedComponents, failedComponents } = await this.loadComponents(componentNames);
        
        console.log(`✓ Preloaded ${Object.keys(loadedComponents).length} components successfully`);
        if (failedComponents.length > 0) {
            console.warn(`⚠ Failed to preload ${failedComponents.length} components`);
        }
        
        return { loadedComponents, failedComponents };
    }

    // Component exists check
    async componentExists(componentName) {
        try {
            const componentPath = `${this.componentsPath}${componentName}.html`;
            const response = await fetch(componentPath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Dynamic component loading with fallback
    async includeWithFallback(componentName, fallbackComponent, targetSelector = null, replaceContent = true) {
        const exists = await this.componentExists(componentName);
        
        if (exists) {
            return await this.include(componentName, targetSelector, replaceContent);
        } else {
            console.warn(`⚠ Component '${componentName}' not found, using fallback '${fallbackComponent}'`);
            return await this.include(fallbackComponent, targetSelector, replaceContent);
        }
    }
}

// Create global instance
const ComponentLoader = new ComponentLoader();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}

// Make available globally
window.ComponentLoader = ComponentLoader; 