/**
 * History Manager - Local storage based transliteration history
 * Manages recent transliterations with localStorage
 * Author: AICTE Team
 * Version: 1.0.0
 */

class HistoryManager {
    constructor() {
        this.storageKey = 'transliteration_history';
        this.maxHistoryItems = 50;
        this.history = [];
        this.isInitialized = false;
        
        // Language mappings for display
        this.languageNames = {
            'en': 'English',
            'hi': 'Hindi',
            'ta': 'Tamil',
            'te': 'Telugu',
            'ml': 'Malayalam',
            'kn': 'Kannada',
            'pa': 'Punjabi',
            'gu': 'Gujarati',
            'bn': 'Bengali',
            'or': 'Odia'
        };
        
        // DOM elements
        this.elements = {};
        
        // Event handlers
        this.boundHandlers = {
            clearHistory: this.clearHistory.bind(this),
            historyItemClick: this.handleHistoryItemClick.bind(this)
        };
    }

    /**
     * Initialize the history manager
     */
    init() {
        console.log('Initializing History Manager...');
        
        // Get DOM elements
        this.initElements();
        
        // Check if we're on the transliteration page
        if (!this.elements.historyContainer) {
            console.log('Not on transliteration page, skipping history init');
            return;
        }
        
        // Load history from localStorage
        this.loadHistory();
        
        // Bind event listeners
        this.bindEventListeners();
        
        // Render initial history
        this.renderHistory();
        
        this.isInitialized = true;
        console.log('History Manager initialized successfully');
    }

    /**
     * Get and store DOM element references
     */
    initElements() {
        this.elements = {
            historyContainer: document.getElementById('history-container'),
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            
            // Main transliteration inputs (for filling from history)
            inputText: document.getElementById('input-text'),
            outputText: document.getElementById('output-text'),
            sourceLanguage: document.getElementById('source-language'),
            targetLanguage: document.getElementById('target-language')
        };
    }

    /**
     * Load history from localStorage
     */
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.history = JSON.parse(stored);
                // Ensure history is an array and validate entries
                if (!Array.isArray(this.history)) {
                    this.history = [];
                } else {
                    // Validate and clean up history entries
                    this.history = this.history.filter(entry => this.validateHistoryEntry(entry));
                }
            } else {
                this.history = [];
            }
        } catch (error) {
            console.error('Error loading history from localStorage:', error);
            this.history = [];
        }
    }

    /**
     * Save history to localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.history));
        } catch (error) {
            console.error('Error saving history to localStorage:', error);
            
            // Handle storage quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
        }
    }

    /**
     * Handle storage quota exceeded by removing old entries
     */
    handleStorageQuotaExceeded() {
        console.log('Storage quota exceeded, removing old entries...');
        
        // Remove older half of the history
        const keepCount = Math.floor(this.history.length / 2);
        this.history = this.history.slice(-keepCount);
        
        try {
            this.saveHistory();
        } catch (error) {
            console.error('Still unable to save after cleanup:', error);
            // Clear all history if still can't save
            this.history = [];
            localStorage.removeItem(this.storageKey);
        }
    }

    /**
     * Validate history entry structure
     */
    validateHistoryEntry(entry) {
        return entry && 
               typeof entry === 'object' &&
               typeof entry.sourceText === 'string' &&
               typeof entry.targetText === 'string' &&
               typeof entry.sourceLanguage === 'string' &&
               typeof entry.targetLanguage === 'string' &&
               typeof entry.timestamp === 'number';
    }

    /**
     * Bind event listeners
     */
    bindEventListeners() {
        // Clear history button
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', this.boundHandlers.clearHistory);
        }
    }

    /**
     * Add new transliteration entry to history
     */
    addEntry(entry) {
        if (!this.isInitialized) {
            return;
        }
        
        // Validate entry
        if (!this.validateHistoryEntry(entry)) {
            console.error('Invalid history entry:', entry);
            return;
        }
        
        // Avoid duplicate consecutive entries
        if (this.history.length > 0) {
            const lastEntry = this.history[this.history.length - 1];
            if (this.isDuplicateEntry(lastEntry, entry)) {
                console.log('Skipping duplicate entry');
                return;
            }
        }
        
        // Add timestamp if not provided
        if (!entry.timestamp) {
            entry.timestamp = Date.now();
        }
        
        // Add to history
        this.history.push(entry);
        
        // Limit history size
        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(-this.maxHistoryItems);
        }
        
        // Save to localStorage
        this.saveHistory();
        
        // Re-render history
        this.renderHistory();
        
        console.log('Added entry to history:', entry);
    }

    /**
     * Check if entry is duplicate of previous entry
     */
    isDuplicateEntry(entry1, entry2) {
        return entry1.sourceText === entry2.sourceText &&
               entry1.targetText === entry2.targetText &&
               entry1.sourceLanguage === entry2.sourceLanguage &&
               entry1.targetLanguage === entry2.targetLanguage;
    }

    /**
     * Clear all history
     */
    clearHistory() {
        if (!confirm('Are you sure you want to clear all transliteration history?')) {
            return;
        }
        
        this.history = [];
        this.saveHistory();
        this.renderHistory();
        
        // Show success message
        this.showHistoryMessage('History cleared successfully.', 'success');
        
        console.log('History cleared');
    }

    /**
     * Render history in the UI
     */
    renderHistory() {
        if (!this.elements.historyContainer) {
            return;
        }
        
        // Clear container
        this.elements.historyContainer.innerHTML = '';
        
        if (this.history.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Sort history by timestamp (newest first)
        const sortedHistory = [...this.history].sort((a, b) => b.timestamp - a.timestamp);
        
        // Render each history item
        sortedHistory.forEach((entry, index) => {
            const historyItem = this.createHistoryItem(entry, index);
            this.elements.historyContainer.appendChild(historyItem);
        });
        
        // Update clear button visibility
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.style.display = 'block';
        }
    }

    /**
     * Render empty state when no history
     */
    renderEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div class="empty-icon">
                <i class="fas fa-history" aria-hidden="true"></i>
            </div>
            <p>No recent transliterations</p>
            <small>Your transliteration history will appear here</small>
        `;
        
        this.elements.historyContainer.appendChild(emptyState);
        
        // Hide clear button
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.style.display = 'none';
        }
    }

    /**
     * Create history item element
     */
    createHistoryItem(entry, index) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `Transliteration from ${this.getLanguageName(entry.sourceLanguage)} to ${this.getLanguageName(entry.targetLanguage)}: ${entry.sourceText} becomes ${entry.targetText}`);
        
        // Format timestamp
        const timeAgo = this.formatTimeAgo(entry.timestamp);
        
        // Create content
        item.innerHTML = `
            <div class="history-meta">
                <span class="history-languages">
                    ${this.getLanguageName(entry.sourceLanguage)} → ${this.getLanguageName(entry.targetLanguage)}
                </span>
                <span class="history-time">${timeAgo}</span>
            </div>
            <div class="history-content">
                <div class="history-text source-text">
                    <strong>Source:</strong> ${this.escapeHtml(this.truncateText(entry.sourceText, 100))}
                </div>
                <div class="history-text target-text">
                    <strong>Result:</strong> ${this.escapeHtml(this.truncateText(entry.targetText, 100))}
                </div>
            </div>
            <div class="history-actions">
                <button class="btn btn-sm btn-secondary reuse-btn" data-index="${index}" title="Reuse this transliteration">
                    <i class="fas fa-redo" aria-hidden="true"></i>
                    Reuse
                </button>
                <button class="btn btn-sm btn-secondary delete-btn" data-index="${index}" title="Delete this entry">
                    <i class="fas fa-trash" aria-hidden="true"></i>
                    Delete
                </button>
            </div>
        `;
        
        // Add click handlers
        this.addHistoryItemHandlers(item, entry, index);
        
        return item;
    }

    /**
     * Add event handlers to history item
     */
    addHistoryItemHandlers(item, entry, index) {
        // Main item click - reuse entry
        const reuseEntry = () => {
            this.reuseHistoryEntry(entry);
        };
        
        item.addEventListener('click', (e) => {
            // Don't trigger on button clicks
            if (e.target.closest('.history-actions')) {
                return;
            }
            reuseEntry();
        });
        
        // Keyboard support
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                reuseEntry();
            }
        });
        
        // Reuse button
        const reuseBtn = item.querySelector('.reuse-btn');
        if (reuseBtn) {
            reuseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.reuseHistoryEntry(entry);
            });
        }
        
        // Delete button
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteHistoryEntry(index);
            });
        }
    }

    /**
     * Reuse history entry by filling form fields
     */
    reuseHistoryEntry(entry) {
        try {
            // Set language selections
            if (this.elements.sourceLanguage && entry.sourceLanguage) {
                this.elements.sourceLanguage.value = entry.sourceLanguage;
            }
            
            if (this.elements.targetLanguage && entry.targetLanguage) {
                this.elements.targetLanguage.value = entry.targetLanguage;
            }
            
            // Set text fields
            if (this.elements.inputText && entry.sourceText) {
                this.elements.inputText.value = entry.sourceText;
            }
            
            if (this.elements.outputText && entry.targetText) {
                this.elements.outputText.value = entry.targetText;
            }
            
            // Trigger events to update UI
            if (this.elements.inputText) {
                this.elements.inputText.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            if (this.elements.sourceLanguage) {
                this.elements.sourceLanguage.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            if (this.elements.targetLanguage) {
                this.elements.targetLanguage.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Focus on input field
            if (this.elements.inputText) {
                this.elements.inputText.focus();
            }
            
            // Show success message
            this.showHistoryMessage('History entry loaded successfully!', 'success');
            
            // Scroll to transliteration section
            if (this.elements.inputText) {
                this.elements.inputText.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
            
        } catch (error) {
            console.error('Error reusing history entry:', error);
            this.showHistoryMessage('Failed to load history entry.', 'error');
        }
    }

    /**
     * Delete specific history entry
     */
    deleteHistoryEntry(index) {
        if (!confirm('Delete this transliteration from history?')) {
            return;
        }
        
        // Calculate actual index in unsorted array
        const sortedHistory = [...this.history].sort((a, b) => b.timestamp - a.timestamp);
        const entryToDelete = sortedHistory[index];
        const actualIndex = this.history.findIndex(entry => 
            entry.timestamp === entryToDelete.timestamp &&
            entry.sourceText === entryToDelete.sourceText
        );
        
        if (actualIndex !== -1) {
            this.history.splice(actualIndex, 1);
            this.saveHistory();
            this.renderHistory();
            
            this.showHistoryMessage('Entry deleted from history.', 'success');
        }
    }

    /**
     * Get display name for language code
     */
    getLanguageName(code) {
        return this.languageNames[code] || code.toUpperCase();
    }

    /**
     * Format timestamp as "time ago"
     */
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
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
        } else {
            return 'Just now';
        }
    }

    /**
     * Truncate text with ellipsis
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show history-related status message
     */
    showHistoryMessage(message, type = 'info') {
        // Try to use the main status container if available
        const statusContainer = document.getElementById('status-container');
        if (statusContainer) {
            const statusEl = document.createElement('div');
            statusEl.className = `status-message status-${type}`;
            
            const icon = {
                'success': 'fas fa-check-circle',
                'error': 'fas fa-exclamation-circle',
                'warning': 'fas fa-exclamation-triangle',
                'info': 'fas fa-info-circle'
            }[type] || 'fas fa-info-circle';
            
            statusEl.innerHTML = `
                <i class="${icon}" aria-hidden="true"></i>
                <span>${message}</span>
            `;
            
            statusContainer.innerHTML = '';
            statusContainer.appendChild(statusEl);
            
            // Auto-hide after 3 seconds for success messages
            if (type === 'success') {
                setTimeout(() => {
                    if (statusEl.parentNode) {
                        statusEl.remove();
                    }
                }, 3000);
            }
        } else {
            console.log(`History ${type}:`, message);
        }
    }

    /**
     * Get history statistics
     */
    getStatistics() {
        const stats = {
            totalEntries: this.history.length,
            languagePairs: {},
            oldestEntry: null,
            newestEntry: null
        };
        
        if (this.history.length > 0) {
            // Find oldest and newest
            stats.oldestEntry = this.history.reduce((oldest, entry) => 
                entry.timestamp < oldest.timestamp ? entry : oldest
            );
            
            stats.newestEntry = this.history.reduce((newest, entry) => 
                entry.timestamp > newest.timestamp ? entry : newest
            );
            
            // Count language pairs
            this.history.forEach(entry => {
                const pair = `${entry.sourceLanguage}-${entry.targetLanguage}`;
                stats.languagePairs[pair] = (stats.languagePairs[pair] || 0) + 1;
            });
        }
        
        return stats;
    }

    /**
     * Export history as JSON
     */
    exportHistory() {
        const exportData = {
            version: '1.0',
            exported: new Date().toISOString(),
            history: this.history
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transliteration-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Import history from JSON file
     */
    async importHistory(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.history && Array.isArray(data.history)) {
                const validEntries = data.history.filter(entry => this.validateHistoryEntry(entry));
                
                if (confirm(`Import ${validEntries.length} history entries? This will merge with existing history.`)) {
                    this.history = [...this.history, ...validEntries];
                    
                    // Remove duplicates and limit size
                    this.deduplicateHistory();
                    if (this.history.length > this.maxHistoryItems) {
                        this.history = this.history.slice(-this.maxHistoryItems);
                    }
                    
                    this.saveHistory();
                    this.renderHistory();
                    
                    this.showHistoryMessage(`Successfully imported ${validEntries.length} entries.`, 'success');
                }
            } else {
                throw new Error('Invalid file format');
            }
            
        } catch (error) {
            console.error('Import error:', error);
            this.showHistoryMessage('Failed to import history file.', 'error');
        }
    }

    /**
     * Remove duplicate entries from history
     */
    deduplicateHistory() {
        const seen = new Set();
        this.history = this.history.filter(entry => {
            const key = `${entry.sourceText}|${entry.targetText}|${entry.sourceLanguage}|${entry.targetLanguage}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Initialize the app when DOM is ready
if (typeof window !== 'undefined') {
    window.HistoryManager = new HistoryManager();
    
    // Auto-initialize if DOM is already ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.HistoryManager.init();
        });
    } else {
        window.HistoryManager.init();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}
