/**
 * OCR App - Optical Character Recognition functionality
 * Uses Tesseract.js for client-side text extraction
 * Author: AICTE Team
 * Version: 1.0.0
 */

class OCRApp {
    constructor() {
        this.worker = null;
        this.isProcessing = false;
        this.supportedLanguages = {
            'hi': 'hin',    // Hindi
            'ta': 'tam',    // Tamil
            'te': 'tel',    // Telugu
            'ml': 'mal',    // Malayalam
            'kn': 'kan',    // Kannada
            'pa': 'pan',    // Punjabi
            'gu': 'guj',    // Gujarati
            'bn': 'ben',    // Bengali
            'or': 'ori',    // Odia
            'en': 'eng'     // English (fallback)
        };
        
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
        
        // DOM elements
        this.elements = {};
        
        // Camera stream
        this.stream = null;
        
        // Event handlers
        this.boundHandlers = {
            fileSelect: this.handleFileSelect.bind(this),
            dragOver: this.handleDragOver.bind(this),
            dragLeave: this.handleDragLeave.bind(this),
            drop: this.handleDrop.bind(this),
            cameraClick: this.startCamera.bind(this),
            captureClick: this.capturePhoto.bind(this),
            stopCameraClick: this.stopCamera.bind(this),
            extractClick: this.extractText.bind(this),
            removeImageClick: this.removeImage.bind(this),
            useExtractedClick: this.useExtractedText.bind(this),
            copyExtractedClick: this.copyExtractedText.bind(this)
        };
    }

    /**
     * Initialize the OCR application
     */
    init() {
        console.log('Initializing OCR App...');
        
        // Get DOM elements
        this.initElements();
        
        // Check if we're on the transliteration page
        if (!this.elements.uploadArea) {
            console.log('Not on transliteration page, skipping OCR init');
            return;
        }
        
        // Initialize Tesseract worker
        this.initTesseractWorker();
        
        // Bind event listeners
        this.bindEventListeners();
        
        console.log('OCR App initialized successfully');
    }

    /**
     * Get and store DOM element references
     */
    initElements() {
        this.elements = {
            // Upload area
            uploadArea: document.getElementById('upload-area'),
            fileInput: document.getElementById('file-input'),
            cameraBtn: document.getElementById('camera-btn'),
            
            // Camera section
            cameraSection: document.getElementById('camera-section'),
            cameraVideo: document.getElementById('camera-video'),
            captureBtn: document.getElementById('capture-btn'),
            stopCameraBtn: document.getElementById('stop-camera-btn'),
            
            // Image preview
            imagePreview: document.getElementById('image-preview'),
            previewImage: document.getElementById('preview-image'),
            extractTextBtn: document.getElementById('extract-text-btn'),
            removeImageBtn: document.getElementById('remove-image-btn'),
            
            // OCR progress
            ocrProgress: document.getElementById('ocr-progress'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            
            // Extracted text
            extractedTextSection: document.getElementById('extracted-text-section'),
            extractedText: document.getElementById('extracted-text'),
            useExtractedBtn: document.getElementById('use-extracted-btn'),
            copyExtractedBtn: document.getElementById('copy-extracted-btn'),
            
            // Main transliteration inputs
            inputText: document.getElementById('input-text'),
            sourceLanguage: document.getElementById('source-language')
        };
    }

    /**
     * Initialize Tesseract worker
     */
    async initTesseractWorker() {
        try {
            // Check if Tesseract is available
            if (typeof Tesseract === 'undefined') {
                console.error('Tesseract.js is not loaded');
                return;
            }
            
            // Create worker
            this.worker = await Tesseract.createWorker();
            
            // Initialize with English first (fallback)
            await this.worker.loadLanguage('eng');
            await this.worker.initialize('eng');
            
            console.log('Tesseract worker initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Tesseract worker:', error);
            this.showOCRError('OCR initialization failed. Please refresh the page.');
        }
    }

    /**
     * Bind event listeners to DOM elements
     */
    bindEventListeners() {
        // File input
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', this.boundHandlers.fileSelect);
        }
        
        // Upload area drag and drop
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('dragover', this.boundHandlers.dragOver);
            this.elements.uploadArea.addEventListener('dragleave', this.boundHandlers.dragLeave);
            this.elements.uploadArea.addEventListener('drop', this.boundHandlers.drop);
            this.elements.uploadArea.addEventListener('click', () => {
                if (this.elements.fileInput) {
                    this.elements.fileInput.click();
                }
            });
        }
        
        // Camera controls
        if (this.elements.cameraBtn) {
            this.elements.cameraBtn.addEventListener('click', this.boundHandlers.cameraClick);
        }
        
        if (this.elements.captureBtn) {
            this.elements.captureBtn.addEventListener('click', this.boundHandlers.captureClick);
        }
        
        if (this.elements.stopCameraBtn) {
            this.elements.stopCameraBtn.addEventListener('click', this.boundHandlers.stopCameraClick);
        }
        
        // Image processing controls
        if (this.elements.extractTextBtn) {
            this.elements.extractTextBtn.addEventListener('click', this.boundHandlers.extractClick);
        }
        
        if (this.elements.removeImageBtn) {
            this.elements.removeImageBtn.addEventListener('click', this.boundHandlers.removeImageClick);
        }
        
        // Extracted text controls
        if (this.elements.useExtractedBtn) {
            this.elements.useExtractedBtn.addEventListener('click', this.boundHandlers.useExtractedClick);
        }
        
        if (this.elements.copyExtractedBtn) {
            this.elements.copyExtractedBtn.addEventListener('click', this.boundHandlers.copyExtractedClick);
        }
    }

    /**
     * Handle file selection from input
     */
    handleFileSelect(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Handle drag over event
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.uploadArea.classList.add('dragover');
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.uploadArea.classList.remove('dragover');
    }

    /**
     * Handle file drop event
     */
    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.uploadArea.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Process uploaded or captured file
     */
    async processFile(file) {
        try {
            // Validate file
            if (!this.validateFile(file)) {
                return;
            }
            
            // Show loading state
            this.elements.uploadArea.classList.add('uploading');
            
            // Create image preview
            const imageDataUrl = await this.fileToDataUrl(file);
            this.showImagePreview(imageDataUrl);
            
            // Hide upload area and show preview
            this.showSection('imagePreview');
            
        } catch (error) {
            console.error('File processing error:', error);
            this.showOCRError('Failed to process file. Please try again.');
        } finally {
            this.elements.uploadArea.classList.remove('uploading');
        }
    }

    /**
     * Validate uploaded file
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showOCRError(`File size too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB.`);
            return false;
        }
        
        // Check file type
        if (!this.supportedFormats.includes(file.type)) {
            this.showOCRError('Unsupported file format. Please use JPG, PNG, or WebP.');
            return false;
        }
        
        return true;
    }

    /**
     * Convert file to data URL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Start camera for photo capture
     */
    async startCamera() {
        try {
            // Check if browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showOCRError('Camera not supported in this browser.');
                return;
            }
            
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Use back camera if available
                }
            });
            
            // Set video stream
            this.elements.cameraVideo.srcObject = this.stream;
            
            // Show camera section
            this.showSection('camera');
            
        } catch (error) {
            console.error('Camera access error:', error);
            this.showOCRError('Could not access camera. Please check permissions.');
        }
    }

    /**
     * Capture photo from camera
     */
    capturePhoto() {
        try {
            // Create canvas to capture frame
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            canvas.width = this.elements.cameraVideo.videoWidth;
            canvas.height = this.elements.cameraVideo.videoHeight;
            
            // Draw current video frame to canvas
            context.drawImage(this.elements.cameraVideo, 0, 0);
            
            // Convert to data URL
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Stop camera
            this.stopCamera();
            
            // Show image preview
            this.showImagePreview(imageDataUrl);
            this.showSection('imagePreview');
            
        } catch (error) {
            console.error('Photo capture error:', error);
            this.showOCRError('Failed to capture photo. Please try again.');
        }
    }

    /**
     * Stop camera stream
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.elements.cameraVideo) {
            this.elements.cameraVideo.srcObject = null;
        }
        
        this.showSection('upload');
    }

    /**
     * Show image preview
     */
    showImagePreview(imageDataUrl) {
        if (this.elements.previewImage) {
            this.elements.previewImage.src = imageDataUrl;
            this.elements.previewImage.alt = 'Uploaded image for OCR processing';
        }
    }

    /**
     * Extract text from image using OCR
     */
    async extractText() {
        if (!this.worker) {
            this.showOCRError('OCR service not available. Please refresh the page.');
            return;
        }
        
        if (this.isProcessing) {
            return;
        }
        
        try {
            this.isProcessing = true;
            
            // Show progress
            this.showSection('progress');
            this.updateProgress(0, 'Initializing OCR...');
            
            // Get selected source language for OCR
            const selectedLang = this.elements.sourceLanguage?.value || 'en';
            const tesseractLang = this.supportedLanguages[selectedLang] || 'eng';
            
            // Load appropriate language if different from current
            this.updateProgress(10, 'Loading language model...');
            await this.worker.loadLanguage(tesseractLang);
            await this.worker.initialize(tesseractLang);
            
            // Configure OCR options
            const options = {
                logger: (m) => {
                    console.log(m);
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 80) + 20; // 20-100%
                        this.updateProgress(progress, 'Recognizing text...');
                    }
                }
            };
            
            this.updateProgress(20, 'Processing image...');
            
            // Perform OCR
            const result = await this.worker.recognize(this.elements.previewImage.src, options);
            
            this.updateProgress(100, 'Text extraction complete!');
            
            // Show extracted text
            const extractedText = result.data.text.trim();
            
            if (extractedText) {
                this.showExtractedText(extractedText, result.data.confidence);
            } else {
                this.showOCRError('No text found in the image. Please try with a clearer image.');
            }
            
        } catch (error) {
            console.error('OCR processing error:', error);
            this.showOCRError('Text extraction failed. Please try again.');
        } finally {
            this.isProcessing = false;
            
            // Hide progress after a delay
            setTimeout(() => {
                this.hideSection('progress');
            }, 2000);
        }
    }

    /**
     * Remove current image and reset
     */
    removeImage() {
        // Hide all sections except upload
        this.hideSection('imagePreview');
        this.hideSection('progress');
        this.hideSection('extractedText');
        
        // Show upload area
        this.showSection('upload');
        
        // Clear image
        if (this.elements.previewImage) {
            this.elements.previewImage.src = '';
        }
        
        // Clear extracted text
        if (this.elements.extractedText) {
            this.elements.extractedText.value = '';
        }
        
        // Reset file input
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
    }

    /**
     * Use extracted text in main transliteration input
     */
    useExtractedText() {
        const extractedText = this.elements.extractedText?.value.trim();
        
        if (!extractedText) {
            this.showOCRError('No extracted text to use.');
            return;
        }
        
        if (this.elements.inputText) {
            this.elements.inputText.value = extractedText;
            
            // Trigger input event to update character count and button states
            this.elements.inputText.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Focus on input field
            this.elements.inputText.focus();
            
            // Scroll to transliteration section
            this.elements.inputText.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            this.showOCRSuccess('Text moved to input field successfully!');
        }
    }

    /**
     * Copy extracted text to clipboard
     */
    async copyExtractedText() {
        const extractedText = this.elements.extractedText?.value.trim();
        
        if (!extractedText) {
            this.showOCRError('No text to copy.');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(extractedText);
            this.showOCRSuccess('Text copied to clipboard!');
            
            // Visual feedback
            const originalBtnText = this.elements.copyExtractedBtn.innerHTML;
            this.elements.copyExtractedBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!';
            this.elements.copyExtractedBtn.style.background = 'var(--success)';
            
            setTimeout(() => {
                this.elements.copyExtractedBtn.innerHTML = originalBtnText;
                this.elements.copyExtractedBtn.style.background = '';
            }, 2000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            
            // Fallback: select text
            this.elements.extractedText.select();
            this.elements.extractedText.setSelectionRange(0, 99999);
            
            try {
                document.execCommand('copy');
                this.showOCRSuccess('Text copied to clipboard!');
            } catch (fallbackError) {
                this.showOCRError('Copy failed. Please select and copy manually.');
            }
        }
    }

    /**
     * Show extracted text with confidence score
     */
    showExtractedText(text, confidence) {
        if (this.elements.extractedText) {
            this.elements.extractedText.value = text;
        }
        
        this.showSection('extractedText');
        
        // Show confidence score if available
        if (confidence !== undefined) {
            const confidencePercent = Math.round(confidence);
            const confidenceClass = confidencePercent >= 80 ? 'high' : 
                                   confidencePercent >= 60 ? 'medium' : 'low';
            
            this.showOCRSuccess(
                `Text extracted successfully! Confidence: <span class="confidence-${confidenceClass}">${confidencePercent}%</span>`
            );
        } else {
            this.showOCRSuccess('Text extracted successfully!');
        }
    }

    /**
     * Update OCR progress
     */
    updateProgress(percent, message) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percent}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = message;
        }
    }

    /**
     * Show/hide UI sections
     */
    showSection(sectionName) {
        const sectionMap = {
            'upload': this.elements.uploadArea,
            'camera': this.elements.cameraSection,
            'imagePreview': this.elements.imagePreview,
            'progress': this.elements.ocrProgress,
            'extractedText': this.elements.extractedTextSection
        };
        
        const element = sectionMap[sectionName];
        if (element) {
            element.style.display = 'block';
        }
    }

    hideSection(sectionName) {
        const sectionMap = {
            'upload': this.elements.uploadArea,
            'camera': this.elements.cameraSection,
            'imagePreview': this.elements.imagePreview,
            'progress': this.elements.ocrProgress,
            'extractedText': this.elements.extractedTextSection
        };
        
        const element = sectionMap[sectionName];
        if (element) {
            element.style.display = 'none';
        }
    }

    /**
     * Show OCR success message
     */
    showOCRSuccess(message) {
        // Try to use the main status container if available
        const statusContainer = document.getElementById('status-container');
        if (statusContainer) {
            const statusEl = document.createElement('div');
            statusEl.className = 'status-message status-success';
            statusEl.innerHTML = `
                <i class="fas fa-check-circle" aria-hidden="true"></i>
                <span>${message}</span>
            `;
            
            statusContainer.innerHTML = '';
            statusContainer.appendChild(statusEl);
            
            setTimeout(() => {
                if (statusEl.parentNode) {
                    statusEl.remove();
                }
            }, 5000);
        } else {
            console.log('OCR Success:', message);
        }
    }

    /**
     * Show OCR error message
     */
    showOCRError(message) {
        // Try to use the main status container if available
        const statusContainer = document.getElementById('status-container');
        if (statusContainer) {
            const statusEl = document.createElement('div');
            statusEl.className = 'status-message status-error';
            statusEl.innerHTML = `
                <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
                <span>${message}</span>
            `;
            
            statusContainer.innerHTML = '';
            statusContainer.appendChild(statusEl);
        } else {
            console.error('OCR Error:', message);
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        // Stop camera if running
        this.stopCamera();
        
        // Terminate Tesseract worker
        if (this.worker) {
            try {
                await this.worker.terminate();
                this.worker = null;
            } catch (error) {
                console.error('Error terminating OCR worker:', error);
            }
        }
    }
}

// Initialize the app when DOM is ready
if (typeof window !== 'undefined') {
    window.OCRApp = new OCRApp();
    
    // Auto-initialize if DOM is already ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.OCRApp.init();
        });
    } else {
        window.OCRApp.init();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.OCRApp) {
            window.OCRApp.cleanup();
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OCRApp;
}
