# Semantic Similarity Analyzer

A powerful, privacy-focused web application that analyzes semantic similarity between keywords and text content using OpenAI's embedding models. Compare your content against competitors to optimize for better search rankings and content alignment.

![Semantic Similarity Analyzer](https://img.shields.io/badge/React-18.3.1-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue?style=flat-square&logo=typescript) ![OpenAI](https://img.shields.io/badge/OpenAI-API-green?style=flat-square&logo=openai) ![Vite](https://img.shields.io/badge/Vite-5.4.19-purple?style=flat-square&logo=vite) ![Netlify](https://img.shields.io/badge/Netlify-Ready-00C7B7?style=flat-square&logo=netlify)

## 🚀 Features

### Core Analysis
- **Semantic Similarity Scoring**: Uses OpenAI's `text-embedding-3-small` model to calculate semantic similarity between keywords and content
- **Competitive Analysis**: Compare your content against competitor content with side-by-side scoring
- **Weighted Keywords**: Support for keyword importance weighting (e.g., "SEO:3, content marketing:2")
- **Intelligent Text Sectioning**: Automatically detects content sections using headers, paragraphs, or fallback chunking
- **Two Analysis Modes**: Full document analysis or advanced chunked analysis

### AI-Powered Enhancement
- **Content Optimization**: AI-powered suggestions to improve semantic alignment
- **Inline Diff View**: Visual before/after comparison with highlighted changes
- **Contextual Evidence**: Shows exact text snippets where keywords appear or are missing
- **Section-by-Section Analysis**: Detailed breakdown of keyword coverage by content section

### User Experience
- **Process Transparency**: Clear explanations of what changes will be made and why
- **Collapsible Evidence**: Expandable sections showing keyword usage evidence
- **Real-time Processing**: Live analysis with progress indicators
- **Export Options**: CSV and text report exports for analysis results

### Security & Privacy
- **Client-Side Processing**: All analysis happens in your browser - no data sent to our servers
- **Secure API Key Handling**: Keys stored only in session memory, never persisted
- **Rate Limiting**: Built-in protection against API abuse
- **Content Sanitization**: Input sanitization to prevent XSS attacks
- **Security Headers**: Comprehensive security headers for protection

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible component primitives
- **React Hook Form** with Zod validation
- **TanStack Query** for API state management

### AI & Analysis
- **OpenAI API** (`text-embedding-3-small` model)
- **Custom embedding algorithms** for weighted keyword centroids
- **Cosine similarity calculations** for semantic matching
- **Intelligent text chunking** with section detection

### Security
- **DOMPurify** for XSS protection
- **Client-side rate limiting**
- **Secure session storage** with basic encryption
- **Input validation** with comprehensive API key checks

### Deployment
- **Netlify** with serverless functions
- **Modern build optimization** with code splitting
- **Progressive Web App** capabilities

## 📦 Installation

### Prerequisites
- Node.js 20.x or higher
- npm or yarn package manager
- OpenAI API key (starting with `sk-`)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/vesivanov/semantic-similarity-analyzer.git
   cd semantic-similarity-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Environment Variables
No environment variables needed! The application runs entirely client-side for maximum privacy.

### OpenAI API Key
- Users provide their own OpenAI API key through the secure form
- Keys are validated client-side (must start with `sk-`)
- Keys are stored only in session memory and cleared on page refresh
- Estimated cost: ~$0.0002 per complete analysis

## 📖 Usage

### Basic Analysis

1. **Enter API Key**: Provide your OpenAI API key (secure, masked input)
2. **Add Keywords**: Enter target keywords, optionally with weights
   ```
   Simple format: SEO, content marketing, digital strategy
   Weighted format: SEO:3, content marketing:2, digital strategy:1
   ```
3. **Input Content**: Paste your main content and competitor content
4. **Choose Analysis Mode**: 
   - **Full Document**: Single similarity score for entire content
   - **Chunked**: Section-by-section analysis with detailed breakdown
5. **Run Analysis**: Click "Analyze Content" and wait for results

### Advanced Features

#### Keyword Weighting
- Default weight: 1.0
- Range: 0.1 to 10.0
- Higher weights = more influence on final score
- Format: `keyword:weight` (e.g., "SEO:3")

#### Chunked Analysis
- Automatically detects content sections using:
  - HTML headings (`<h1>`, `<h2>`, etc.)
  - Markdown headings (`#`, `##`, etc.)
  - Paragraph breaks
  - Fallback 500-word chunks with 100-word overlap

#### AI Enhancement
- Get AI-powered suggestions to improve content
- See exactly what changes will be made before applying
- Visual diff view with highlighted additions
- Contextual explanations for each change

#### Evidence Explorer
- See exact text snippets where keywords appear
- Identify strong and weak sections
- Compare keyword usage with competitors
- Get specific recommendations for improvement

## 🔐 Security Features

### Privacy Protection
- **No server-side storage** of API keys or content
- **Session-only data** - cleared on page refresh
- **Client-side processing** - your content never leaves your browser
- **Secure API key handling** with validation and masking

### Security Headers
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Rate Limiting
- **Client-side rate limiting**: 10 requests per 15 minutes
- **Automatic retry logic** with exponential backoff
- **Clear error messages** for rate limit violations

## 🚀 Deployment

### Netlify (Recommended)
The application is configured for one-click Netlify deployment:

1. **Fork this repository**
2. **Connect to Netlify**
3. **Deploy**: Uses included `netlify.toml` configuration
4. **Custom domain**: Optional - configure in Netlify dashboard

### Manual Deployment
```bash
# Build the application
npm run build

# Deploy the dist/public folder to any static hosting service
```

### Build Configuration
- **Output directory**: `dist/public`
- **Build command**: `npm run build:client`
- **Node version**: 20.x

## 📊 Performance

### Optimization Features
- **Code splitting**: Separate chunks for React, UI components, and OpenAI
- **Lazy loading**: Components loaded on demand
- **Caching**: Static assets cached for 1 year
- **Compression**: Gzip compression enabled

### Performance Metrics
- **Bundle size**: Optimized with tree shaking
- **Loading time**: < 3 seconds on fast connections
- **Analysis time**: Typically 5-15 seconds depending on content length

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run check

# Run security audit
npm run security-check
```

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Consistent code formatting
- **Zod**: Runtime type validation

### Architecture
```
client/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── analysis-form.tsx
│   │   ├── results-display.tsx
│   │   ├── ai-enhancement.tsx
│   │   └── ...
│   ├── lib/                # Utility functions
│   │   ├── analysis.ts     # Core analysis logic
│   │   ├── text-analysis.ts # Text processing
│   │   ├── security.ts     # Security utilities
│   │   └── ...
│   ├── services/           # API services
│   │   └── openai-client.service.ts
│   ├── pages/              # Route components
│   └── hooks/              # Custom React hooks
shared/
└── schema.ts               # Shared TypeScript types
```

### Pull Request Guidelines
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 🐛 Troubleshooting

### Common Issues

**"Invalid API key format"**
- Ensure your OpenAI API key starts with `sk-`
- Check for extra spaces or line breaks
- Verify the key is complete (usually 40+ characters)

**"Rate limit exceeded"**
- Wait 15 minutes before trying again
- Check your OpenAI account usage limits
- Consider upgrading your OpenAI plan

**"Analysis failed"**
- Check your internet connection
- Verify your OpenAI account has sufficient credits
- Try reducing content length if very long

**"No sections detected"**
- Add headings to your content for better analysis
- Use markdown headers (`#`, `##`) or HTML headers
- Content will fall back to paragraph-based chunking

### Debug Mode
Open browser developer tools to see detailed error messages and analysis logs.

## 📄 API Usage & Costs

### OpenAI API Usage
- **Model**: `text-embedding-3-small` (1536 dimensions)
- **Typical usage**: 1-5 API calls per analysis
- **Cost per 1K tokens**: $0.00002
- **Estimated cost per analysis**: $0.0002 - $0.002

### Token Estimation
- **~4 characters per token** for English text
- **Keywords**: Usually 1-3 tokens each
- **Content**: Varies by length (4000 words ≈ 1000 tokens)

## 🔄 Changelog

### Version 2.0.0 (Current)
- ✨ AI-powered content enhancement
- 🔍 Intelligent text sectioning
- 📊 Enhanced keyword coverage analysis
- 🎨 Improved UI with diff view
- 🔒 Enhanced security features
- 📱 Better mobile responsiveness

### Version 1.0.0
- 🚀 Initial release
- 📊 Basic semantic similarity analysis
- 🔑 Weighted keyword support
- 📈 Competitive analysis
- 🔒 Privacy-focused design

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the embedding API
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for the utility-first CSS framework
- **React** and **TypeScript** communities

## 💬 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/vesivanov/semantic-similarity-analyzer/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/vesivanov/semantic-similarity-analyzer/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/vesivanov/semantic-similarity-analyzer/wiki)

## 🔮 Roadmap

- [ ] **Multi-language support** for non-English content
- [ ] **Batch analysis** for multiple documents
- [ ] **Historical tracking** of optimization progress
- [ ] **Advanced visualizations** with charts and graphs
- [ ] **Integration APIs** for other tools
- [ ] **Team collaboration** features
- [ ] **Custom embedding models** support

---

<div align="center">
  <strong>Made with ❤️ for content creators and SEO professionals</strong>
  <br>
  <sub>Built with React, TypeScript, and OpenAI</sub>
</div> 