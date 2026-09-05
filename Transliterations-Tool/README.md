# Transliterations Tool for Street Signs

A comprehensive web application for transliterating text between English and Indian language scripts, developed for AICTE. This tool helps bridge linguistic barriers by providing accurate transliteration with AI-powered technology and OCR capabilities for street sign text extraction.

## 🌟 Features

### Core Functionality
- **Multi-Language Support**: Supports English and 9 Indian languages with their respective scripts
- **AI-Powered Transliteration**: Uses AI4Bharat's IndicXlit for >90% accuracy
- **OCR Integration**: Extract text from street sign images using Tesseract.js
- **Real-time Processing**: Instant transliteration as you type
- **Offline Capability**: Fallback transliteration mappings for offline use

### Supported Languages
- **English** (Latin script)
- **Hindi** (Devanagari script)
- **Tamil** (Tamil script)
- **Telugu** (Telugu script)
- **Malayalam** (Malayalam script)
- **Kannada** (Kannada script)
- **Punjabi** (Gurmukhi script)
- **Gujarati** (Gujarati script)
- **Bengali** (Bengali script)
- **Odia** (Odia script)

### User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Accessibility Compliant**: WCAG 2.1 Level AA compliance
- **History Management**: Keep track of recent transliterations
- **Gallery Examples**: Curated examples of street sign transliterations
- **Progressive Web App**: Fast loading and offline capabilities

### Accessibility Features
- **Screen Reader Support**: Full compatibility with assistive technologies
- **Keyboard Navigation**: Complete keyboard accessibility with skip links
- **High Contrast Mode**: Toggle for better visibility
- **Font Size Adjustment**: Customizable text size for better readability
- **Reduced Motion Support**: Respects user motion preferences

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for AI-powered transliteration
- Camera access for OCR functionality (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aicte/transliterations-tool.git
   cd transliterations-tool
   ```

2. **Open in web browser:**
   - Open `index.html` in your preferred web browser
   - Or serve using a local web server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx serve .
     
     # Using PHP
     php -S localhost:8000
     ```

3. **Access the application:**
   - Navigate to `http://localhost:8000` (if using local server)
   - Or simply open `index.html` directly in your browser

### GitHub Pages Deployment

This project is configured for GitHub Pages deployment:

1. **Fork the repository** to your GitHub account
2. **Enable GitHub Pages** in repository settings
3. **Select source** as "Deploy from a branch"
4. **Choose branch** `main` and folder `/ (root)`
5. **Access your deployment** at `https://yourusername.github.io/transliterations-tool`

## 📖 Usage Guide

### Basic Transliteration

1. **Navigate to the Transliteration page**
2. **Select source and target languages** from the dropdowns
3. **Type or paste text** in the input field
4. **View real-time transliteration** in the output field
5. **Copy results** using the copy button

### OCR Text Extraction

1. **Go to the OCR section** on the Transliteration page
2. **Upload an image** by:
   - Clicking "Choose File" to select from device
   - Dragging and dropping an image
   - Using camera capture (mobile devices)
3. **Wait for processing** (progress indicator shown)
4. **Review extracted text** and transliterate as needed

### History Management

- **View recent transliterations** in the History section
- **Reuse previous entries** by clicking on them
- **Delete specific entries** using the delete button
- **Clear all history** with the clear button

### Accessibility Options

- **Open accessibility panel** by clicking the accessibility icon (⚑)
- **Toggle high contrast mode** for better visibility
- **Adjust font size** using increase/decrease buttons
- **Use keyboard shortcuts**:
  - `Alt + M`: Jump to main content
  - `Alt + N`: Jump to navigation
  - `Alt + T`: Jump to transliteration form
  - `Escape`: Close modals and panels

## 🛠️ Technical Architecture

### Frontend Stack
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Responsive design with custom properties
- **Vanilla JavaScript**: Modern ES6+ features, no frameworks
- **Progressive Web App**: Service worker and manifest

### AI Integration
- **AI4Bharat IndicXlit**: Primary transliteration service
- **Fallback Mappings**: Offline transliteration rules
- **Language Detection**: Automatic source language identification

### OCR Technology
- **Tesseract.js**: Client-side OCR processing
- **WebWorker Support**: Non-blocking image processing
- **Multiple Formats**: Support for JPG, PNG, WebP images

### Performance Features
- **Lazy Loading**: Images and components loaded on demand
- **Code Splitting**: Modular JavaScript architecture
- **Caching Strategy**: Efficient resource caching
- **Compression**: Optimized assets for fast loading

## 📁 Project Structure

```
transliterations-tool/
├── index.html                 # Landing page
├── transliteration.html       # Main application page
├── about.html                 # About page
├── help.html                  # Help and tutorials
├── contact.html               # Contact information
├── gallery.html               # Example gallery
├── assets/
│   ├── styles/
│   │   └── main.css           # Main stylesheet
│   └── example-signs/         # Sample street sign images
├── js/
│   ├── transliteration.js     # Core transliteration logic
│   ├── ocr.js                 # OCR functionality
│   ├── history.js             # History management
│   ├── accessibility.js       # Accessibility features
│   └── utils.js               # Utility functions
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker
└── README.md                  # This file
```

## 🔧 Configuration

### API Configuration

The application uses AI4Bharat's IndicXlit API. To configure:

1. **Get API credentials** from AI4Bharat
2. **Update API endpoints** in `js/transliteration.js`:
   ```javascript
   const API_CONFIG = {
       baseUrl: 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
       apiKey: 'your-api-key-here'
   };
   ```

### OCR Configuration

Tesseract.js OCR can be configured in `js/ocr.js`:

```javascript
const OCR_CONFIG = {
    languages: ['eng', 'hin', 'tam', 'tel'], // Add required languages
    tesseractOptions: {
        logger: m => console.log(m)
    }
};
```

### Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 70+ | Full support |
| Firefox | 65+ | Full support |
| Safari | 12+ | Full support |
| Edge | 79+ | Full support |
| Mobile Safari | 12+ | Full support |
| Chrome Mobile | 70+ | Full support |

## 🎨 Customization

### Styling

The application uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #001F3F;      /* Navy blue */
    --secondary-color: #007BFF;     /* Light blue */
    --accent-color: #FFFFFF;        /* White */
    --text-color: #333333;          /* Dark gray */
    --border-radius: 8px;           /* Rounded corners */
    --box-shadow: 0 2px 10px rgba(0,0,0,0.1); /* Shadows */
}
```

### Adding New Languages

To add support for a new language:

1. **Update language configuration** in `js/utils.js`:
   ```javascript
   supported: {
       'new': { name: 'New Language', script: 'New Script', code: 'new' }
   }
   ```

2. **Add fallback mappings** in `js/transliteration.js`
3. **Update language selectors** in HTML files
4. **Add OCR language support** in `js/ocr.js`

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Basic transliteration** works for all language pairs
- [ ] **OCR processing** handles different image formats
- [ ] **History management** saves and loads correctly
- [ ] **Accessibility features** work with screen readers
- [ ] **Responsive design** works on all device sizes
- [ ] **Offline functionality** provides fallback options

### Browser Testing

Test the application across different browsers and devices:

- Desktop: Chrome, Firefox, Safari, Edge
- Mobile: iOS Safari, Chrome Mobile, Samsung Internet
- Tablet: iPad Safari, Android Chrome

### Accessibility Testing

- Use screen readers (NVDA, JAWS, VoiceOver)
- Test keyboard navigation
- Verify color contrast ratios
- Check with accessibility tools (axe, WAVE)

## 🤝 Contributing

We welcome contributions to improve the Transliterations Tool!

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Add comments for complex logic
- Test accessibility features
- Update documentation as needed
- Ensure cross-browser compatibility

### Bug Reports

When reporting bugs, please include:

- Browser and version
- Device and operating system
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AI4Bharat** for the IndicXlit transliteration technology
- **AICTE** for project sponsorship and requirements
- **Tesseract.js** team for client-side OCR capabilities
- **Contributors** who helped improve the application

## 📞 Support

### Getting Help

- **Documentation**: Check this README and help pages
- **Issues**: Report bugs on GitHub Issues
- **Email**: Contact [contact@transliterations.tool](mailto:contact@transliterations.tool)

### FAQ

**Q: Why is transliteration accuracy sometimes low?**
A: Accuracy depends on the AI service availability. The application includes fallback mappings for offline use, though they may be less accurate.

**Q: Can I use this tool offline?**
A: Basic functionality works offline using fallback transliteration rules. OCR and AI-powered transliteration require internet connection.

**Q: How do I report accessibility issues?**
A: Please report accessibility concerns through GitHub Issues with the "accessibility" label.

**Q: Is my data stored or transmitted?**
A: The application processes data locally. Only transliteration requests are sent to AI4Bharat's API. No personal data is stored on servers.

## 🗺️ Roadmap

### Upcoming Features

- [ ] **Voice Input**: Speech-to-text for hands-free operation
- [ ] **Batch Processing**: Handle multiple images at once
- [ ] **Export Options**: PDF and Word document export
- [ ] **Language Detection**: Automatic script detection from images
- [ ] **Mobile App**: Native iOS and Android applications
- [ ] **API Integration**: Public API for developers

### Long-term Goals

- Support for additional Indian languages
- Integration with government databases
- Real-time collaboration features
- Advanced OCR with handwriting recognition
- Machine learning model training interface

---

**Developed with ❤️ for AICTE by the Transliterations Tool Team**

*Bridging linguistic barriers through technology*
