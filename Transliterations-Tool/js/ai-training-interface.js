/**
 * AI Training Interface - Interactive UI for Training Custom Transliteration AI
 * Author: AICTE Team
 * Version: 1.0.0
 */

class AITrainingInterface {
    constructor() {
        this.ai = new CustomAITransliterator();
        this.isTraining = false;
        this.trainingLog = [];
        
        this.init();
    }

    init() {
        console.log('Initializing AI Training Interface...');
        
        // Load pre-trained patterns
        this.ai.loadPreTrainedPatterns();
        
        // Bind event listeners if we're on the right page
        this.bindEventListeners();
        
        console.log('AI Training Interface ready');
    }

    bindEventListeners() {
        // Train model button
        const trainBtn = document.getElementById('train-model-btn');
        if (trainBtn) {
            trainBtn.addEventListener('click', () => this.startTraining());
        }

        // Add training data button
        const addDataBtn = document.getElementById('add-training-data-btn');
        if (addDataBtn) {
            addDataBtn.addEventListener('click', () => this.addTrainingData());
        }

        // Test AI button
        const testBtn = document.getElementById('test-ai-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testAI());
        }

        // Quick train button
        const quickTrainBtn = document.getElementById('quick-train-btn');
        if (quickTrainBtn) {
            quickTrainBtn.addEventListener('click', () => this.quickTrain());
        }

        // Export model button
        const exportBtn = document.getElementById('export-model-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportModel());
        }

        // Import model button
        const importBtn = document.getElementById('import-model-btn');
        if (importBtn) {
            importBtn.addEventListener('change', (e) => this.importModel(e));
        }
    }

    /**
     * Add custom training data
     */
    addTrainingData() {
        const sourceLang = document.getElementById('source-lang-training')?.value || 'en';
        const targetLang = document.getElementById('target-lang-training')?.value || 'ta';
        const sourceText = document.getElementById('source-text-training')?.value.trim();
        const targetText = document.getElementById('target-text-training')?.value.trim();

        if (!sourceText || !targetText) {
            this.showTrainingStatus('Please enter both source and target text', 'error');
            return;
        }

        try {
            this.ai.addTrainingData(sourceLang, targetLang, sourceText, targetText);
            
            this.addToTrainingLog(`Added: "${sourceText}" -> "${targetText}"`);
            this.showTrainingStatus(`Training data added: "${sourceText}" -> "${targetText}"`, 'success');
            
            // Clear input fields
            if (document.getElementById('source-text-training')) {
                document.getElementById('source-text-training').value = '';
            }
            if (document.getElementById('target-text-training')) {
                document.getElementById('target-text-training').value = '';
            }
            
            this.updateTrainingStats();
            
        } catch (error) {
            this.showTrainingStatus(`Error adding training data: ${error.message}`, 'error');
        }
    }

    /**
     * Start comprehensive training
     */
    async startTraining() {
        const sourceLang = document.getElementById('source-lang-training')?.value || 'en';
        const targetLang = document.getElementById('target-lang-training')?.value || 'ta';
        const epochs = parseInt(document.getElementById('training-epochs')?.value) || 1000;
        const learningRate = parseFloat(document.getElementById('learning-rate')?.value) || 0.001;

        if (this.isTraining) {
            this.showTrainingStatus('Training already in progress', 'warning');
            return;
        }

        try {
            this.isTraining = true;
            this.updateTrainingButton(true);
            
            this.showTrainingStatus('Starting AI training...', 'info');
            this.addToTrainingLog(`Started training ${sourceLang} -> ${targetLang}`);
            
            // Start training with progress monitoring
            const progressInterval = setInterval(() => {
                this.updateTrainingProgress();
            }, 500);
            
            await this.ai.trainModel(sourceLang, targetLang, {
                epochs: epochs,
                learningRate: learningRate
            });
            
            clearInterval(progressInterval);
            
            this.isTraining = false;
            this.updateTrainingButton(false);
            this.updateTrainingProgress(100);
            
            this.showTrainingStatus('AI training completed successfully!', 'success');
            this.addToTrainingLog(`Training completed for ${sourceLang} -> ${targetLang}`);
            
            this.updateTrainingStats();
            
        } catch (error) {
            this.isTraining = false;
            this.updateTrainingButton(false);
            this.showTrainingStatus(`Training failed: ${error.message}`, 'error');
            this.addToTrainingLog(`Training failed: ${error.message}`);
        }
    }

    /**
     * Quick training with pre-defined patterns
     */
    async quickTrain() {
        const sourceLang = 'en';
        const targetLang = 'ta';

        if (this.isTraining) {
            this.showTrainingStatus('Training already in progress', 'warning');
            return;
        }

        try {
            this.showTrainingStatus('Starting quick training with phonetic patterns...', 'info');
            
            // Add comprehensive phonetic patterns
            const phoneticPatterns = [
                // Basic words
                ['hello', 'ஹலோ'], ['world', 'வோர்ல்ட்'], ['good', 'குட்'], ['bad', 'பாட்'],
                ['yes', 'யெஸ்'], ['no', 'நோ'], ['water', 'வாட்டர்'], ['fire', 'ஃபயர்'],
                
                // Names and places
                ['tamil', 'தமிழ்'], ['india', 'இந்தியா'], ['chennai', 'சென்னை'],
                ['bangalore', 'பெங்களூர்'], ['mumbai', 'மும்பை'], ['delhi', 'தில்லி'],
                
                // Technology terms
                ['computer', 'கம்ப்யூட்டர்'], ['mobile', 'மோபைல்'], ['internet', 'இண்டர்நெட்'],
                ['software', 'சாஃப்ட்வேர்'], ['hardware', 'ஹார்ட்வேர்'], ['network', 'நெட்வொர்க்'],
                
                // Common phrases
                ['thank you', 'தேங்க் யூ'], ['sorry', 'சாரி'], ['please', 'ப்ளீஸ்'],
                ['excuse me', 'எக்ஸ்க்யூஸ் மீ'], ['how are you', 'ஹவ் ஆர் யூ'],
                
                // Numbers
                ['one', 'வன்'], ['two', 'டூ'], ['three', 'த்ரீ'], ['four', 'ஃபோர்'],
                ['five', 'ஃபைவ்'], ['six', 'சிக்ஸ்'], ['seven', 'செவன்'], ['eight', 'எயிட்'],
                ['nine', 'நைன்'], ['ten', 'டென்'], ['hundred', 'ஹண்ட்ரெட்'], ['thousand', 'தவுஸண்ட்']
            ];

            // Add all patterns
            for (const [source, target] of phoneticPatterns) {
                this.ai.addTrainingData(sourceLang, targetLang, source, target);
            }

            // Train with quick settings
            await this.ai.trainModel(sourceLang, targetLang, {
                epochs: 500,
                learningRate: 0.005
            });

            this.showTrainingStatus('Quick training completed! You can now test the AI.', 'success');
            this.addToTrainingLog('Quick training completed with phonetic patterns');
            this.updateTrainingStats();

        } catch (error) {
            this.showTrainingStatus(`Quick training failed: ${error.message}`, 'error');
        }
    }

    /**
     * Test the trained AI
     */
    testAI() {
        const sourceLang = document.getElementById('source-lang-training')?.value || 'en';
        const targetLang = document.getElementById('target-lang-training')?.value || 'ta';
        const testText = document.getElementById('test-input')?.value.trim();

        if (!testText) {
            this.showTrainingStatus('Please enter text to test', 'error');
            return;
        }

        try {
            const result = this.ai.transliterate(testText, sourceLang, targetLang);
            
            const resultElement = document.getElementById('test-output');
            if (resultElement) {
                resultElement.value = result;
            }
            
            this.showTrainingStatus(`AI Test: "${testText}" -> "${result}"`, 'success');
            this.addToTrainingLog(`Test: "${testText}" -> "${result}"`);
            
        } catch (error) {
            this.showTrainingStatus(`AI Test failed: ${error.message}`, 'error');
            
            const resultElement = document.getElementById('test-output');
            if (resultElement) {
                resultElement.value = `Error: ${error.message}`;
            }
        }
    }

    /**
     * Advanced training with custom requirements
     */
    async trainWithRequirements() {
        const requirements = {
            sourceLang: 'en',
            targetLang: 'ta',
            patterns: this.getCustomPatterns(),
            rules: this.getCustomRules(),
            emphasis: document.getElementById('training-emphasis')?.value || 'phonetic',
            epochs: parseInt(document.getElementById('advanced-epochs')?.value) || 1500,
            learningRate: parseFloat(document.getElementById('advanced-learning-rate')?.value) || 0.001
        };

        try {
            this.showTrainingStatus('Starting advanced training with custom requirements...', 'info');
            
            await this.ai.trainWithCustomRequirements(requirements);
            
            this.showTrainingStatus('Advanced training completed!', 'success');
            this.addToTrainingLog('Advanced training with custom requirements completed');
            
        } catch (error) {
            this.showTrainingStatus(`Advanced training failed: ${error.message}`, 'error');
        }
    }

    /**
     * Get custom patterns from UI
     */
    getCustomPatterns() {
        const patterns = [];
        const patternInputs = document.querySelectorAll('.custom-pattern');
        
        patternInputs.forEach(input => {
            const source = input.querySelector('.pattern-source')?.value.trim();
            const target = input.querySelector('.pattern-target')?.value.trim();
            
            if (source && target) {
                patterns.push({ source, target });
            }
        });
        
        return patterns;
    }

    /**
     * Get custom rules from UI
     */
    getCustomRules() {
        return [
            {
                type: 'suffix',
                suffix: 'ing',
                bases: ['work', 'play', 'run', 'walk', 'talk']
            },
            {
                type: 'suffix',
                suffix: 'ed',
                bases: ['work', 'play', 'walk', 'talk', 'cook']
            }
        ];
    }

    /**
     * Update training progress display
     */
    updateTrainingProgress(progress = null) {
        const progressBar = document.getElementById('training-progress-bar');
        const progressText = document.getElementById('training-progress-text');
        
        const currentProgress = progress !== null ? progress : this.ai.trainingProgress;
        
        if (progressBar) {
            progressBar.style.width = `${currentProgress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${currentProgress.toFixed(1)}%`;
        }
    }

    /**
     * Update training button state
     */
    updateTrainingButton(isTraining) {
        const trainBtn = document.getElementById('train-model-btn');
        if (trainBtn) {
            trainBtn.disabled = isTraining;
            trainBtn.innerHTML = isTraining 
                ? '<i class="fas fa-spinner fa-spin"></i> Training...' 
                : '<i class="fas fa-brain"></i> Train Model';
        }
    }

    /**
     * Show training status message
     */
    showTrainingStatus(message, type = 'info') {
        const statusElement = document.getElementById('training-status');
        if (statusElement) {
            statusElement.className = `training-status status-${type}`;
            statusElement.innerHTML = `
                <i class="fas fa-${this.getStatusIcon(type)}"></i>
                ${message}
            `;
            
            // Auto-hide success/info messages
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    statusElement.innerHTML = '';
                    statusElement.className = 'training-status';
                }, 5000);
            }
        }
        
        console.log(`[AI Training] ${type.toUpperCase()}: ${message}`);
    }

    /**
     * Get icon for status type
     */
    getStatusIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Add entry to training log
     */
    addToTrainingLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.trainingLog.push(`[${timestamp}] ${message}`);
        
        const logElement = document.getElementById('training-log');
        if (logElement) {
            logElement.innerHTML = this.trainingLog
                .slice(-10) // Show last 10 entries
                .map(entry => `<div class="log-entry">${entry}</div>`)
                .join('');
            
            // Scroll to bottom
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    /**
     * Update training statistics display
     */
    updateTrainingStats() {
        const stats = this.ai.getTrainingStats();
        const statsElement = document.getElementById('training-stats');
        
        if (statsElement) {
            let statsHTML = '<h4>Training Statistics</h4>';
            
            for (const [key, data] of Object.entries(stats)) {
                statsHTML += `
                    <div class="stat-item">
                        <strong>${key}:</strong>
                        <span class="stat-value">${data.examples} examples</span>
                        <span class="stat-trained ${data.hasTrained ? 'trained' : 'not-trained'}">
                            ${data.hasTrained ? '✓ Trained' : '○ Not Trained'}
                        </span>
                    </div>
                `;
            }
            
            statsElement.innerHTML = statsHTML;
        }
    }

    /**
     * Export trained model
     */
    exportModel() {
        const sourceLang = document.getElementById('source-lang-training')?.value || 'en';
        const targetLang = document.getElementById('target-lang-training')?.value || 'ta';
        
        try {
            const modelData = this.ai.exportModel(sourceLang, targetLang);
            
            // Create download link
            const blob = new Blob([modelData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-model-${sourceLang}-${targetLang}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showTrainingStatus('Model exported successfully', 'success');
            
        } catch (error) {
            this.showTrainingStatus(`Export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Import trained model
     */
    importModel(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const success = this.ai.importModel(e.target.result);
                if (success) {
                    this.showTrainingStatus('Model imported successfully', 'success');
                    this.updateTrainingStats();
                } else {
                    this.showTrainingStatus('Model import failed', 'error');
                }
            } catch (error) {
                this.showTrainingStatus(`Import failed: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Generate training data from text input
     */
    generateTrainingData() {
        const inputText = document.getElementById('bulk-training-input')?.value.trim();
        if (!inputText) {
            this.showTrainingStatus('Please enter text for bulk training data generation', 'error');
            return;
        }

        const lines = inputText.split('\n');
        let addedCount = 0;

        for (const line of lines) {
            const parts = line.split('\t'); // Tab-separated values
            if (parts.length === 2) {
                const [source, target] = parts.map(p => p.trim());
                if (source && target) {
                    this.ai.addTrainingData('en', 'ta', source, target);
                    addedCount++;
                }
            }
        }

        if (addedCount > 0) {
            this.showTrainingStatus(`Added ${addedCount} training examples from bulk input`, 'success');
            this.updateTrainingStats();
            
            // Clear input
            if (document.getElementById('bulk-training-input')) {
                document.getElementById('bulk-training-input').value = '';
            }
        } else {
            this.showTrainingStatus('No valid training data found. Use format: source_text<TAB>target_text', 'error');
        }
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.AITrainingInterface = AITrainingInterface;
    
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('ai-training') || 
            document.getElementById('ai-training-section')) {
            window.aiTrainingInterface = new AITrainingInterface();
        }
    });
}
