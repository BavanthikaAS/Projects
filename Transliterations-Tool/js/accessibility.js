/**
 * Accessibility Manager - WCAG 2.1 compliance utilities
 * Provides keyboard navigation, screen reader support, and accessibility features
 * Author: AICTE Team
 * Version: 1.0.0
 */

class AccessibilityManager {
    constructor() {
        this.isInitialized = false;
        
        // Focus management
        this.focusStack = [];
        this.currentFocusable = null;
        
        // Keyboard navigation
        this.trapActive = false;
        this.trapContainer = null;
        
        // Screen reader announcements
        this.announcer = null;
        
        // High contrast mode
        this.highContrastEnabled = false;
        
        // Font size adjustment
        this.baseFontSize = 16;
        this.currentFontScale = 1;
        
        // Motion preferences
        this.prefersReducedMotion = false;
        
        // Bound event handlers
        this.boundHandlers = {
            keydown: this.handleGlobalKeydown.bind(this),
            focusin: this.handleFocusIn.bind(this),
            focusout: this.handleFocusOut.bind(this),
            resize: this.handleResize.bind(this)
        };
        
        // Skip links
        this.skipLinks = [];
    }

    /**
     * Initialize accessibility features
     */
    init() {
        console.log('Initializing Accessibility Manager...');
        
        // Create screen reader announcer
        this.createAnnouncer();
        
        // Set up skip links
        this.setupSkipLinks();
        
        // Add ARIA labels and roles
        this.enhanceARIA();
        
        // Set up keyboard navigation
        this.setupKeyboardNavigation();
        
        // Add focus management
        this.setupFocusManagement();
        
        // Set up high contrast toggle
        this.setupHighContrast();
        
        // Set up font size controls
        this.setupFontSizeControls();
        
        // Detect motion preferences
        this.detectMotionPreferences();
        
        // Add custom form validation
        this.enhanceFormValidation();
        
        // Set up mobile accessibility
        this.setupMobileAccessibility();
        
        // Bind global events
        this.bindGlobalEvents();
        
        this.isInitialized = true;
        console.log('Accessibility Manager initialized successfully');
    }

    /**
     * Create hidden announcer for screen readers
     */
    createAnnouncer() {
        this.announcer = document.createElement('div');
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.className = 'sr-only';
        this.announcer.id = 'accessibility-announcer';
        
        // Make it truly hidden but readable by screen readers
        this.announcer.style.cssText = `
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        `;
        
        document.body.appendChild(this.announcer);
    }

    /**
     * Announce message to screen readers
     */
    announce(message, priority = 'polite') {
        if (!this.announcer) return;
        
        // Clear previous announcement
        this.announcer.textContent = '';
        
        // Set priority
        this.announcer.setAttribute('aria-live', priority);
        
        // Add new announcement after a brief delay
        setTimeout(() => {
            this.announcer.textContent = message;
        }, 100);
        
        console.log('Screen reader announcement:', message);
    }

    /**
     * Set up skip links for keyboard navigation
     */
    setupSkipLinks() {
        const skipLinksContainer = document.createElement('div');
        skipLinksContainer.className = 'skip-links';
        skipLinksContainer.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
            <a href="#transliteration-form" class="skip-link">Skip to transliteration form</a>
        `;
        
        // Insert at the beginning of body
        document.body.insertBefore(skipLinksContainer, document.body.firstChild);
        
        // Add styles for skip links
        this.addSkipLinkStyles();
    }

    /**
     * Add CSS for skip links
     */
    addSkipLinkStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .skip-links {
                position: relative;
                z-index: 9999;
            }
            
            .skip-link {
                position: absolute;
                top: -40px;
                left: 6px;
                background: #000;
                color: #fff;
                padding: 8px;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
                z-index: 10000;
                transition: top 0.3s ease;
            }
            
            .skip-link:focus {
                top: 6px;
            }
            
            .skip-link:hover,
            .skip-link:focus {
                background: #007BFF;
                outline: 2px solid #fff;
                outline-offset: 2px;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Enhance ARIA labels and roles
     */
    enhanceARIA() {
        // Add main landmark
        const main = document.querySelector('main') || document.querySelector('#main-content');
        if (main) {
            main.setAttribute('role', 'main');
            main.setAttribute('aria-label', 'Main content');
        }
        
        // Add navigation landmarks
        const nav = document.querySelector('nav') || document.querySelector('.navbar');
        if (nav) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Main navigation');
        }
        
        // Enhance form labels
        const forms = document.querySelectorAll('form');
        forms.forEach(form => this.enhanceFormAccessibility(form));
        
        // Enhance buttons
        const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        buttons.forEach(button => {
            if (!button.textContent.trim()) {
                const icon = button.querySelector('i[class*="fa-"]');
                if (icon) {
                    const iconClass = Array.from(icon.classList).find(cls => cls.startsWith('fa-'));
                    if (iconClass) {
                        const actionName = iconClass.replace('fa-', '').replace(/-/g, ' ');
                        button.setAttribute('aria-label', actionName);
                    }
                }
            }
        });
        
        // Enhance interactive elements
        this.enhanceInteractiveElements();
    }

    /**
     * Enhance form accessibility
     */
    enhanceFormAccessibility(form) {
        // Associate labels with inputs
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (!input.getAttribute('aria-labelledby') && !input.getAttribute('aria-label')) {
                const label = form.querySelector(`label[for="${input.id}"]`) ||
                            form.querySelector(`label:has(${input.tagName.toLowerCase()})`);
                
                if (label && !label.getAttribute('for')) {
                    if (!input.id) {
                        input.id = 'input-' + Math.random().toString(36).substr(2, 9);
                    }
                    label.setAttribute('for', input.id);
                }
            }
            
            // Add required indicator
            if (input.hasAttribute('required')) {
                input.setAttribute('aria-required', 'true');
                
                // Add visual indicator
                const label = form.querySelector(`label[for="${input.id}"]`);
                if (label && !label.querySelector('.required-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'required-indicator';
                    indicator.textContent = ' *';
                    indicator.setAttribute('aria-label', 'required');
                    label.appendChild(indicator);
                }
            }
        });
        
        // Add form validation feedback
        form.addEventListener('submit', (e) => {
            this.validateFormAccessibility(form, e);
        });
    }

    /**
     * Validate form with accessibility feedback
     */
    validateFormAccessibility(form, event) {
        const invalidInputs = form.querySelectorAll(':invalid');
        
        if (invalidInputs.length > 0) {
            event.preventDefault();
            
            // Focus first invalid input
            invalidInputs[0].focus();
            
            // Announce error
            this.announce(`Form has ${invalidInputs.length} error${invalidInputs.length === 1 ? '' : 's'}. Please correct and try again.`, 'assertive');
            
            // Add ARIA error messages
            invalidInputs.forEach(input => {
                let errorId = input.getAttribute('aria-describedby');
                if (!errorId) {
                    errorId = 'error-' + Math.random().toString(36).substr(2, 9);
                    input.setAttribute('aria-describedby', errorId);
                    
                    const errorMsg = document.createElement('div');
                    errorMsg.id = errorId;
                    errorMsg.className = 'error-message';
                    errorMsg.setAttribute('role', 'alert');
                    errorMsg.textContent = this.getValidationMessage(input);
                    
                    input.parentNode.insertBefore(errorMsg, input.nextSibling);
                }
            });
        }
    }

    /**
     * Get appropriate validation message for input
     */
    getValidationMessage(input) {
        if (input.validity.valueMissing) {
            return 'This field is required.';
        } else if (input.validity.typeMismatch) {
            return 'Please enter a valid ' + input.type + '.';
        } else if (input.validity.patternMismatch) {
            return 'Please match the requested format.';
        } else if (input.validity.tooShort) {
            return `Please enter at least ${input.minLength} characters.`;
        } else if (input.validity.tooLong) {
            return `Please enter no more than ${input.maxLength} characters.`;
        }
        return 'Please correct this field.';
    }

    /**
     * Enhance interactive elements
     */
    enhanceInteractiveElements() {
        // Add role and keyboard support to clickable elements
        const clickables = document.querySelectorAll('[onclick], .clickable, .btn-link');
        clickables.forEach(element => {
            if (!element.getAttribute('role')) {
                element.setAttribute('role', 'button');
            }
            
            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '0');
            }
            
            // Add keyboard support
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    element.click();
                }
            });
        });
        
        // Enhance file upload areas
        const fileAreas = document.querySelectorAll('.file-upload-area, .drag-drop-area');
        fileAreas.forEach(area => {
            area.setAttribute('role', 'button');
            area.setAttribute('tabindex', '0');
            area.setAttribute('aria-label', 'Click to upload file or drag and drop');
        });
    }

    /**
     * Set up keyboard navigation
     */
    setupKeyboardNavigation() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + M: Go to main content
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                const main = document.querySelector('#main-content, main');
                if (main) {
                    main.focus();
                    this.announce('Jumped to main content');
                }
            }
            
            // Alt + N: Go to navigation
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                const nav = document.querySelector('#navigation, nav');
                if (nav) {
                    const firstLink = nav.querySelector('a, button');
                    if (firstLink) {
                        firstLink.focus();
                        this.announce('Jumped to navigation');
                    }
                }
            }
            
            // Alt + T: Go to transliteration form
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                const form = document.querySelector('#transliteration-form, #input-text');
                if (form) {
                    form.focus();
                    this.announce('Jumped to transliteration form');
                }
            }
            
            // Escape: Close modals, clear focus trap
            if (e.key === 'Escape') {
                this.handleEscape();
            }
        });
        
        // Tab navigation enhancement
        this.enhanceTabNavigation();
    }

    /**
     * Enhance tab navigation
     */
    enhanceTabNavigation() {
        // Make sure all interactive elements are reachable
        const interactiveSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[role="button"]:not([disabled])',
            '[role="link"]:not([disabled])'
        ];
        
        const interactiveElements = document.querySelectorAll(interactiveSelectors.join(', '));
        
        interactiveElements.forEach(element => {
            // Ensure visible focus indicator
            if (!element.style.outline && !getComputedStyle(element).outline) {
                element.addEventListener('focus', () => {
                    element.style.outline = '2px solid #007BFF';
                    element.style.outlineOffset = '2px';
                });
                
                element.addEventListener('blur', () => {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                });
            }
        });
    }

    /**
     * Set up focus management
     */
    setupFocusManagement() {
        // Track focus changes
        document.addEventListener('focusin', this.boundHandlers.focusin);
        document.addEventListener('focusout', this.boundHandlers.focusout);
    }

    /**
     * Handle focus in events
     */
    handleFocusIn(event) {
        this.currentFocusable = event.target;
        
        // Announce context for screen readers
        const context = this.getFocusContext(event.target);
        if (context) {
            this.announce(context);
        }
    }

    /**
     * Handle focus out events
     */
    handleFocusOut(event) {
        // Clear any temporary focus styling
        if (event.target.style.outline === '2px solid #007BFF') {
            event.target.style.outline = '';
            event.target.style.outlineOffset = '';
        }
    }

    /**
     * Get context description for focused element
     */
    getFocusContext(element) {
        // For form inputs, describe their purpose
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                return `${label.textContent.trim()} input field`;
            }
        }
        
        // For buttons, describe their action
        if (element.tagName === 'BUTTON') {
            const action = element.textContent.trim() || element.getAttribute('aria-label');
            if (action) {
                return `${action} button`;
            }
        }
        
        return null;
    }

    /**
     * Set up high contrast mode toggle
     */
    setupHighContrast() {
        // Check for saved preference
        const saved = localStorage.getItem('high-contrast-mode');
        if (saved === 'true') {
            this.enableHighContrast();
        }
        
        // Add toggle button if it doesn't exist
        if (!document.getElementById('high-contrast-toggle')) {
            this.createAccessibilityPanel();
        }
    }

    /**
     * Create accessibility control panel
     */
    createAccessibilityPanel() {
        const panel = document.createElement('div');
        panel.className = 'accessibility-panel';
        panel.innerHTML = `
            <button id="accessibility-toggle" class="accessibility-toggle" aria-label="Open accessibility options">
                <i class="fas fa-universal-access" aria-hidden="true"></i>
            </button>
            <div id="accessibility-options" class="accessibility-options" hidden>
                <h3>Accessibility Options</h3>
                <button id="high-contrast-toggle" class="accessibility-option">
                    <i class="fas fa-adjust" aria-hidden="true"></i>
                    Toggle High Contrast
                </button>
                <button id="font-size-increase" class="accessibility-option">
                    <i class="fas fa-plus" aria-hidden="true"></i>
                    Increase Font Size
                </button>
                <button id="font-size-decrease" class="accessibility-option">
                    <i class="fas fa-minus" aria-hidden="true"></i>
                    Decrease Font Size
                </button>
                <button id="font-size-reset" class="accessibility-option">
                    <i class="fas fa-undo" aria-hidden="true"></i>
                    Reset Font Size
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add styles
        this.addAccessibilityPanelStyles();
        
        // Bind events
        this.bindAccessibilityPanelEvents();
    }

    /**
     * Add styles for accessibility panel
     */
    addAccessibilityPanelStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .accessibility-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            }
            
            .accessibility-toggle {
                background: #007BFF;
                color: white;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            }
            
            .accessibility-toggle:hover,
            .accessibility-toggle:focus {
                background: #0056b3;
                transform: scale(1.1);
                outline: 2px solid #fff;
                outline-offset: 2px;
            }
            
            .accessibility-options {
                position: absolute;
                top: 60px;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                min-width: 200px;
            }
            
            .accessibility-options h3 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: bold;
            }
            
            .accessibility-option {
                display: block;
                width: 100%;
                padding: 8px 12px;
                border: none;
                background: transparent;
                text-align: left;
                cursor: pointer;
                border-radius: 4px;
                margin-bottom: 4px;
            }
            
            .accessibility-option:hover,
            .accessibility-option:focus {
                background: #f8f9fa;
                outline: 2px solid #007BFF;
                outline-offset: 1px;
            }
            
            .accessibility-option i {
                margin-right: 8px;
                width: 16px;
            }
            
            /* High contrast mode styles */
            body.high-contrast {
                background: #000 !important;
                color: #fff !important;
            }
            
            body.high-contrast .card,
            body.high-contrast .navbar,
            body.high-contrast .form-control {
                background: #000 !important;
                color: #fff !important;
                border-color: #fff !important;
            }
            
            body.high-contrast .btn-primary {
                background: #fff !important;
                color: #000 !important;
                border-color: #fff !important;
            }
            
            body.high-contrast a {
                color: #00ff00 !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Bind accessibility panel events
     */
    bindAccessibilityPanelEvents() {
        const toggle = document.getElementById('accessibility-toggle');
        const options = document.getElementById('accessibility-options');
        
        // Toggle options panel
        toggle.addEventListener('click', () => {
            const isHidden = options.hasAttribute('hidden');
            if (isHidden) {
                options.removeAttribute('hidden');
                toggle.setAttribute('aria-expanded', 'true');
                this.announce('Accessibility options opened');
            } else {
                options.setAttribute('hidden', '');
                toggle.setAttribute('aria-expanded', 'false');
                this.announce('Accessibility options closed');
            }
        });
        
        // High contrast toggle
        document.getElementById('high-contrast-toggle').addEventListener('click', () => {
            this.toggleHighContrast();
        });
        
        // Font size controls
        document.getElementById('font-size-increase').addEventListener('click', () => {
            this.adjustFontSize(0.1);
        });
        
        document.getElementById('font-size-decrease').addEventListener('click', () => {
            this.adjustFontSize(-0.1);
        });
        
        document.getElementById('font-size-reset').addEventListener('click', () => {
            this.resetFontSize();
        });
        
        // Close on escape or outside click
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !options.hasAttribute('hidden')) {
                options.setAttribute('hidden', '');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.focus();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.accessibility-panel') && !options.hasAttribute('hidden')) {
                options.setAttribute('hidden', '');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        this.highContrastEnabled = !this.highContrastEnabled;
        
        if (this.highContrastEnabled) {
            this.enableHighContrast();
        } else {
            this.disableHighContrast();
        }
    }

    /**
     * Enable high contrast mode
     */
    enableHighContrast() {
        document.body.classList.add('high-contrast');
        localStorage.setItem('high-contrast-mode', 'true');
        this.announce('High contrast mode enabled');
        this.highContrastEnabled = true;
    }

    /**
     * Disable high contrast mode
     */
    disableHighContrast() {
        document.body.classList.remove('high-contrast');
        localStorage.setItem('high-contrast-mode', 'false');
        this.announce('High contrast mode disabled');
        this.highContrastEnabled = false;
    }

    /**
     * Set up font size controls
     */
    setupFontSizeControls() {
        // Load saved font size
        const saved = localStorage.getItem('font-scale');
        if (saved) {
            this.currentFontScale = parseFloat(saved);
            this.applyFontScale();
        }
    }

    /**
     * Adjust font size
     */
    adjustFontSize(delta) {
        this.currentFontScale = Math.max(0.5, Math.min(2.0, this.currentFontScale + delta));
        this.applyFontScale();
        
        localStorage.setItem('font-scale', this.currentFontScale.toString());
        
        const percentage = Math.round(this.currentFontScale * 100);
        this.announce(`Font size set to ${percentage}%`);
    }

    /**
     * Reset font size to default
     */
    resetFontSize() {
        this.currentFontScale = 1;
        this.applyFontScale();
        
        localStorage.removeItem('font-scale');
        this.announce('Font size reset to default');
    }

    /**
     * Apply font scale to document
     */
    applyFontScale() {
        document.documentElement.style.fontSize = `${this.baseFontSize * this.currentFontScale}px`;
    }

    /**
     * Detect motion preferences
     */
    detectMotionPreferences() {
        // Check for prefers-reduced-motion
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = mediaQuery.matches;
        
        // Listen for changes
        mediaQuery.addListener((e) => {
            this.prefersReducedMotion = e.matches;
            this.updateMotionPreferences();
        });
        
        this.updateMotionPreferences();
    }

    /**
     * Update motion preferences
     */
    updateMotionPreferences() {
        if (this.prefersReducedMotion) {
            document.body.classList.add('reduced-motion');
            
            // Add reduced motion styles
            const style = document.createElement('style');
            style.textContent = `
                .reduced-motion *,
                .reduced-motion *:before,
                .reduced-motion *:after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            document.body.classList.remove('reduced-motion');
        }
    }

    /**
     * Set up mobile accessibility
     */
    setupMobileAccessibility() {
        // Add touch-friendly focus indicators
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                button, .btn, input, select, textarea {
                    min-height: 44px;
                    min-width: 44px;
                }
                
                .accessibility-toggle {
                    width: 60px;
                    height: 60px;
                    font-size: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle global keydown events
     */
    handleGlobalKeydown(event) {
        // Handle focus trap
        if (this.trapActive && event.key === 'Tab') {
            this.handleFocusTrap(event);
        }
    }

    /**
     * Handle escape key
     */
    handleEscape() {
        // Close accessibility panel
        const options = document.getElementById('accessibility-options');
        if (options && !options.hasAttribute('hidden')) {
            options.setAttribute('hidden', '');
            const toggle = document.getElementById('accessibility-toggle');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
                toggle.focus();
            }
        }
        
        // Clear focus trap
        if (this.trapActive) {
            this.releaseFocusTrap();
        }
    }

    /**
     * Create focus trap for modal dialogs
     */
    createFocusTrap(container) {
        this.trapContainer = container;
        this.trapActive = true;
        
        // Get focusable elements
        const focusable = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }

    /**
     * Handle focus trap tab navigation
     */
    handleFocusTrap(event) {
        if (!this.trapContainer) return;
        
        const focusable = this.trapContainer.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstFocusable) {
                event.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastFocusable) {
                event.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    /**
     * Release focus trap
     */
    releaseFocusTrap() {
        this.trapActive = false;
        this.trapContainer = null;
    }

    /**
     * Bind global events
     */
    bindGlobalEvents() {
        document.addEventListener('keydown', this.boundHandlers.keydown);
        window.addEventListener('resize', this.boundHandlers.resize);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Reposition accessibility panel if needed
        const panel = document.querySelector('.accessibility-panel');
        if (panel) {
            // Ensure panel stays within viewport
            const rect = panel.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                panel.style.right = '10px';
            }
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        document.removeEventListener('focusin', this.boundHandlers.focusin);
        document.removeEventListener('focusout', this.boundHandlers.focusout);
        window.removeEventListener('resize', this.boundHandlers.resize);
        
        // Remove announcer
        if (this.announcer && this.announcer.parentNode) {
            this.announcer.parentNode.removeChild(this.announcer);
        }
        
        // Release focus trap
        this.releaseFocusTrap();
        
        this.isInitialized = false;
        console.log('Accessibility Manager destroyed');
    }
}

// Initialize the accessibility manager when DOM is ready
if (typeof window !== 'undefined') {
    window.AccessibilityManager = new AccessibilityManager();
    
    // Auto-initialize if DOM is already ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.AccessibilityManager.init();
        });
    } else {
        window.AccessibilityManager.init();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
}
