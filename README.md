# 🎓 Moodle Scraper

A powerful Node.js package to scrape Moodle LMS data including assignments, grades, files, and Zybook integrations.

## 🚀 Features

- **📚 Assignments**: Retrieve assignment details, due dates, and submission status
- **📊 Grades**: Extract gradebook data and feedback
- **📁 Files**: List and download course files and resources
- **🔗 Zybook Integration**: Access Zybook activities and progress
- **🔐 Secure Authentication**: Handle login with email and password
- **🛡️ 2FA Support**: Automatic detection and handling of Two-Factor Authentication
- **⚡ Fast & Reliable**: Built with Puppeteer for robust web scraping
- **📦 Easy to Use**: Simple API with TypeScript support

## 📦 Installation

```bash
npm install moodletracer
```

## 🛠️ Quick Start

### Basic Usage

```javascript
const { scrapeMoodle } = require('moodletracer');

async function getMoodleData() {
  const credentials = {
    email: 'your-email@example.com',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.com/course/view.php?id=123'
  };

  try {
    const data = await scrapeMoodle(credentials);
    
    console.log('Assignments:', data.assignments);
    console.log('Grades:', data.grades);
    console.log('Files:', data.files);
    console.log('Zybook Integrations:', data.zybookIntegrations);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getMoodleData();
```

### Advanced Usage

```javascript
const { MoodleScraper } = require('moodletracer');

async function advancedScraping() {
  const scraper = new MoodleScraper({
    email: 'your-email@example.com',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.com/course/view.php?id=123'
  }, {
    headless: true,     // Run in background
    timeout: 60000,     // 60 second timeout
    waitForElements: true
  });

  try {
    await scraper.initialize();
    await scraper.login();
    await scraper.navigateToClass();
    
    // Scrape specific data types
    const assignments = await scraper.scrapeAssignments();
    const grades = await scraper.scrapeGrades();
    
    return { assignments, grades };
  } finally {
    await scraper.close();
  }
}
```

## 🔐 Two-Factor Authentication (2FA)

If your Moodle instance uses 2FA, the scraper can handle it automatically:

```javascript
const scraper = new MoodleScraper(credentials, {
  headless: false, // Show browser for 2FA completion
  timeout: 60000   // Extended timeout for manual intervention
});

await scraper.initialize();
await scraper.login(); // Will detect and wait for 2FA if needed
```

**2FA Methods Supported:**
- **Manual completion**: Browser window stays open for you to complete 2FA
- **Session persistence**: Save login state to avoid repeated 2FA
- **Multiple 2FA types**: SMS, authenticator apps, email verification

See `examples/2fa-example.js` and `docs/2fa-handling-guide.md` for detailed 2FA handling strategies.

## 🐳 Container Deployment (Red Hat Technologies)

For production deployments, this package includes enterprise-grade containerization using Red Hat technologies:

### Quick Container Usage

```bash
# Build with Red Hat Universal Base Image (UBI)
npm run container:build

# Set environment variables
export MOODLE_EMAIL="your-email@university.edu"
export MOODLE_PASSWORD="your-password"
export MOODLE_CLASS_URL="https://moodle.university.edu/course/view.php?id=12345"

# Run containerized scraping
npm run container:run
```

### Enterprise Features

- **🔒 Red Hat UBI**: Built on enterprise-grade Universal Base Images
- **🛡️ Podman Ready**: Rootless, daemonless container execution
- **⚡ Security First**: No-new-privileges, capability dropping, read-only filesystem
- **📊 Production Ready**: Resource limits, health checks, SELinux support

### Container Commands

```bash
npm run container:build    # Build container with UBI
npm run container:run      # Run scraping in container
npm run container:debug    # Interactive debugging container
npm run container:info     # Show container information
npm run container:cleanup  # Clean up containers
```

See `docs/redhat-integration.md` and `examples/podman-container-example.js` for comprehensive container usage.

## 🔧 API Reference

### `scrapeMoodle(credentials, options?)`

Quick function to scrape all Moodle data.

**Parameters:**
- `credentials`: Object with `email`, `password`, and `classUrl`
- `options`: Optional scraper configuration

**Returns:** Promise resolving to `ScrapedData` object

### `MoodleScraper` Class

#### Constructor
```javascript
new MoodleScraper(credentials, options?)
```

#### Methods

- `initialize()`: Initialize browser instance
- `login()`: Authenticate with Moodle
- `navigateToClass()`: Navigate to the specified class
- `scrapeAssignments()`: Get all assignments
- `scrapeGrades()`: Get grade information
- `scrapeFiles()`: Get course files
- `scrapeZybookIntegrations()`: Get Zybook activities
- `scrapeAll()`: Get all data at once
- `close()`: Close browser instance

## 📊 Data Types

### Assignment
```typescript
{
  id: string;
  title: string;
  description: string;
  dueDate: Date | null;
  submissionStatus: 'submitted' | 'not_submitted' | 'late';
  maxGrade: number;
  currentGrade: number | null;
  url: string;
}
```

### Grade
```typescript
{
  itemName: string;
  grade: string;
  maxGrade: string;
  percentage: number | null;
  feedback: string | null;
  dateModified: Date | null;
}
```

### File
```typescript
{
  name: string;
  url: string;
  size: string;
  type: string;
  downloadUrl: string;
}
```

### Zybook Integration
```typescript
{
  title: string;
  url: string;
  dueDate: Date | null;
  completionStatus: string;
  progress: number | null;
}
```

## ⚙️ Configuration Options

```javascript
{
  headless: true,        // Run browser in background (default: true)
  timeout: 30000,        // Request timeout in ms (default: 30000)
  waitForElements: true  // Wait for page elements to load (default: true)
}
```

## 🔒 Security Notes

- **Never commit credentials**: Use environment variables or secure config files
- **Rate limiting**: Be respectful of Moodle server resources
- **Terms of service**: Ensure compliance with your institution's policies

## 📋 Requirements

- Node.js 16.0.0 or higher
- Chrome/Chromium browser (installed automatically with Puppeteer)

## 🐛 Troubleshooting

### Common Issues

1. **Login Failed**: 
   - Verify credentials are correct
   - Check if Moodle site uses SSO or 2FA
   - Ensure class URL is accessible

2. **Two-Factor Authentication**:
   - Set `headless: false` to see 2FA prompts
   - Use session persistence to avoid repeated 2FA
   - See 2FA handling guide for detailed solutions

3. **Elements Not Found**:
   - Different Moodle versions may have different HTML structures
   - Try increasing timeout values
   - Set `headless: false` to debug visually

4. **Memory Issues**:
   - Always call `scraper.close()` when done
   - Use `headless: true` for production

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.

## ⚠️ Disclaimer

This tool is for educational purposes.