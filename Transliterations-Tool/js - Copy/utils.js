/**
 * Utility Functions - Common helper functions and utilities
 * Shared functionality across the Transliterations Tool
 * Author: AICTE Team
 * Version: 1.0.0
 */

/**
 * Main utilities namespace
 */
const Utils = {
    
    /**
     * Language support and mappings
     */
    languages: {
        supported: {
            'en': { name: 'English', script: 'Latin', code: 'en' },
            'hi': { name: 'Hindi', script: 'Devanagari', code: 'hi' },
            'ta': { name: 'Tamil', script: 'Tamil', code: 'ta' },
            'te': { name: 'Telugu', script: 'Telugu', code: 'te' },
            'ml': { name: 'Malayalam', script: 'Malayalam', code: 'ml' },
            'kn': { name: 'Kannada', script: 'Kannada', code: 'kn' },
            'pa': { name: 'Punjabi', script: 'Gurmukhi', code: 'pa' },
            'gu': { name: 'Gujarati', script: 'Gujarati', code: 'gu' },
            'bn': { name: 'Bengali', script: 'Bengali', code: 'bn' },
            'or': { name: 'Odia', script: 'Odia', code: 'or' }
        },
        
        /**
         * Get language name by code
         */
        getName(code) {
            return this.supported[code]?.name || code.toUpperCase();
        },
        
        /**
         * Get script name by language code
         */
        getScript(code) {
            return this.supported[code]?.script || 'Unknown';
        },
        
        /**
         * Check if language is supported
         */
        isSupported(code) {
            return code in this.supported;
        },
        
        /**
         * Get all supported language codes
         */
        getCodes() {
            return Object.keys(this.supported);
        },
        
        /**
         * Get language pairs for transliteration
         */
        getPairs() {
            const codes = this.getCodes();
            const pairs = [];
            
            for (const source of codes) {
                for (const target of codes) {
                    if (source !== target) {
                        pairs.push({ source, target });
                    }
                }
            }
            
            return pairs;
        }
    },
    
    /**
     * DOM manipulation utilities
     */
    dom: {
        /**
         * Create element with attributes and content
         */
        createElement(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            
            // Set attributes
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            // Set content
            if (content) {
                if (typeof content === 'string') {
                    element.textContent = content;
                } else if (content instanceof HTMLElement) {
                    element.appendChild(content);
                }
            }
            
            return element;
        },
        
        /**
         * Find element by selector with error handling
         */
        find(selector, context = document) {
            try {
                return context.querySelector(selector);
            } catch (error) {
                console.error('Invalid selector:', selector, error);
                return null;
            }
        },
        
        /**
         * Find all elements by selector with error handling
         */
        findAll(selector, context = document) {
            try {
                return Array.from(context.querySelectorAll(selector));
            } catch (error) {
                console.error('Invalid selector:', selector, error);
                return [];
            }
        },
        
        /**
         * Add event listener with automatic cleanup
         */
        addListener(element, event, handler, options = {}) {
            if (!element || typeof handler !== 'function') {
                console.error('Invalid element or handler for event listener');
                return null;
            }
            
            element.addEventListener(event, handler, options);
            
            // Return cleanup function
            return () => {
                element.removeEventListener(event, handler, options);
            };
        },
        
        /**
         * Show element with optional animation
         */
        show(element, animate = true) {
            if (!element) return;
            
            element.style.display = '';
            element.removeAttribute('hidden');
            
            if (animate && !Utils.accessibility.prefersReducedMotion()) {
                element.style.opacity = '0';
                element.style.transform = 'translateY(-10px)';
                element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                // Trigger animation
                requestAnimationFrame(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                });
            }
        },
        
        /**
         * Hide element with optional animation
         */
        hide(element, animate = true) {
            if (!element) return;
            
            if (animate && !Utils.accessibility.prefersReducedMotion()) {
                element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                element.style.opacity = '0';
                element.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    element.style.display = 'none';
                    element.setAttribute('hidden', '');
                }, 300);
            } else {
                element.style.display = 'none';
                element.setAttribute('hidden', '');
            }
        },
        
        /**
         * Toggle element visibility
         */
        toggle(element, animate = true) {
            if (!element) return;
            
            const isHidden = element.hasAttribute('hidden') || 
                           element.style.display === 'none' ||
                           getComputedStyle(element).display === 'none';
            
            if (isHidden) {
                this.show(element, animate);
            } else {
                this.hide(element, animate);
            }
        }
    },
    
    /**
     * String manipulation utilities
     */
    string: {
        /**
         * Escape HTML to prevent XSS
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        /**
         * Unescape HTML entities
         */
        unescapeHtml(html) {
            const div = document.createElement('div');
            div.innerHTML = html;
            return div.textContent || div.innerText || '';
        },
        
        /**
         * Truncate text with ellipsis
         */
        truncate(text, length, suffix = '...') {
            if (text.length <= length) {
                return text;
            }
            return text.substring(0, length - suffix.length) + suffix;
        },
        
        /**
         * Capitalize first letter of each word
         */
        titleCase(text) {
            return text.replace(/\w\S*/g, (txt) => 
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },
        
        /**
         * Convert to kebab-case
         */
        kebabCase(text) {
            return text
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .replace(/[\s_]+/g, '-')
                .toLowerCase();
        },
        
        /**
         * Convert to camelCase
         */
        camelCase(text) {
            return text
                .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
                    index === 0 ? word.toLowerCase() : word.toUpperCase()
                )
                .replace(/\s+/g, '');
        },
        
        /**
         * Generate random string
         */
        random(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },
        
        /**
         * Check if string contains only whitespace
         */
        isWhitespace(text) {
            return !text || text.trim().length === 0;
        },
        
        /**
         * Remove diacritics/accents from text
         */
        removeDiacritics(text) {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
    },
    
    /**
     * URL and navigation utilities
     */
    url: {
        /**
         * Get current page name
         */
        getCurrentPage() {
            const path = window.location.pathname;
            const page = path.split('/').pop() || 'index.html';
            return page.replace('.html', '');
        },
        
        /**
         * Update URL parameters without page reload
         */
        updateParams(params) {
            const url = new URL(window.location);
            
            Object.entries(params).forEach(([key, value]) => {
                if (value === null || value === undefined) {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, value);
                }
            });
            
            window.history.replaceState({}, '', url);
        },
        
        /**
         * Get URL parameter value
         */
        getParam(name) {
            const params = new URLSearchParams(window.location.search);
            return params.get(name);
        },
        
        /**
         * Navigate to page with smooth transition
         */
        navigateTo(path, newTab = false) {
            if (newTab) {
                window.open(path, '_blank');
            } else {
                window.location.href = path;
            }
        }
    },
    
    /**
     * Local storage utilities
     */
    storage: {
        /**
         * Set item in localStorage with error handling
         */
        set(key, value) {
            try {
                const serialized = JSON.stringify(value);
                localStorage.setItem(key, serialized);
                return true;
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
                return false;
            }
        },
        
        /**
         * Get item from localStorage with error handling
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Failed to read from localStorage:', error);
                return defaultValue;
            }
        },
        
        /**
         * Remove item from localStorage
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Failed to remove from localStorage:', error);
                return false;
            }
        },
        
        /**
         * Clear all localStorage
         */
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Failed to clear localStorage:', error);
                return false;
            }
        },
        
        /**
         * Check if localStorage is available
         */
        isAvailable() {
            try {
                const test = '__storage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (error) {
                return false;
            }
        }
    },
    
    /**
     * Date and time utilities
     */
    date: {
        /**
         * Format date as human readable string
         */
        format(date, options = {}) {
            const defaults = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            const formatter = new Intl.DateTimeFormat('en-US', {
                ...defaults,
                ...options
            });
            
            return formatter.format(new Date(date));
        },
        
        /**
         * Get relative time string (e.g., "2 hours ago")
         */
        relative(date) {
            const now = new Date();
            const diff = now - new Date(date);
            
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
                return `${days} day${days === 1 ? '' : 's'} ago`;
            } else if (hours > 0) {
                return `${hours} hour${hours === 1 ? '' : 's'} ago`;
            } else if (minutes > 0) {
                return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
            } else if (seconds > 0) {
                return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
            } else {
                return 'Just now';
            }
        },
        
        /**
         * Check if date is today
         */
        isToday(date) {
            const today = new Date();
            const checkDate = new Date(date);
            
            return checkDate.getDate() === today.getDate() &&
                   checkDate.getMonth() === today.getMonth() &&
                   checkDate.getFullYear() === today.getFullYear();
        }
    },
    
    /**
     * Validation utilities
     */
    validation: {
        /**
         * Validate email address
         */
        email(email) {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        },
        
        /**
         * Validate URL
         */
        url(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },
        
        /**
         * Validate phone number (basic)
         */
        phone(phone) {
            const regex = /^[\+]?[1-9][\d]{0,15}$/;
            return regex.test(phone.replace(/\s/g, ''));
        },
        
        /**
         * Check if text is not empty after trimming
         */
        required(text) {
            return text && text.trim().length > 0;
        },
        
        /**
         * Check minimum length
         */
        minLength(text, min) {
            return text && text.length >= min;
        },
        
        /**
         * Check maximum length
         */
        maxLength(text, max) {
            return !text || text.length <= max;
        }
    },
    
    /**
     * Performance and debugging utilities
     */
    performance: {
        /**
         * Debounce function calls
         */
        debounce(func, wait, immediate = false) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        },
        
        /**
         * Throttle function calls
         */
        throttle(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        /**
         * Measure execution time
         */
        measure(name, func) {
            const start = performance.now();
            const result = func();
            const end = performance.now();
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        },
        
        /**
         * Simple profiler for multiple operations
         */
        profile(operations) {
            const results = {};
            
            Object.entries(operations).forEach(([name, func]) => {
                const start = performance.now();
                const result = func();
                const end = performance.now();
                
                results[name] = {
                    result,
                    time: end - start
                };
            });
            
            return results;
        }
    },
    
    /**
     * Accessibility utilities
     */
    accessibility: {
        /**
         * Check if user prefers reduced motion
         */
        prefersReducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },
        
        /**
         * Check if user prefers high contrast
         */
        prefersHighContrast() {
            return window.matchMedia('(prefers-contrast: high)').matches;
        },
        
        /**
         * Announce message to screen readers
         */
        announce(message, priority = 'polite') {
            if (window.AccessibilityManager) {
                window.AccessibilityManager.announce(message, priority);
            } else {
                console.log('Screen reader announcement:', message);
            }
        },
        
        /**
         * Focus element with proper handling
         */
        focus(element, options = {}) {
            if (!element) return;
            
            try {
                element.focus(options);
                
                // Ensure focus is visible
                if (!element.matches(':focus-visible')) {
                    element.style.outline = '2px solid #007BFF';
                    element.style.outlineOffset = '2px';
                    
                    // Remove outline when focus is lost
                    const removeFocus = () => {
                        element.style.outline = '';
                        element.style.outlineOffset = '';
                        element.removeEventListener('blur', removeFocus);
                    };
                    
                    element.addEventListener('blur', removeFocus);
                }
            } catch (error) {
                console.error('Failed to focus element:', error);
            }
        }
    },
    
    /**
     * Error handling utilities
     */
    error: {
        /**
         * Handle and log errors consistently
         */
        handle(error, context = 'Unknown') {
            console.error(`Error in ${context}:`, error);
            
            // Report to user if appropriate
            if (error.message && !error.message.includes('fetch')) {
                this.notify(`An error occurred: ${error.message}`, 'error');
            }
            
            // Could integrate with error reporting service here
            return error;
        },
        
        /**
         * Show error notification to user
         */
        notify(message, type = 'error') {
            // Try to use existing notification system
            if (window.showStatus) {
                window.showStatus(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        },
        
        /**
         * Create safe function wrapper that catches errors
         */
        safe(func, fallback = null) {
            return (...args) => {
                try {
                    return func(...args);
                } catch (error) {
                    this.handle(error, func.name || 'Anonymous function');
                    return fallback;
                }
            };
        }
    },
    
    /**
     * Device and browser detection
     */
    device: {
        /**
         * Check if device is mobile
         */
        isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },
        
        /**
         * Check if device is tablet
         */
        isTablet() {
            return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
        },
        
        /**
         * Check if device is desktop
         */
        isDesktop() {
            return !this.isMobile() && !this.isTablet();
        },
        
        /**
         * Check if device supports touch
         */
        hasTouch() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },
        
        /**
         * Get viewport dimensions
         */
        getViewport() {
            return {
                width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
                height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
            };
        }
    }
};

// Initialize utilities when DOM is ready
if (typeof window !== 'undefined') {
    window.Utils = Utils;
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        Utils.error.handle(event.error, 'Global error handler');
    });
    
    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        Utils.error.handle(event.reason, 'Unhandled promise rejection');
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
