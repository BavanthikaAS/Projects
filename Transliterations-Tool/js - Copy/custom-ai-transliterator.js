/**
 * Custom AI Transliterator - Neural Network for Transliteration Training
 * Author: AICTE Team
 * Version: 1.0.0
 * 
 * This AI system can be trained with custom transliteration patterns
 * and learn to transliterate based on your specific requirements
 */

class CustomAITransliterator {
    constructor() {
        this.networks = new Map(); // Store different trained models
        this.trainingData = new Map(); // Store training datasets
        this.modelConfig = {
            inputSize: 100,  // Max character sequence length
            hiddenLayers: [128, 64, 32],
            outputSize: 100, // Max output sequence length
            learningRate: 0.001,
            epochs: 1000,
            batchSize: 32
        };
        
        // Character mappings for different languages
        this.charMappings = {
            'en': this.createCharMapping('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
            'ta': this.createCharMapping('அஆஇஈஉஊஎஏஐஒஓஔகஙசஞடணதநபமயரறலளழவஶஷஸஹஜ்ாிீுூெேைொோௌ் ,.!?-'),
            'hi': this.createCharMapping('अआइईउऊएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह्ािीुूेैोौ् ,.!?-'),
            'te': this.createCharMapping('అఆఇఈఉఊఎఏఐఒఓఔకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరఱలళవశషసహ్ాిీుూెేైొోౌ్ ,.!?-')
        };
        
        this.isTraining = false;
        this.trainingProgress = 0;
    }

    /**
     * Create character to index mapping for a language
     */
    createCharMapping(chars) {
        const charToIndex = {};
        const indexToChar = {};
        
        for (let i = 0; i < chars.length; i++) {
            charToIndex[chars[i]] = i;
            indexToChar[i] = chars[i];
        }
        
        return { charToIndex, indexToChar, size: chars.length };
    }

    /**
     * Simple Neural Network Implementation
     */
    createNeuralNetwork(inputSize, hiddenLayers, outputSize) {
        const network = {
            layers: [],
            weights: [],
            biases: [],
            activations: []
        };

        // Input layer
        network.layers.push(inputSize);
        
        // Hidden layers
        for (const hiddenSize of hiddenLayers) {
            network.layers.push(hiddenSize);
        }
        
        // Output layer
        network.layers.push(outputSize);

        // Initialize weights and biases
        for (let i = 0; i < network.layers.length - 1; i++) {
            const weightMatrix = this.createMatrix(
                network.layers[i + 1], 
                network.layers[i]
            );
            const biasVector = this.createVector(network.layers[i + 1]);
            
            // Xavier initialization
            const scale = Math.sqrt(2.0 / network.layers[i]);
            this.randomizeMatrix(weightMatrix, scale);
            this.randomizeVector(biasVector, 0.1);
            
            network.weights.push(weightMatrix);
            network.biases.push(biasVector);
        }

        return network;
    }

    /**
     * Matrix operations for neural network
     */
    createMatrix(rows, cols) {
        return Array(rows).fill(null).map(() => Array(cols).fill(0));
    }

    createVector(size) {
        return Array(size).fill(0);
    }

    randomizeMatrix(matrix, scale = 1) {
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                matrix[i][j] = (Math.random() * 2 - 1) * scale;
            }
        }
    }

    randomizeVector(vector, scale = 1) {
        for (let i = 0; i < vector.length; i++) {
            vector[i] = (Math.random() * 2 - 1) * scale;
        }
    }

    /**
     * Activation functions
     */
    relu(x) {
        return Math.max(0, x);
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    softmax(vector) {
        const max = Math.max(...vector);
        const exps = vector.map(x => Math.exp(x - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(x => x / sum);
    }

    /**
     * Forward propagation
     */
    forwardPass(network, input) {
        let currentInput = [...input];
        network.activations = [currentInput];

        for (let i = 0; i < network.weights.length; i++) {
            const weights = network.weights[i];
            const biases = network.biases[i];
            const output = [];

            // Matrix multiplication + bias
            for (let j = 0; j < weights.length; j++) {
                let sum = biases[j];
                for (let k = 0; k < currentInput.length; k++) {
                    sum += weights[j][k] * currentInput[k];
                }
                
                // Apply activation function
                if (i === network.weights.length - 1) {
                    output.push(this.sigmoid(sum)); // Output layer
                } else {
                    output.push(this.relu(sum)); // Hidden layers
                }
            }

            currentInput = output;
            network.activations.push(currentInput);
        }

        return currentInput;
    }

    /**
     * Encode text to numerical representation
     */
    encodeText(text, sourceLang, maxLength = 100) {
        const mapping = this.charMappings[sourceLang];
        if (!mapping) {
            throw new Error(`Language ${sourceLang} not supported`);
        }

        const encoded = Array(maxLength).fill(0);
        
        for (let i = 0; i < Math.min(text.length, maxLength); i++) {
            const char = text[i];
            encoded[i] = mapping.charToIndex[char] || 0; // Unknown chars become 0
        }

        return encoded;
    }

    /**
     * Decode numerical representation to text
     */
    decodeText(encoded, targetLang) {
        const mapping = this.charMappings[targetLang];
        if (!mapping) {
            throw new Error(`Language ${targetLang} not supported`);
        }

        let text = '';
        for (const index of encoded) {
            const charIndex = Math.round(index * (mapping.size - 1));
            const char = mapping.indexToChar[charIndex] || '';
            if (char && char !== ' ' || text.length === 0) {
                text += char;
            }
        }

        return text.trim();
    }

    /**
     * Add training data
     */
    addTrainingData(sourceLang, targetLang, sourceText, targetText) {
        const key = `${sourceLang}-${targetLang}`;
        
        if (!this.trainingData.has(key)) {
            this.trainingData.set(key, []);
        }

        this.trainingData.get(key).push({
            source: sourceText,
            target: targetText,
            encodedSource: this.encodeText(sourceText, sourceLang),
            encodedTarget: this.encodeText(targetText, targetLang)
        });

        console.log(`Added training data: "${sourceText}" -> "${targetText}"`);
    }

    /**
     * Train the neural network with custom data
     */
    async trainModel(sourceLang, targetLang, options = {}) {
        const key = `${sourceLang}-${targetLang}`;
        const trainingSet = this.trainingData.get(key);

        if (!trainingSet || trainingSet.length === 0) {
            throw new Error(`No training data available for ${sourceLang} -> ${targetLang}`);
        }

        console.log(`Starting training for ${sourceLang} -> ${targetLang} with ${trainingSet.length} examples`);

        this.isTraining = true;
        this.trainingProgress = 0;

        // Create network
        const network = this.createNeuralNetwork(
            this.modelConfig.inputSize,
            this.modelConfig.hiddenLayers,
            this.modelConfig.outputSize
        );

        const epochs = options.epochs || this.modelConfig.epochs;
        const learningRate = options.learningRate || this.modelConfig.learningRate;

        // Training loop
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            // Shuffle training data
            const shuffled = [...trainingSet].sort(() => Math.random() - 0.5);

            for (const example of shuffled) {
                // Forward pass
                const predicted = this.forwardPass(network, example.encodedSource);
                
                // Calculate loss (mean squared error)
                let loss = 0;
                for (let i = 0; i < predicted.length; i++) {
                    const error = predicted[i] - (example.encodedTarget[i] / this.charMappings[targetLang].size);
                    loss += error * error;
                }
                loss /= predicted.length;
                totalLoss += loss;

                // Simple gradient descent (simplified backpropagation)
                this.updateWeights(network, example.encodedTarget, predicted, learningRate);
            }

            // Update progress
            this.trainingProgress = ((epoch + 1) / epochs) * 100;

            // Log progress every 100 epochs
            if (epoch % 100 === 0) {
                const avgLoss = totalLoss / trainingSet.length;
                console.log(`Epoch ${epoch}/${epochs}, Average Loss: ${avgLoss.toFixed(6)}, Progress: ${this.trainingProgress.toFixed(1)}%`);
                
                // Allow UI updates
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        // Store the trained model
        this.networks.set(key, network);
        this.isTraining = false;
        this.trainingProgress = 100;

        console.log(`Training completed for ${sourceLang} -> ${targetLang}`);
        return network;
    }

    /**
     * Simplified weight update (gradient descent)
     */
    updateWeights(network, target, predicted, learningRate) {
        // Simplified backpropagation - in practice, you'd want full gradient computation
        const outputError = [];
        const targetLang = 'ta'; // Assumption for simplification
        
        for (let i = 0; i < predicted.length; i++) {
            const targetValue = target[i] / this.charMappings[targetLang].size;
            outputError[i] = predicted[i] - targetValue;
        }

        // Update output layer weights (simplified)
        const lastLayerIndex = network.weights.length - 1;
        const lastWeights = network.weights[lastLayerIndex];
        const lastActivations = network.activations[network.activations.length - 2];

        for (let i = 0; i < lastWeights.length; i++) {
            for (let j = 0; j < lastWeights[i].length; j++) {
                const gradient = outputError[i] * lastActivations[j];
                lastWeights[i][j] -= learningRate * gradient;
            }
            // Update bias
            network.biases[lastLayerIndex][i] -= learningRate * outputError[i];
        }
    }

    /**
     * Use trained model to transliterate
     */
    transliterate(text, sourceLang, targetLang) {
        const key = `${sourceLang}-${targetLang}`;
        const network = this.networks.get(key);

        if (!network) {
            throw new Error(`No trained model available for ${sourceLang} -> ${targetLang}. Please train the model first.`);
        }

        try {
            // Encode input
            const encoded = this.encodeText(text, sourceLang);
            
            // Forward pass through network
            const prediction = this.forwardPass(network, encoded);
            
            // Decode output
            const result = this.decodeText(prediction, targetLang);
            
            return result;
        } catch (error) {
            console.error('Transliteration error:', error);
            return `Error: ${error.message}`;
        }
    }

    /**
     * Load pre-trained patterns (common transliterations)
     */
    loadPreTrainedPatterns() {
        console.log('Loading pre-trained patterns...');

        // English to Tamil patterns
        const enTaPatterns = [
            ['hello', 'ஹலோ'], ['good', 'குட்'], ['bad', 'பாட்'], ['yes', 'யெஸ்'],
            ['no', 'நோ'], ['water', 'வாட்டர்'], ['food', 'ஃபுட்'], ['home', 'ஹோம்'],
            ['school', 'ஸ்கூல்'], ['hospital', 'ஹாஸ்பிடல்'], ['thank you', 'தேங்க் யூ'],
            ['sorry', 'சாரி'], ['please', 'ப்ளீஸ்'], ['computer', 'கம்ப்யூட்டர்'],
            ['mobile', 'மோபைல்'], ['internet', 'இண்டர்நெட்'], ['beautiful', 'ப்யூடிஃபுல்'],
            ['wonderful', 'வண்டர்ஃபுல்'], ['amazing', 'அமேஜிங்'], ['excellent', 'எக்ஸலெண்ட்']
        ];

        // English to Hindi patterns
        const enHiPatterns = [
            ['hello', 'हैलो'], ['good', 'गुड'], ['bad', 'बैड'], ['yes', 'यस'],
            ['no', 'नो'], ['water', 'वाटर'], ['food', 'फूड'], ['home', 'होम'],
            ['school', 'स्कूल'], ['hospital', 'हॉस्पिटल'], ['thank you', 'थैंक यू'],
            ['sorry', 'सॉरी'], ['please', 'प्लीज'], ['computer', 'कंप्यूटर'],
            ['mobile', 'मोबाइल'], ['internet', 'इंटरनेट'], ['beautiful', 'ब्यूटिफुल'],
            ['wonderful', 'वंडरफुल'], ['amazing', 'अमेजिंग'], ['excellent', 'एक्सलेंट']
        ];

        // Add English to Tamil training data
        for (const [en, ta] of enTaPatterns) {
            this.addTrainingData('en', 'ta', en, ta);
        }

        // Add English to Hindi training data
        for (const [en, hi] of enHiPatterns) {
            this.addTrainingData('en', 'hi', en, hi);
        }

        console.log('Pre-trained patterns loaded successfully');
    }

    /**
     * Get training statistics
     */
    getTrainingStats() {
        const stats = {};
        
        for (const [key, data] of this.trainingData.entries()) {
            stats[key] = {
                examples: data.length,
                hasTrained: this.networks.has(key),
                avgSourceLength: data.reduce((sum, item) => sum + item.source.length, 0) / data.length,
                avgTargetLength: data.reduce((sum, item) => sum + item.target.length, 0) / data.length
            };
        }

        return stats;
    }

    /**
     * Export trained model
     */
    exportModel(sourceLang, targetLang) {
        const key = `${sourceLang}-${targetLang}`;
        const network = this.networks.get(key);
        const trainingData = this.trainingData.get(key);

        if (!network) {
            throw new Error(`No trained model for ${key}`);
        }

        return JSON.stringify({
            key,
            network,
            trainingData,
            timestamp: Date.now(),
            version: '1.0.0'
        });
    }

    /**
     * Import trained model
     */
    importModel(modelData) {
        try {
            const parsed = JSON.parse(modelData);
            
            this.networks.set(parsed.key, parsed.network);
            this.trainingData.set(parsed.key, parsed.trainingData);
            
            console.log(`Model imported successfully: ${parsed.key}`);
            return true;
        } catch (error) {
            console.error('Model import failed:', error);
            return false;
        }
    }

    /**
     * Advanced training with custom requirements
     */
    async trainWithCustomRequirements(requirements) {
        console.log('Training with custom requirements:', requirements);

        const {
            sourceLang,
            targetLang,
            patterns = [],
            rules = [],
            emphasis = 'phonetic', // 'phonetic', 'semantic', 'mixed'
            specialHandling = []
        } = requirements;

        // Add pattern-based training data
        for (const pattern of patterns) {
            this.addTrainingData(sourceLang, targetLang, pattern.source, pattern.target);
        }

        // Generate rule-based training data
        for (const rule of rules) {
            const generatedData = this.generateFromRule(rule, sourceLang, targetLang);
            for (const data of generatedData) {
                this.addTrainingData(sourceLang, targetLang, data.source, data.target);
            }
        }

        // Apply emphasis-specific training
        if (emphasis === 'phonetic') {
            this.addPhoneticPatterns(sourceLang, targetLang);
        } else if (emphasis === 'semantic') {
            this.addSemanticPatterns(sourceLang, targetLang);
        }

        // Train the model
        return await this.trainModel(sourceLang, targetLang, {
            epochs: requirements.epochs || 1500,
            learningRate: requirements.learningRate || 0.001
        });
    }

    /**
     * Generate training data from rules
     */
    generateFromRule(rule, sourceLang, targetLang) {
        const generated = [];
        
        // Simple pattern matching rule generation
        if (rule.type === 'suffix') {
            const bases = rule.bases || ['test', 'work', 'play', 'run', 'walk'];
            for (const base of bases) {
                const source = base + rule.suffix;
                const target = this.applyRule(base, rule, targetLang);
                generated.push({ source, target });
            }
        }

        return generated;
    }

    /**
     * Apply transformation rule
     */
    applyRule(base, rule, targetLang) {
        // Simplified rule application
        if (rule.type === 'suffix' && targetLang === 'ta') {
            const baseTransliterated = this.phoneticApproximation(base, 'en', 'ta');
            const suffixTransliterated = this.phoneticApproximation(rule.suffix, 'en', 'ta');
            return baseTransliterated + suffixTransliterated;
        }
        
        return base + rule.suffix; // Fallback
    }

    /**
     * Add phonetic-focused patterns
     */
    addPhoneticPatterns(sourceLang, targetLang) {
        if (sourceLang === 'en' && targetLang === 'ta') {
            const phoneticPairs = [
                ['ka', 'க'], ['ga', 'க'], ['cha', 'ச'], ['ja', 'ஜ'],
                ['ta', 'த'], ['da', 'த'], ['pa', 'ப'], ['ba', 'ப'],
                ['ma', 'ம'], ['na', 'ந'], ['ra', 'ர'], ['la', 'ல'],
                ['va', 'வ'], ['ya', 'ய'], ['sa', 'ஸ'], ['ha', 'ஹ']
            ];

            for (const [source, target] of phoneticPairs) {
                this.addTrainingData(sourceLang, targetLang, source, target);
            }
        }
    }

    /**
     * Add semantic-focused patterns
     */
    addSemanticPatterns(sourceLang, targetLang) {
        if (sourceLang === 'en' && targetLang === 'ta') {
            const semanticPairs = [
                ['good', 'நல்ல'], ['bad', 'கெட்ட'], ['big', 'பெரிய'], ['small', 'சிறிய'],
                ['hot', 'சூடான'], ['cold', 'குளிர்ந்த'], ['fast', 'வேகமான'], ['slow', 'மெதுவான']
            ];

            for (const [source, target] of semanticPairs) {
                this.addTrainingData(sourceLang, targetLang, source, target);
            }
        }
    }

    /**
     * Simple phonetic approximation fallback
     */
    phoneticApproximation(text, sourceLang, targetLang) {
        // Simplified version for rule generation
        if (sourceLang === 'en' && targetLang === 'ta') {
            return text.replace(/[aeiou]/g, 'அ').replace(/[bcdfghjklmnpqrstvwxyz]/g, 'க்');
        }
        return text;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CustomAITransliterator = CustomAITransliterator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomAITransliterator;
}
