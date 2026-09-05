/**
 * Transliteration App - Main transliteration functionality
 * Uses AI4Bharat's IndicXlit for accurate transliteration
 * Author: AICTE Team
 * Version: 1.0.0
 */

class TransliterationApp {
    constructor() {
        this.languages = {
            'en': {
                name: 'English',
                code: 'en',
                script: 'Latin',
                example: 'Hello'
            },
            'hi': {
                name: 'Hindi (Devanagari)',
                code: 'hi',
                script: 'Devanagari',
                example: 'नमस्ते'
            },
            'ta': {
                name: 'Tamil',
                code: 'ta',
                script: 'Tamil',
                example: 'வணக்கம்'
            },
            'te': {
                name: 'Telugu',
                code: 'te',
                script: 'Telugu',
                example: 'నమస్కారం'
            },
            'ml': {
                name: 'Malayalam',
                code: 'ml',
                script: 'Malayalam',
                example: 'നമസ്കാരം'
            },
            'kn': {
                name: 'Kannada',
                code: 'kn',
                script: 'Kannada',
                example: 'ನಮಸ್ಕಾರ'
            },
            'pa': {
                name: 'Punjabi (Gurmukhi)',
                code: 'pa',
                script: 'Gurmukhi',
                example: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'
            },
            'gu': {
                name: 'Gujarati',
                code: 'gu',
                script: 'Gujarati',
                example: 'નમસ્તે'
            },
            'bn': {
                name: 'Bengali',
                code: 'bn',
                script: 'Bengali',
                example: 'নমস্কার'
            },
            'or': {
                name: 'Odia',
                code: 'or',
                script: 'Odia',
                example: 'ନମସ୍କାର'
            }
        };

        this.apiEndpoint = 'https://xlit-api.ai4bharat.org/tl';
        this.alternateEndpoints = [
            'https://xlit-iitm.ai4bharat.org/',
            'https://xlit.ai4bharat.org/translate',
            'https://indicxlit.ai4bharat.org/api/tl'
        ];
        this.maxTextLength = 5000;
        this.isTransliterating = false;
        this.phoneticMode = false;
        this.apiTimeout = 10000; // 10 seconds timeout
        this.apiAvailable = false;
        
        // DOM elements
        this.elements = {};
        
        // Event handlers bound to this instance
        this.boundHandlers = {
            transliterate: this.transliterate.bind(this),
            swapLanguages: this.swapLanguages.bind(this),
            clearAll: this.clearAll.bind(this),
            copyResult: this.copyResult.bind(this),
            autoDetect: this.autoDetectLanguage.bind(this),
            inputChange: this.handleInputChange.bind(this),
            languageChange: this.handleLanguageChange.bind(this)
        };
    }

    /**
     * Initialize the transliteration application
     */
    init() {
        console.log('Initializing Transliteration App...');
        
        // Get DOM elements
        this.initElements();
        
        // Check if we're on the transliteration page
        if (!this.elements.inputText) {
            console.log('Not on transliteration page, skipping init');
            return;
        }
        
        // Bind event listeners
        this.bindEventListeners();
        
        // Initialize UI state
        this.initUIState();
        
        // Check for example to load from gallery
        this.loadExampleFromGallery();
        
        // Test API connectivity
        this.testAPIConnectivity();
        
        console.log('Transliteration App initialized successfully');
    }

    /**
     * Get and store DOM element references
     */
    initElements() {
        this.elements = {
            // Language selectors
            sourceLanguage: document.getElementById('source-language'),
            targetLanguage: document.getElementById('target-language'),
            swapBtn: document.querySelector('.swap-btn'),
            
            // Text areas
            inputText: document.getElementById('input-text'),
            outputText: document.getElementById('output-text'),
            charCountInput: document.getElementById('char-count-input'),
            charCountOutput: document.getElementById('char-count-output'),
            
            // Action buttons
            transliterateBtn: document.getElementById('transliterate-btn'),
            copyBtn: document.getElementById('copy-btn'),
            clearBtn: document.getElementById('clear-btn'),
            autoDetectBtn: document.getElementById('auto-detect-btn'),
            
            // Phonetic mode
            phoneticModeCheckbox: document.getElementById('phonetic-mode'),
            
            // Status container
            statusContainer: document.getElementById('status-container')
        };
    }

    /**
     * Bind event listeners to DOM elements
     */
    bindEventListeners() {
        // Button events
        if (this.elements.transliterateBtn) {
            this.elements.transliterateBtn.addEventListener('click', this.boundHandlers.transliterate);
        }
        
        if (this.elements.swapBtn) {
            this.elements.swapBtn.addEventListener('click', this.boundHandlers.swapLanguages);
        }
        
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', this.boundHandlers.clearAll);
        }
        
        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', this.boundHandlers.copyResult);
        }
        
        if (this.elements.autoDetectBtn) {
            this.elements.autoDetectBtn.addEventListener('click', this.boundHandlers.autoDetect);
        }
        
        // Input events
        if (this.elements.inputText) {
            this.elements.inputText.addEventListener('input', this.boundHandlers.inputChange);
            this.elements.inputText.addEventListener('paste', this.boundHandlers.inputChange);
        }
        
        // Language change events
        if (this.elements.sourceLanguage) {
            this.elements.sourceLanguage.addEventListener('change', this.boundHandlers.languageChange);
        }
        
        if (this.elements.targetLanguage) {
            this.elements.targetLanguage.addEventListener('change', this.boundHandlers.languageChange);
        }
        
        // Phonetic mode toggle
        if (this.elements.phoneticModeCheckbox) {
            this.elements.phoneticModeCheckbox.addEventListener('change', this.handlePhoneticModeChange.bind(this));
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.transliterate();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.clearAll();
                        break;
                    case 'c':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.copyResult();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Initialize UI state
     */
    initUIState() {
        // Update character counts
        this.updateCharacterCount();
        
        // Update button states
        this.updateButtonStates();
        
        // Show keyboard shortcuts info
        this.showKeyboardShortcuts();
    }

    /**
     * Test API connectivity on initialization
     */
    async testAPIConnectivity() {
        const endpoints = [this.apiEndpoint, ...this.alternateEndpoints];
        
        for (const endpoint of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(endpoint, {
                    method: 'HEAD',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok || response.status === 405) {
                    console.log('API connectivity test: OK with endpoint:', endpoint);
                    this.apiAvailable = true;
                    this.workingEndpoint = endpoint;
                    return; // Found working endpoint
                }
                
            } catch (error) {
                console.log(`Endpoint ${endpoint} test failed:`, error.message);
                continue; // Try next endpoint
            }
        }
        
        // No working endpoints found
        console.log('API connectivity test: All endpoints failed');
        this.apiAvailable = false;
        
        // Show one-time notification about offline mode
        setTimeout(() => {
            this.showStatus('Running in offline mode. Using built-in word mappings for transliteration.', 'info');
        }, 2000);
    }

    /**
     * Load example from gallery if available
     */
    loadExampleFromGallery() {
        try {
            const exampleData = sessionStorage.getItem('exampleToTry');
            if (exampleData) {
                const example = JSON.parse(exampleData);
                
                // Set language selections
                if (this.elements.sourceLanguage && example.source) {
                    this.elements.sourceLanguage.value = example.source;
                }
                
                if (this.elements.targetLanguage && example.target) {
                    this.elements.targetLanguage.value = example.target;
                }
                
                // Set input text
                if (this.elements.inputText && example.text) {
                    this.elements.inputText.value = example.text;
                    this.updateCharacterCount();
                }
                
                // Update button states
                this.updateButtonStates();
                
                // Clear the session storage
                sessionStorage.removeItem('exampleToTry');
                
                // Show status message
                this.showStatus('Example loaded from gallery. Click "Transliterate" to see the result.', 'success');
                
                // Auto-transliterate after a short delay
                setTimeout(() => {
                    this.transliterate();
                }, 1000);
            }
        } catch (error) {
            console.error('Error loading example from gallery:', error);
        }
    }

    /**
     * Handle input text changes
     */
    handleInputChange() {
        this.updateCharacterCount();
        this.updateButtonStates();
        
        // Clear output if input is empty
        if (!this.elements.inputText.value.trim() && this.elements.outputText) {
            this.elements.outputText.value = '';
            this.updateOutputCharCount();
        }
    }

    /**
     * Handle language selection changes
     */
    handleLanguageChange() {
        this.updateButtonStates();
        
        // Auto-transliterate if there's input text
        if (this.elements.inputText && this.elements.inputText.value.trim() && 
            this.elements.sourceLanguage && this.elements.targetLanguage &&
            this.elements.sourceLanguage.value && this.elements.targetLanguage.value) {
            
            // Debounce auto-transliteration
            clearTimeout(this.autoTransliterateTimeout);
            this.autoTransliterateTimeout = setTimeout(() => {
                this.transliterate();
            }, 500);
        }
    }

    /**
     * Handle phonetic mode toggle
     */
    handlePhoneticModeChange() {
        this.phoneticMode = this.elements.phoneticModeCheckbox?.checked || false;
        
        // Show status message
        this.showStatus(
            this.phoneticMode 
                ? 'Phonetic mode enabled - words will be transliterated by sound' 
                : 'Phonetic mode disabled - words will be transliterated by meaning',
            'info'
        );
        
        // Auto-retransliterate if there's input text
        if (this.elements.inputText && this.elements.inputText.value.trim() && 
            this.elements.sourceLanguage && this.elements.targetLanguage &&
            this.elements.sourceLanguage.value && this.elements.targetLanguage.value) {
            
            // Re-transliterate with new mode
            setTimeout(() => {
                this.transliterate();
            }, 200);
        }
    }

    /**
     * Update character count displays
     */
    updateCharacterCount() {
        if (this.elements.inputText && this.elements.charCountInput) {
            const currentLength = this.elements.inputText.value.length;
            this.elements.charCountInput.textContent = `${currentLength} / ${this.maxTextLength}`;
            
            // Change color based on usage
            if (currentLength > this.maxTextLength * 0.9) {
                this.elements.charCountInput.style.color = 'var(--danger)';
            } else if (currentLength > this.maxTextLength * 0.7) {
                this.elements.charCountInput.style.color = 'var(--warning)';
            } else {
                this.elements.charCountInput.style.color = 'var(--dark-gray)';
            }
        }
        
        this.updateOutputCharCount();
    }

    /**
     * Update output character count
     */
    updateOutputCharCount() {
        if (this.elements.outputText && this.elements.charCountOutput) {
            const outputLength = this.elements.outputText.value.length;
            this.elements.charCountOutput.textContent = `${outputLength} characters`;
        }
    }

    /**
     * Update button states based on current input
     */
    updateButtonStates() {
        const hasInput = this.elements.inputText && this.elements.inputText.value.trim();
        const hasLanguages = this.elements.sourceLanguage && this.elements.targetLanguage &&
                           this.elements.sourceLanguage.value && this.elements.targetLanguage.value;
        const hasOutput = this.elements.outputText && this.elements.outputText.value.trim();
        
        // Transliterate button
        if (this.elements.transliterateBtn) {
            this.elements.transliterateBtn.disabled = !hasInput || !hasLanguages || this.isTransliterating;
        }
        
        // Copy button
        if (this.elements.copyBtn) {
            this.elements.copyBtn.disabled = !hasOutput;
        }
        
        // Auto-detect button
        if (this.elements.autoDetectBtn) {
            this.elements.autoDetectBtn.disabled = !hasInput;
        }
    }

    /**
     * Main transliteration function
     */
    async transliterate() {
        if (this.isTransliterating) {
            return;
        }

        try {
            // Validate inputs
            const inputText = this.elements.inputText?.value.trim();
            const sourceLanguage = this.elements.sourceLanguage?.value;
            const targetLanguage = this.elements.targetLanguage?.value;

            if (!inputText) {
                this.showStatus('Please enter text to transliterate.', 'error');
                return;
            }

            if (!sourceLanguage || !targetLanguage) {
                this.showStatus('Please select both source and target languages.', 'error');
                return;
            }

            if (sourceLanguage === targetLanguage) {
                this.showStatus('Source and target languages cannot be the same.', 'error');
                return;
            }

            if (inputText.length > this.maxTextLength) {
                this.showStatus(`Text is too long. Maximum ${this.maxTextLength} characters allowed.`, 'error');
                return;
            }

            // Set loading state
            this.setLoadingState(true);
            this.showStatus('Transliterating...', 'info');

            // Perform transliteration
            const result = await this.performTransliteration(inputText, sourceLanguage, targetLanguage);

            if (result && result.transliterated_text) {
                // Success
                this.elements.outputText.value = result.transliterated_text;
                this.updateOutputCharCount();
                this.updateButtonStates();
                
                // Save to history
                if (window.HistoryManager) {
                    window.HistoryManager.addEntry({
                        sourceText: inputText,
                        targetText: result.transliterated_text,
                        sourceLanguage: sourceLanguage,
                        targetLanguage: targetLanguage,
                        timestamp: Date.now()
                    });
                }
                
                // Show appropriate success message
                if (result.isFailback) {
                    this.showStatus('Transliteration completed using offline mode (AI API unavailable)', 'warning');
                } else {
                    this.showStatus('Transliteration completed successfully!', 'success');
                }
                
                // Announce to screen readers
                this.announceToScreenReader(`Transliteration completed. Result: ${result.transliterated_text}`);
                
            } else {
                throw new Error('Invalid response from transliteration service');
            }

        } catch (error) {
            console.error('Transliteration error:', error);
            
            // Provide specific error messages based on error type
            if (error.name === 'AbortError') {
                this.showStatus('Transliteration timed out. Please try again with shorter text.', 'error');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                this.showStatus('Network error. Using offline transliteration mode.', 'warning');
                // Try fallback one more time
                try {
                    const inputText = this.elements.inputText?.value.trim();
                    const sourceLanguage = this.elements.sourceLanguage?.value;
                    const targetLanguage = this.elements.targetLanguage?.value;
                    
                    const fallbackResult = this.getFallbackTransliteration(inputText, sourceLanguage, targetLanguage);
                    this.elements.outputText.value = fallbackResult;
                    this.updateOutputCharCount();
                    this.updateButtonStates();
                    
                    this.showStatus('Transliteration completed in offline mode.', 'success');
                } catch (fallbackError) {
                    this.showStatus('Transliteration failed. Please check your input and try again.', 'error');
                }
            } else {
                this.showStatus('Transliteration failed. Please try again or use shorter text.', 'error');
            }
            
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Perform the actual transliteration API call
     */
    async performTransliteration(text, sourceLang, targetLang) {
        // Try multiple endpoints
        const endpoints = [this.apiEndpoint, ...this.alternateEndpoints];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`Trying endpoint: ${endpoint}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        input: text,
                        source: sourceLang,
                        target: targetLang,
                        numOptions: 1
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && (data.output || data.transliterated_text || data.result)) {
                        console.log('API transliteration successful with endpoint:', endpoint);
                        return {
                            transliterated_text: data.output || data.transliterated_text || data.result
                        };
                    }
                }
                
                console.log(`Endpoint ${endpoint} responded with status: ${response.status}`);
                
            } catch (endpointError) {
                console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
                continue; // Try next endpoint
            }
        }
        
        // All endpoints failed, use fallback
        console.log('All API endpoints failed, using fallback transliteration');
        const fallbackResult = this.getFallbackTransliteration(text, sourceLang, targetLang);
        
        return {
            transliterated_text: fallbackResult,
            isFailback: true
        };
    }

    /**
     * Fallback transliteration for common words
     */
    getFallbackTransliteration(text, sourceLang, targetLang) {
        // Separate mappings for semantic (meaning-based) and phonetic (sound-based) transliteration
        const semanticTransliterations = {
            // English to Indian languages
            'en-hi': {
                'hello': 'हैलो',
                'hi': 'हाय',
                'thank you': 'धन्यवाद',
                'thanks': 'धन्यवाद',
                'good': 'गुड',
                'good meaning': 'अच्छा',
                'yes': 'यस',
                'no': 'नो',
                'water': 'वाटर',
                'food': 'फूड',
                'home': 'होम',
                'house': 'हाउस',
                'school': 'स्कूल',
                'hospital': 'हॉस्पिटल',
                'namaste': 'नमस्ते',
                'welcome': 'वेलकम',
                'street': 'स्ट्रीट',
                'road': 'रोड',
                'stop': 'स्टॉप',
                'go': 'गो',
                'come': 'कम',
                'left': 'लेफ्ट',
                'right': 'राइट',
                'straight': 'स्ट्रेट',
                'please': 'प्लीज',
                'sorry': 'सॉरी',
                'excuse me': 'एक्सक्यूज मी'
            },
            'en-ta': {
                'hello': 'ஹலோ',
                'hi': 'ஹாய்',
                'thank you': 'நன்றி',
                'thanks': 'நன்றி',
                'good': 'குட்',
                'good meaning': 'நல்ல',
                'yes': 'ஆம்',
                'no': 'இல்லை',
                'water': 'தண்ணீர்',
                'food': 'உணவு',
                'home': 'வீடு',
                'house': 'வீடு',
                'school': 'பள்ளி',
                'hospital': 'மருத்துவமனை',
                'namaste': 'வணக்கம்',
                'vanakkam': 'வணக்கம்',
                'welcome': 'வரவேற்க',
                'street': 'ஸ்ட்ரீட்',
                'road': 'சாலை',
                'stop': 'ஸ்டாப்',
                'go': 'போ',
                'come': 'கம்',
                'left': 'லெப்ட்',
                'right': 'ரைட்',
                'straight': 'ஸ்ட்ரெய்ட்',
                'please': 'ப்ளீஸ்',
                'sorry': 'சாரி',
                'excuse me': 'எக்ஸ்க்யூஸ் மீ'
            },
            'en-te': {
                'hello': 'హలో',
                'thank you': 'ధన్యవాదాలు',
                'good': 'మంచి',
                'yes': 'అవును',
                'no': 'లేదు',
                'water': 'నీరు',
                'food': 'ఆహారం',
                'home': 'ఇల్లు',
                'school': 'పాఠశాల',
                'hospital': 'ఆసుపత్రి',
                'namaste': 'నమస్కారం',
                'street': 'వీధి',
                'road': 'రోడ్డు',
                'stop': 'ఆగు',
                'go': 'వెళ్లు',
                'left': 'ఎడమ',
                'right': 'కుడి',
                'straight': 'సూటిగా'
            },
            'en-ml': {
                'hello': 'ഹലോ',
                'thank you': 'നന്ദി',
                'good': 'നല്ല',
                'yes': 'അതെ',
                'no': 'ഇല്ല',
                'water': 'വെള്ളം',
                'food': 'ഭക്ഷണം',
                'home': 'വീട്',
                'school': 'സ്കൂൾ',
                'hospital': 'ആശുപത്രി',
                'namaste': 'നമസ്കാരം',
                'street': 'തെരുവ്',
                'road': 'റോഡ്',
                'stop': 'നിർത്തുക',
                'go': 'പോകുക',
                'left': 'ഇടത്',
                'right': 'വലത്',
                'straight': 'നേരെ'
            },
            'en-kn': {
                'hello': 'ಹಲೋ',
                'thank you': 'ಧನ್ಯವಾದಗಳು',
                'good': 'ಒಳ್ಳೆಯ',
                'yes': 'ಹೌದು',
                'no': 'ಇಲ್ಲ',
                'water': 'ನೀರು',
                'food': 'ಆಹಾರ',
                'home': 'ಮನೆ',
                'school': 'ಶಾಲೆ',
                'hospital': 'ಆಸ್ಪತ್ರೆ',
                'namaste': 'ನಮಸ್ಕಾರ',
                'street': 'ಬೀದಿ',
                'road': 'ರಸ್ತೆ',
                'stop': 'ನಿಲ್ಲಿಸು',
                'go': 'ಹೋಗು',
                'left': 'ಎಡ',
                'right': 'ಬಲ',
                'straight': 'ನೇರವಾಗಿ'
            },
            'en-gu': {
                'hello': 'હેલો',
                'thank you': 'આભાર',
                'good': 'સારું',
                'yes': 'હા',
                'no': 'ના',
                'water': 'પાણી',
                'food': 'ખોરાક',
                'home': 'ઘર',
                'school': 'શાળા',
                'hospital': 'હોસ્પિટલ',
                'namaste': 'નમસ્તે',
                'street': 'શેરી',
                'road': 'રસ્તો',
                'stop': 'બંધ કરો',
                'go': 'જાઓ',
                'left': 'ડાબે',
                'right': 'જમણે',
                'straight': 'સીધું'
            },
            'en-bn': {
                'hello': 'হ্যালো',
                'thank you': 'ধন্যবাদ',
                'good': 'ভাল',
                'yes': 'হ্যাঁ',
                'no': 'না',
                'water': 'পানি',
                'food': 'খাবার',
                'home': 'বাড়ি',
                'school': 'স্কুল',
                'hospital': 'হাসপাতাল',
                'namaste': 'নমস্কার',
                'street': 'রাস্তা',
                'road': 'সড়ক',
                'stop': 'থামো',
                'go': 'যাও',
                'left': 'বাম',
                'right': 'ডান',
                'straight': 'সোজা'
            },
            'en-pa': {
                'hello': 'ਹੈਲੋ',
                'thank you': 'ਧੰਨਵਾਦ',
                'good': 'ਚੰਗਾ',
                'yes': 'ਹਾਂ',
                'no': 'ਨਹੀਂ',
                'water': 'ਪਾਣੀ',
                'food': 'ਖਾਣਾ',
                'home': 'ਘਰ',
                'school': 'ਸਕੂਲ',
                'hospital': 'ਹਸਪਤਾਲ',
                'namaste': 'ਨਮਸਤੇ',
                'street': 'ਗਲੀ',
                'road': 'ਸੜਕ',
                'stop': 'ਰੁਕੋ',
                'go': 'ਜਾਓ',
                'left': 'ਖੱਬੇ',
                'right': 'ਸੱਜੇ',
                'straight': 'ਸਿੱਧੇ'
            },
            'en-or': {
                'hello': 'ହେଲୋ',
                'thank you': 'ଧନ୍ୟବାଦ',
                'good': 'ଭଲ',
                'yes': 'ହଁ',
                'no': 'ନା',
                'water': 'ପାଣି',
                'food': 'ଖାଦ୍ୟ',
                'home': 'ଘର',
                'school': 'ସ୍କୁଲ',
                'hospital': 'ଡାକ୍ତରଖାନା',
                'namaste': 'ନମସ୍କାର',
                'street': 'ରାସ୍ତା',
                'road': 'ସଡ଼କ',
                'stop': 'ବନ୍ଦ କର',
                'go': 'ଯାଅ',
                'left': 'ବାମ',
                'right': 'ଡାହାଣ',
                'straight': 'ସିଧା'
            },
            
            // Hindi to other languages
            'hi-ta': {
                'नमस्ते': 'நமஸ்தே',
                'धन्यवाद': 'தன்யவாத்',
                'अच्छा': 'அச்சா',
                'हां': 'ஹாம்',
                'नहीं': 'நஹீம்',
                'पानी': 'பானீ',
                'खाना': 'கானா',
                'घर': 'கர்',
                'स्कूल': 'ஸ்கூல்',
                'अस्पताल': 'அஸ்பதால்'
            },
            'hi-te': {
                'नमस्ते': 'నమస్తే',
                'धन्यवाद': 'ధన్యవాద్',
                'अच्छा': 'అచ్చా',
                'हां': 'హాం',
                'नहीं': 'నహీం',
                'पानी': 'పానీ',
                'खाना': 'ఖానా',
                'घर': 'ఘర్',
                'स्कूल': 'స్కూల్',
                'अस्पताल': 'అస్పతాల్'
            },
            'hi-ml': {
                'नमस्ते': 'നമസ്തേ',
                'धन्यवाद': 'ധന്യവാദ്',
                'अच्छा': 'അച്ഛാ',
                'हां': 'ഹാം',
                'नहीं': 'നഹീം',
                'पानी': 'പാനീ',
                'खाना': 'ഖാനാ',
                'घर': 'ഘർ',
                'स्कूल': 'സ്കൂൾ',
                'अस्पताल': 'അസ്പതാൾ'
            },
            'hi-kn': {
                'नमस्ते': 'ನಮಸ್ತೇ',
                'धन्यवाद': 'ಧನ್ಯವಾದ',
                'अच्छा': 'ಅಚ್ಛಾ',
                'हां': 'ಹಾಂ',
                'नहीं': 'ನಹೀಂ',
                'पानी': 'ಪಾನೀ',
                'खाना': 'ಖಾನಾ',
                'घर': 'ಘರ್',
                'स्कूल': 'ಸ್ಕೂಲ್',
                'अस्पताल': 'ಆಸ್ಪತಾಲ್'
            },
            'hi-gu': {
                'नमस्ते': 'નમસ્તે',
                'धन्यवाद': 'ધન્યવાદ',
                'अच्छा': 'અચ્છા',
                'हां': 'હા',
                'नहीं': 'નહીં',
                'पानी': 'પાણી',
                'खाना': 'ખાના',
                'घर': 'ઘર',
                'स्कूल': 'સ્કૂલ',
                'अस्पताल': 'હોસ્પિટલ'
            },
            'hi-bn': {
                'नमस्ते': 'নমস্তে',
                'धन्यवाद': 'ধন্যবাদ',
                'अच्छा': 'আচ্ছা',
                'हां': 'হ্যাঁ',
                'नहीं': 'না',
                'पानी': 'পানি',
                'खाना': 'খাবার',
                'घर': 'ঘর',
                'स्कूल': 'স্কুল',
                'अस्पताल': 'হাসপাতাল'
            },
            'hi-pa': {
                'नमस्ते': 'ਨਮਸਤੇ',
                'धन्यवाद': 'ਧੰਨਵਾਦ',
                'अच्छा': 'ਅੱਛਾ',
                'हां': 'ਹਾਂ',
                'नहीं': 'ਨਹੀਂ',
                'पानी': 'ਪਾਣੀ',
                'खाना': 'ਖਾਣਾ',
                'घर': 'ਘਰ',
                'स्कूल': 'ਸਕੂਲ',
                'अस्पताल': 'ਹਸਪਤਾਲ'
            },
            'hi-or': {
                'नमस्ते': 'ନମସ୍ତେ',
                'धन्यवाद': 'ଧନ୍ୟବାଦ',
                'अच्छा': 'ଆଚ୍ଛା',
                'हां': 'ହଁ',
                'नहीं': 'ନାହିଁ',
                'पानी': 'ପାଣି',
                'खाना': 'ଖାଇବା',
                'घर': 'ଘର',
                'स्कूल': 'ସ୍କୁଲ',
                'अस्पताल': 'ଡାକ୍ତରଖାନା'
            },
            
            // Indian languages to English (reverse mappings)
            'hi-en': {
                'नमस्ते': 'namaste',
                'धन्यवाद': 'thank you',
                'अच्छा': 'good',
                'हां': 'yes',
                'नहीं': 'no',
                'पानी': 'water',
                'खाना': 'food',
                'घर': 'home',
                'स्कूल': 'school',
                'अस्पताल': 'hospital',
                'सड़क': 'street',
                'मार्ग': 'road',
                'रुको': 'stop',
                'जाओ': 'go',
                'बाएं': 'left',
                'दाएं': 'right',
                'सीधे': 'straight'
            },
            'ta-en': {
                'வணக்கம்': 'namaste',
                'நன்றி': 'thank you',
                'நல்ல': 'good',
                'ஆம்': 'yes',
                'இல்லை': 'no',
                'தண்ணீர்': 'water',
                'உணவு': 'food',
                'வீடு': 'home',
                'பள்ளி': 'school',
                'மருத்துவமனை': 'hospital',
                'தெரு': 'street',
                'சாலை': 'road',
                'நிறுத்து': 'stop',
                'போ': 'go',
                'இடது': 'left',
                'வலது': 'right',
                'நேராக': 'straight'
            },
            'te-en': {
                'నమస్కారం': 'namaste',
                'ధన్యవాదాలు': 'thank you',
                'మంచి': 'good',
                'అవును': 'yes',
                'లేదు': 'no',
                'నీరు': 'water',
                'ఆహారం': 'food',
                'ఇల్లు': 'home',
                'పాఠశాల': 'school',
                'ఆసుపత్రి': 'hospital',
                'వీధి': 'street',
                'రోడ్డు': 'road',
                'ఆగు': 'stop',
                'వెళ్లు': 'go',
                'ఎడమ': 'left',
                'కుడి': 'right',
                'సూటిగా': 'straight'
            },
            'ml-en': {
                'നമസ്കാരം': 'namaste',
                'നന്ദി': 'thank you',
                'നല്ല': 'good',
                'അതെ': 'yes',
                'ഇല്ല': 'no',
                'വെള്ളം': 'water',
                'ഭക്ഷണം': 'food',
                'വീട്': 'home',
                'സ്കൂൾ': 'school',
                'ആശുപത്രി': 'hospital',
                'തെരുവ്': 'street',
                'റോഡ്': 'road',
                'നിർത്തുക': 'stop',
                'പോകുക': 'go',
                'ഇടത്': 'left',
                'വലത്': 'right',
                'നേരെ': 'straight'
            },
            'kn-en': {
                'ನಮಸ್ಕಾರ': 'namaste',
                'ಧನ್ಯವಾದಗಳು': 'thank you',
                'ಒಳ್ಳೆಯ': 'good',
                'ಹೌದು': 'yes',
                'ಇಲ್ಲ': 'no',
                'ನೀರು': 'water',
                'ಆಹಾರ': 'food',
                'ಮನೆ': 'home',
                'ಶಾಲೆ': 'school',
                'ಆಸ್ಪತ್ರೆ': 'hospital',
                'ಬೀದಿ': 'street',
                'ರಸ್ತೆ': 'road',
                'ನಿಲ್ಲಿಸು': 'stop',
                'ಹೋಗು': 'go',
                'ಎಡ': 'left',
                'ಬಲ': 'right',
                'ನೇರವಾಗಿ': 'straight'
            },
            'gu-en': {
                'નમસ્તે': 'namaste',
                'આભાર': 'thank you',
                'સારું': 'good',
                'હા': 'yes',
                'ના': 'no',
                'પાણી': 'water',
                'ખોરાક': 'food',
                'ઘર': 'home',
                'શાળા': 'school',
                'હોસ્પિટલ': 'hospital',
                'શેરી': 'street',
                'રસ્તો': 'road',
                'બંધ કરો': 'stop',
                'જાઓ': 'go',
                'ડાબે': 'left',
                'જમણે': 'right',
                'સીધું': 'straight'
            },
            'bn-en': {
                'নমস্কার': 'namaste',
                'ধন্যবাদ': 'thank you',
                'ভাল': 'good',
                'হ্যাঁ': 'yes',
                'না': 'no',
                'পানি': 'water',
                'খাবার': 'food',
                'বাড়ি': 'home',
                'স্কুল': 'school',
                'হাসপাতাল': 'hospital',
                'রাস্তা': 'street',
                'সড়ক': 'road',
                'থামো': 'stop',
                'যাও': 'go',
                'বাম': 'left',
                'ডান': 'right',
                'সোজা': 'straight'
            },
            'pa-en': {
                'ਨਮਸਤੇ': 'namaste',
                'ਧੰਨਵਾਦ': 'thank you',
                'ਚੰਗਾ': 'good',
                'ਹਾਂ': 'yes',
                'ਨਹੀਂ': 'no',
                'ਪਾਣੀ': 'water',
                'ਖਾਣਾ': 'food',
                'ਘਰ': 'home',
                'ਸਕੂਲ': 'school',
                'ਹਸਪਤਾਲ': 'hospital',
                'ਗਲੀ': 'street',
                'ਸੜਕ': 'road',
                'ਰੁਕੋ': 'stop',
                'ਜਾਓ': 'go',
                'ਖੱਬੇ': 'left',
                'ਸੱਜੇ': 'right',
                'ਸਿੱਧੇ': 'straight'
            },
            'or-en': {
                'ନମସ୍କାର': 'namaste',
                'ଧନ୍ୟବାଦ': 'thank you',
                'ଭଲ': 'good',
                'ହଁ': 'yes',
                'ନା': 'no',
                'ପାଣି': 'water',
                'ଖାଦ୍ୟ': 'food',
                'ଘର': 'home',
                'ସ୍କୁଲ': 'school',
                'ଡାକ୍ତରଖାନା': 'hospital',
                'ରାସ୍ତା': 'street',
                'ସଡ଼କ': 'road',
                'ବନ୍ଦ କର': 'stop',
                'ଯାଅ': 'go',
                'ବାମ': 'left',
                'ଡାହାଣ': 'right',
                'ସିଧା': 'straight'
            }
        };
        
        // Phonetic transliterations (sound-based)
        const phoneticTransliterations = {
            'en-hi': {
                'hello': 'हैलो',
                'hi': 'हाय',
                'good': 'गुड',
                'thank you': 'थैंक यू',
                'thanks': 'थैंक्स',
                'yes': 'यस',
                'no': 'नो',
                'water': 'वाटर',
                'food': 'फूड',
                'home': 'होम',
                'house': 'हाउस',
                'school': 'स्कूल',
                'hospital': 'हॉस्पिटल',
                'namaste': 'नमस्ते',
                'vanakkam': 'वनक्कम',
                'street': 'स्ट्रीट',
                'road': 'रोड',
                'stop': 'स्टॉप',
                'go': 'गो',
                'come': 'कम',
                'left': 'लेफ्ट',
                'right': 'राइट',
                'straight': 'स्ट्रेट',
                'please': 'प्लीज',
                'sorry': 'सॉरी'
            },
            'en-ta': {
                'hello': 'ஹலோ',
                'hi': 'ஹாய்',
                'good': 'குட்',
                'thank you': 'தேங்க் யூ',
                'thanks': 'தேங்க்ஸ்',
                'yes': 'யெஸ்',
                'no': 'நோ',
                'water': 'வாட்டர்',
                'food': 'ஃபுட்',
                'home': 'ஹோம்',
                'house': 'ஹவுஸ்',
                'school': 'ஸ்கூல்',
                'hospital': 'ஹாஸ்பிடல்',
                'namaste': 'நமஸ்தே',
                'vanakkam': 'வணக்கம்',
                'street': 'ஸ்ட்ரீட்',
                'road': 'ரோட்',
                'stop': 'ஸ்டாப்',
                'go': 'கோ',
                'come': 'கம்',
                'left': 'லெஃப்ட்',
                'right': 'ரைட்',
                'straight': 'ஸ்ட்ரெய்ட்',
                'please': 'ப்ளீஸ்',
                'sorry': 'சாரி'
            }
        };
        
        // Choose the appropriate mapping based on phonetic mode
        const activeTransliterations = this.phoneticMode ? phoneticTransliterations : semanticTransliterations;
        
        const langPair = `${sourceLang}-${targetLang}`;
        const reverseLangPair = `${targetLang}-${sourceLang}`;
        
        // Normalize text for better matching
        const normalizedText = text.toLowerCase().trim();
        
        // Check direct mapping (case-insensitive)
        if (activeTransliterations[langPair]) {
            // First try exact match
            if (activeTransliterations[langPair][text]) {
                return activeTransliterations[langPair][text];
            }
            
            // Then try case-insensitive match
            for (const [key, value] of Object.entries(activeTransliterations[langPair])) {
                if (key.toLowerCase() === normalizedText) {
                    return value;
                }
            }
        }
        
        // Check reverse mapping (case-insensitive)
        if (activeTransliterations[reverseLangPair]) {
            for (const [key, value] of Object.entries(activeTransliterations[reverseLangPair])) {
                if (value.toLowerCase() === normalizedText || key.toLowerCase() === normalizedText) {
                    return key;
                }
            }
        }
        
        // Simple phonetic approximation for unknown words
        return this.phoneticApproximation(text, sourceLang, targetLang);
    }

    /**
     * Comprehensive phonetic approximation using full alphabet ranges
     */
    phoneticApproximation(text, sourceLang, targetLang) {
        // Enhanced phonetic approximation with comprehensive letter mappings
        
        if (sourceLang === 'en') {
            const comprehensivePhoneticMappings = {
                'ta': {
                    // Tamil vowels (pure vowels)
                    'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'u': 'உ', 'uu': 'ஊ',
                    'e': 'எ', 'ee': 'ஏ', 'ai': 'ஐ', 'o': 'ஒ', 'oo': 'ஓ', 'au': 'ஔ',
                    
                    // Tamil consonants with inherent 'a'
                    'ka': 'க', 'kha': 'க', 'ga': 'க', 'gha': 'க', 'nga': 'ங',
                    'cha': 'ச', 'chha': 'ச', 'ja': 'ஜ', 'jha': 'ஜ', 'nya': 'ஞ',
                    'tta': 'ட', 'ttha': 'ட', 'dda': 'ட', 'ddha': 'ட', 'nna': 'ண',
                    'ta': 'த', 'tha': 'த', 'da': 'த', 'dha': 'த', 'na': 'ந',
                    'pa': 'ப', 'pha': 'ப', 'ba': 'ப', 'bha': 'ப', 'ma': 'ம',
                    'ya': 'ய', 'ra': 'ர', 'rra': 'ற', 'la': 'ல', 'lla': 'ள',
                    'zha': 'ழ', 'va': 'வ', 'sha': 'ஶ', 'ssa': 'ஷ', 'sa': 'ஸ', 'ha': 'ஹ',
                    
                    // Tamil consonants without vowel (pulli)
                    'k': 'க்', 'g': 'க்', 'ng': 'ங்', 'ch': 'ச்', 'j': 'ஜ்', 'ny': 'ஞ்',
                    'tt': 'ட்', 'dd': 'ட்', 'nn': 'ண்', 't': 'த்', 'th': 'த்', 'd': 'த்', 'n': 'ந்',
                    'p': 'ப்', 'b': 'ப்', 'f': 'ஃப்', 'm': 'ம்', 'y': 'ய்', 'r': 'ர்',
                    'rr': 'ற்', 'l': 'ல்', 'll': 'ள்', 'zh': 'ழ்', 'v': 'வ்', 'w': 'வ்',
                    's': 'ஸ்', 'sh': 'ஷ்', 'h': 'ஹ்', 'x': 'க்ஸ்', 'z': 'ஜ்',
                    
                    // Combined sounds
                    'kk': 'க்க', 'gg': 'க்க', 'tt': 'த்த', 'dd': 'த்த', 'pp': 'ப்ப',
                    'bb': 'ப்ப', 'mm': 'ம்ம', 'nn': 'ன்ன', 'rr': 'ர்ர', 'll': 'ல்ல',
                    'ss': 'ஸ்ஸ', 'ff': 'ஃப்ஃப்',
                    
                    // English specific sounds
                    'qu': 'க்வ', 'ck': 'க்', 'ph': 'ஃப்', 'gh': 'க்', 'wh': 'வ்',
                    'ng': 'ங்', 'nk': 'ங்க்', 'mb': 'ம்ப்', 'mp': 'ம்ப்',
                    'nt': 'ந்த்', 'nd': 'ந்த்', 'st': 'ஸ்த்', 'sp': 'ஸ்ப்',
                    'sk': 'ஸ்க்', 'sl': 'ஸ்ல்', 'sm': 'ஸ்ம்', 'sn': 'ஸ்ன்',
                    'sw': 'ஸ்வ்', 'tr': 'த்ர்', 'dr': 'த்ர்', 'br': 'ப்ர்',
                    'pr': 'ப்ர்', 'fr': 'ஃப்ர்', 'gr': 'க்ர்', 'kr': 'க்ர்',
                    'bl': 'ப்ல்', 'pl': 'ப்ல்', 'fl': 'ஃப்ல்', 'gl': 'க்ல்',
                    'cl': 'க்ல்', 'scr': 'ஸ்க்ர்', 'str': 'ஸ்த்ர்', 'spr': 'ஸ்ப்ர்'
                },
                
                'hi': {
                    // Hindi vowels
                    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ',
                    'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'ri': 'ऋ',
                    
                    // Hindi consonants with inherent 'a'
                    'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'nga': 'ङ',
                    'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ', 'nya': 'ञ',
                    'tta': 'ट', 'ttha': 'ठ', 'dda': 'ड', 'ddha': 'ढ', 'nna': 'ण',
                    'ta': 'त', 'tha': 'थ', 'da': 'द', 'dha': 'ध', 'na': 'न',
                    'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
                    'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
                    'sha': 'श', 'ssa': 'ष', 'sa': 'स', 'ha': 'ह',
                    
                    // Hindi consonants without vowel (halant)
                    'k': 'क्', 'kh': 'ख्', 'g': 'ग्', 'gh': 'घ्', 'ng': 'ङ्',
                    'ch': 'च्', 'chh': 'छ्', 'j': 'ज्', 'jh': 'झ्', 'ny': 'ञ्',
                    'tt': 'ट्', 'tth': 'ठ्', 'dd': 'ड्', 'ddh': 'ढ्', 'nn': 'ण्',
                    't': 'त्', 'th': 'थ्', 'd': 'द्', 'dh': 'ध्', 'n': 'न्',
                    'p': 'प्', 'ph': 'फ्', 'f': 'फ्', 'b': 'ब्', 'bh': 'भ्', 'm': 'म्',
                    'y': 'य्', 'r': 'र्', 'l': 'ल्', 'v': 'व्', 'w': 'व्',
                    'sh': 'श्', 'ss': 'ष्', 's': 'स्', 'h': 'ह्', 'x': 'क्स्', 'z': 'ज्',
                    
                    // Combined sounds
                    'qu': 'क्व', 'ck': 'क्', 'gh': 'ग्', 'wh': 'व्',
                    'nk': 'ङ्क्', 'mb': 'म्ब्', 'mp': 'म्प्', 'nt': 'न्त्', 'nd': 'न्द्',
                    'st': 'स्त्', 'sp': 'स्प्', 'sk': 'स्क्', 'sl': 'स्ल्',
                    'sm': 'स्म्', 'sn': 'स्न्', 'sw': 'स्व्', 'tr': 'त्र्',
                    'dr': 'द्र्', 'br': 'ब्र्', 'pr': 'प्र्', 'fr': 'फ्र्',
                    'gr': 'ग्र्', 'kr': 'क्र्', 'bl': 'ब्ल्', 'pl': 'प्ल्',
                    'fl': 'फ्ल्', 'gl': 'ग्ल्', 'cl': 'क्ल्'
                },
                
                'te': {
                    // Telugu vowels
                    'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'u': 'ఉ', 'uu': 'ఊ',
                    'e': 'ఎ', 'ee': 'ఏ', 'ai': 'ఐ', 'o': 'ఒ', 'oo': 'ఓ', 'au': 'ఔ',
                    
                    // Telugu consonants
                    'ka': 'క', 'kha': 'ఖ', 'ga': 'గ', 'gha': 'ఘ', 'nga': 'ఙ',
                    'cha': 'చ', 'chha': 'ఛ', 'ja': 'జ', 'jha': 'ఝ', 'nya': 'ఞ',
                    'tta': 'ట', 'ttha': 'ఠ', 'dda': 'డ', 'ddha': 'ఢ', 'nna': 'ణ',
                    'ta': 'త', 'tha': 'థ', 'da': 'ద', 'dha': 'ధ', 'na': 'న',
                    'pa': 'ప', 'pha': 'ఫ', 'ba': 'బ', 'bha': 'భ', 'ma': 'మ',
                    'ya': 'య', 'ra': 'ర', 'rra': 'ఱ', 'la': 'ల', 'lla': 'ళ',
                    'va': 'వ', 'sha': 'శ', 'ssa': 'ష', 'sa': 'స', 'ha': 'హ',
                    
                    'k': 'క్', 'g': 'గ్', 'ch': 'చ్', 'j': 'జ్', 't': 'త్', 'd': 'ద్',
                    'n': 'న్', 'p': 'ప్', 'b': 'బ్', 'm': 'మ్', 'y': 'య్',
                    'r': 'ర్', 'l': 'ల్', 'v': 'వ్', 's': 'స్', 'h': 'హ్'
                }
            };
            
            // Use comprehensive phonetic conversion
            if (comprehensivePhoneticMappings[targetLang]) {
                let result = '';
                const mapping = comprehensivePhoneticMappings[targetLang];
                const normalizedText = text.toLowerCase();
                
                // Enhanced syllable-based approximation with comprehensive matching
                let i = 0;
                while (i < normalizedText.length) {
                    let matched = false;
                    
                    // Try 4-character combinations first (for sounds like 'scr', 'str')
                    if (i <= normalizedText.length - 4) {
                        const fourChar = normalizedText.substring(i, i + 4);
                        if (mapping[fourChar]) {
                            result += mapping[fourChar];
                            i += 4;
                            matched = true;
                        }
                    }
                    
                    // Try 3-character combinations (like 'cha', 'kha', 'str')
                    if (!matched && i <= normalizedText.length - 3) {
                        const threeChar = normalizedText.substring(i, i + 3);
                        if (mapping[threeChar]) {
                            result += mapping[threeChar];
                            i += 3;
                            matched = true;
                        }
                    }
                    
                    // Try 2-character combinations (like 'ch', 'th', 'ng')
                    if (!matched && i <= normalizedText.length - 2) {
                        const twoChar = normalizedText.substring(i, i + 2);
                        if (mapping[twoChar]) {
                            result += mapping[twoChar];
                            i += 2;
                            matched = true;
                        }
                    }
                    
                    // Try single character
                    if (!matched) {
                        const char = normalizedText[i];
                        if (mapping[char]) {
                            result += mapping[char];
                        } else if (char === ' ') {
                            result += ' ';
                        } else {
                            // For unknown characters, try closest approximation
                            const approximations = {
                                'ta': { 'c': 'ச்', 'q': 'க்', 'x': 'க்ஸ்', 'z': 'ஜ்' },
                                'hi': { 'c': 'च्', 'q': 'क्', 'x': 'क्स्', 'z': 'ज्' },
                                'te': { 'c': 'చ్', 'q': 'క్', 'x': 'క్స్', 'z': 'జ్' }
                            };
                            
                            if (approximations[targetLang] && approximations[targetLang][char]) {
                                result += approximations[targetLang][char];
                            } else {
                                result += char; // Keep unknown characters as-is
                            }
                        }
                        i++;
                    }
                }
                
                if (result && result !== text.toLowerCase()) {
                    return result;
                }
            }
        }
        
        // For other language pairs or if phonetic conversion failed
        if (sourceLang === 'en' && targetLang !== 'en') {
            return `Unable to transliterate "${text}". Try common words like: hello, good, namaste, vanakkam, thank you`;
        } else if (sourceLang !== 'en' && targetLang === 'en') {
            return `Unable to transliterate "${text}". Try common words or enable phonetic mode`;
        }
        
        return `[${text}] - Limited offline transliteration. Try common words or shorter phrases`;
    }

    /**
     * Auto-detect source language
     */
    async autoDetectLanguage() {
        const inputText = this.elements.inputText?.value.trim();
        
        if (!inputText) {
            this.showStatus('Please enter text first to detect language.', 'error');
            return;
        }
        
        this.showStatus('Detecting language...', 'info');
        
        try {
            // Simple script detection based on Unicode ranges
            const detectedLang = this.detectScriptFromText(inputText);
            
            if (detectedLang && this.elements.sourceLanguage) {
                this.elements.sourceLanguage.value = detectedLang;
                this.updateButtonStates();
                
                const langName = this.languages[detectedLang]?.name || detectedLang;
                this.showStatus(`Detected language: ${langName}`, 'success');
                
                // Auto-transliterate if target language is selected
                if (this.elements.targetLanguage?.value) {
                    setTimeout(() => this.transliterate(), 500);
                }
            } else {
                this.showStatus('Could not detect language. Please select manually.', 'warning');
            }
            
        } catch (error) {
            console.error('Language detection error:', error);
            this.showStatus('Language detection failed. Please select manually.', 'error');
        }
    }

    /**
     * Detect script from text using Unicode ranges
     */
    detectScriptFromText(text) {
        const scriptRanges = {
            'hi': [0x0900, 0x097F], // Devanagari
            'ta': [0x0B80, 0x0BFF], // Tamil
            'te': [0x0C00, 0x0C7F], // Telugu
            'ml': [0x0D00, 0x0D7F], // Malayalam
            'kn': [0x0C80, 0x0CFF], // Kannada
            'gu': [0x0A80, 0x0AFF], // Gujarati
            'bn': [0x0980, 0x09FF], // Bengali
            'pa': [0x0A00, 0x0A7F], // Gurmukhi
            'or': [0x0B00, 0x0B7F]  // Odia
        };
        
        const charCounts = {};
        
        // Count characters in each script
        for (const char of text) {
            const charCode = char.codePointAt(0);
            
            for (const [script, [start, end]] of Object.entries(scriptRanges)) {
                if (charCode >= start && charCode <= end) {
                    charCounts[script] = (charCounts[script] || 0) + 1;
                }
            }
        }
        
        // Return script with highest count
        let maxCount = 0;
        let detectedScript = null;
        
        for (const [script, count] of Object.entries(charCounts)) {
            if (count > maxCount) {
                maxCount = count;
                detectedScript = script;
            }
        }
        
        return detectedScript;
    }

    /**
     * Swap source and target languages
     */
    swapLanguages() {
        if (!this.elements.sourceLanguage || !this.elements.targetLanguage) {
            return;
        }
        
        const sourceValue = this.elements.sourceLanguage.value;
        const targetValue = this.elements.targetLanguage.value;
        
        this.elements.sourceLanguage.value = targetValue;
        this.elements.targetLanguage.value = sourceValue;
        
        // Also swap the text content if there's output
        if (this.elements.inputText && this.elements.outputText && this.elements.outputText.value.trim()) {
            const inputValue = this.elements.inputText.value;
            const outputValue = this.elements.outputText.value;
            
            this.elements.inputText.value = outputValue;
            this.elements.outputText.value = inputValue;
            
            this.updateCharacterCount();
        }
        
        this.updateButtonStates();
        this.announceToScreenReader('Languages swapped');
    }

    /**
     * Clear all input and output
     */
    clearAll() {
        if (this.elements.inputText) {
            this.elements.inputText.value = '';
        }
        
        if (this.elements.outputText) {
            this.elements.outputText.value = '';
        }
        
        this.updateCharacterCount();
        this.updateButtonStates();
        
        // Clear status messages
        if (this.elements.statusContainer) {
            this.elements.statusContainer.innerHTML = '';
        }
        
        // Focus on input
        if (this.elements.inputText) {
            this.elements.inputText.focus();
        }
        
        this.announceToScreenReader('All fields cleared');
    }

    /**
     * Copy result to clipboard
     */
    async copyResult() {
        if (!this.elements.outputText || !this.elements.outputText.value.trim()) {
            this.showStatus('No text to copy.', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(this.elements.outputText.value);
            this.showStatus('Text copied to clipboard!', 'success');
            this.announceToScreenReader('Text copied to clipboard');
            
            // Temporary visual feedback
            const originalBtnText = this.elements.copyBtn.innerHTML;
            this.elements.copyBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!';
            this.elements.copyBtn.style.background = 'var(--success)';
            
            setTimeout(() => {
                this.elements.copyBtn.innerHTML = originalBtnText;
                this.elements.copyBtn.style.background = '';
            }, 2000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            
            // Fallback: select text
            this.elements.outputText.select();
            this.elements.outputText.setSelectionRange(0, 99999); // For mobile devices
            
            try {
                document.execCommand('copy');
                this.showStatus('Text copied to clipboard!', 'success');
            } catch (fallbackError) {
                this.showStatus('Copy failed. Please select and copy manually.', 'error');
            }
        }
    }

    /**
     * Set loading state for UI
     */
    setLoadingState(isLoading) {
        this.isTransliterating = isLoading;
        
        if (this.elements.transliterateBtn) {
            const btnText = this.elements.transliterateBtn.querySelector('.btn-text');
            const btnLoading = this.elements.transliterateBtn.querySelector('.loading');
            
            if (isLoading) {
                if (btnText) btnText.style.display = 'none';
                if (btnLoading) btnLoading.style.display = 'inline-block';
                this.elements.transliterateBtn.disabled = true;
            } else {
                if (btnText) btnText.style.display = 'inline';
                if (btnLoading) btnLoading.style.display = 'none';
                this.updateButtonStates();
            }
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        if (!this.elements.statusContainer) {
            return;
        }
        
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
        
        this.elements.statusContainer.innerHTML = '';
        this.elements.statusContainer.appendChild(statusEl);
        
        // Auto-hide after 5 seconds for success/info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (statusEl.parentNode) {
                    statusEl.remove();
                }
            }, 5000);
        }
    }

    /**
     * Show better fallback when both API and mapping fail
     */
    showPhoneticFallback() {
        const inputText = this.elements.inputText?.value.trim();
        const sourceLanguage = this.elements.sourceLanguage?.value;
        const targetLanguage = this.elements.targetLanguage?.value;
        
        if (inputText && this.elements.outputText) {
            // Try one more time with the fallback system
            const fallbackResult = this.getFallbackTransliteration(inputText, sourceLanguage, targetLanguage);
            
            if (fallbackResult && fallbackResult !== inputText && 
                !fallbackResult.includes('Unable to transliterate') && 
                !fallbackResult.includes('Please add to dictionary')) {
                this.elements.outputText.value = fallbackResult;
            } else {
                // Show helpful error message
                this.elements.outputText.value = `Unable to transliterate "${inputText}". 
                
Suggestions:
• Try common words like: hello, good, namaste, thank you
• Check if source and target languages are correct
• Use shorter phrases or individual words
• Enable phonetic mode for sound-based transliteration`;
            }
            
            this.updateOutputCharCount();
            this.updateButtonStates();
        }
    }

    /**
     * Show keyboard shortcuts information
     */
    showKeyboardShortcuts() {
        console.log('Keyboard shortcuts:');
        console.log('Ctrl/Cmd + Enter: Transliterate');
        console.log('Ctrl/Cmd + K: Clear all');
        console.log('Ctrl/Cmd + Shift + C: Copy result');
    }

    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// Initialize the app when DOM is ready
if (typeof window !== 'undefined') {
    window.TransliterationApp = new TransliterationApp();
    
    // Auto-initialize if DOM is already ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.TransliterationApp.init();
        });
    } else {
        window.TransliterationApp.init();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransliterationApp;
}
