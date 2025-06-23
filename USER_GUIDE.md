# 🎓 Moodle Scraper User Guide

A complete guide for users to install, configure, and use the Moodle Scraper package.

## 📦 Installation

### Option 1: From npm (Recommended)
```bash
npm install moodleScrapper
```

### Option 2: From GitHub (Development)
```bash
npm install git+https://github.com/yourusername/moodle-scraper.git
```

### Option 3: Local Installation (Testing)
```bash
git clone https://github.com/yourusername/moodle-scraper.git
cd moodle-scraper
npm install
npm run build
npm link  # Makes it available globally
```

## 🚀 Quick Start

### 1. Basic Scraping Example

Create a file called `my-scraper.js`:

```javascript
const { scrapeMoodle } = require('moodleScrapper');

async function scrapeMoodleData() {
  // Your Moodle credentials
  const credentials = {
    email: 'your-email@university.edu',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.edu/course/view.php?id=12345'
  };

  // Optional configuration
  const options = {
    headless: true,        // Run browser in background
    timeout: 30000,        // 30 second timeout
    waitForElements: true  // Wait for page elements to load
  };

  try {
    console.log('🔄 Starting Moodle scraping...');
    const data = await scrapeMoodle(credentials, options);
    
    console.log('✅ Scraping completed!');
    console.log('📚 Assignments:', data.assignments.length);
    console.log('📊 Grades:', data.grades.length);
    console.log('📁 Files:', data.files.length);
    console.log('🔗 Zybook Integrations:', data.zybookIntegrations.length);
    
    return data;
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  }
}

// Run the scraper
scrapeMoodleData()
  .then(data => {
    console.log('🎉 Success! Data scraped successfully.');
    // Process your data here
  })
  .catch(error => {
    console.error('💥 Error:', error.message);
    process.exit(1);
  });
```

Run it:
```bash
node my-scraper.js
```

### 2. Advanced Usage with Class Instance

```javascript
const { MoodleScraper } = require('moodleScrapper');

async function advancedScraping() {
  const scraper = new MoodleScraper({
    email: 'your-email@university.edu',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.edu/course/view.php?id=12345'
  }, {
    headless: false,  // Show browser for debugging
    timeout: 60000    // 1 minute timeout
  });

  try {
    // Initialize browser
    await scraper.initialize();
    console.log('🌐 Browser initialized');

    // Login to Moodle
    await scraper.login();
    console.log('🔐 Logged in successfully');

    // Navigate to class
    await scraper.navigateToClass();
    console.log('📚 Navigated to class');

    // Scrape specific data types
    const assignments = await scraper.scrapeAssignments();
    console.log(`📝 Found ${assignments.length} assignments`);

    const grades = await scraper.scrapeGrades();
    console.log(`📊 Found ${grades.length} grades`);

    const files = await scraper.scrapeFiles();
    console.log(`📁 Found ${files.length} files`);

    return { assignments, grades, files };
    
  } finally {
    // Always close the browser
    await scraper.close();
    console.log('🔒 Browser closed');
  }
}

advancedScraping();
```

## 🔐 Handling Two-Factor Authentication (2FA)

If your Moodle uses 2FA:

```javascript
const { MoodleScraper } = require('moodleScrapper');

async function scrapeWith2FA() {
  const scraper = new MoodleScraper({
    email: 'your-email@university.edu',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.edu/course/view.php?id=12345'
  }, {
    headless: false,  // IMPORTANT: Keep browser visible for 2FA
    timeout: 120000   // Extended timeout for manual 2FA completion
  });

  try {
    await scraper.initialize();
    
    console.log('🔐 Attempting login...');
    console.log('💡 If 2FA appears, complete it in the browser window');
    
    await scraper.login(); // Will wait for you to complete 2FA
    
    console.log('✅ Login successful (including 2FA if required)');
    
    const data = await scraper.scrapeAll();
    return data;
    
  } finally {
    await scraper.close();
  }
}
```

## 🐳 Using with Containers (Red Hat Technologies)

### Prerequisites
- Install [Podman](https://podman.io/getting-started/installation)

### Quick Container Usage

```bash
# 1. Set your credentials as environment variables
export MOODLE_EMAIL="your-email@university.edu"
export MOODLE_PASSWORD="your-password"
export MOODLE_CLASS_URL="https://moodle.university.edu/course/view.php?id=12345"

# 2. Run containerized scraping
npm run container:run

# 3. Find results in examples/output/scraped-data.json
```

### Custom Container Usage

```bash
# Build the container
npm run container:build

# Run with custom settings
podman run --rm \
  -e MOODLE_EMAIL="your-email@university.edu" \
  -e MOODLE_PASSWORD="your-password" \
  -e MOODLE_CLASS_URL="https://your-moodle.edu/course/view.php?id=123" \
  -v $(pwd)/output:/app/output:Z \
  moodle-scraper:latest
```

## 📊 Data Structures

### Assignment Object
```javascript
{
  id: "12345",
  title: "Programming Assignment 1",
  description: "Complete the coding exercise...",
  dueDate: "2024-03-15T23:59:00.000Z",
  submissionStatus: "submitted", // or "not_submitted", "late"
  maxGrade: 100,
  currentGrade: 85,
  url: "https://moodle.edu/mod/assign/view.php?id=12345"
}
```

### Grade Object
```javascript
{
  itemName: "Programming Assignment 1",
  grade: "85",
  maxGrade: "100",
  percentage: 85.0,
  feedback: "Good work! Consider improving...",
  dateModified: "2024-03-10T14:30:00.000Z"
}
```

### File Object
```javascript
{
  name: "lecture-notes.pdf",
  url: "https://moodle.edu/pluginfile.php/123/mod_resource/content/1/lecture-notes.pdf",
  size: "2.5 MB",
  type: "pdf",
  downloadUrl: "https://moodle.edu/pluginfile.php/123/mod_resource/content/1/lecture-notes.pdf"
}
```

### Zybook Integration Object
```javascript
{
  title: "Chapter 3: Arrays and Strings",
  url: "https://learn.zybooks.com/zybook/UNIVCS101Fall2023/chapter/3",
  dueDate: "2024-03-20T23:59:00.000Z",
  completionStatus: "In Progress",
  progress: 75.5
}
```

## ⚙️ Configuration Options

```javascript
const options = {
  headless: true,         // Run browser in background (default: true)
  timeout: 30000,         // Request timeout in milliseconds (default: 30000)
  waitForElements: true   // Wait for page elements to load (default: true)
};
```

## 🔒 Security Best Practices

### 1. Never Hardcode Credentials
```javascript
// ❌ DON'T DO THIS
const credentials = {
  email: 'student@university.edu',
  password: 'my-secret-password'  // Never hardcode passwords!
};

// ✅ DO THIS INSTEAD
const credentials = {
  email: process.env.MOODLE_EMAIL,
  password: process.env.MOODLE_PASSWORD,
  classUrl: process.env.MOODLE_CLASS_URL
};
```

### 2. Use Environment Variables
Create a `.env` file (and add it to `.gitignore`):
```bash
MOODLE_EMAIL=your-email@university.edu
MOODLE_PASSWORD=your-password
MOODLE_CLASS_URL=https://moodle.university.edu/course/view.php?id=12345
```

Then use dotenv:
```bash
npm install dotenv
```

```javascript
require('dotenv').config();

const credentials = {
  email: process.env.MOODLE_EMAIL,
  password: process.env.MOODLE_PASSWORD,
  classUrl: process.env.MOODLE_CLASS_URL
};
```

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. "Login Failed" Error
```
Error: Login failed: Invalid credentials
```
**Solutions:**
- Double-check your email and password
- Ensure your Moodle site doesn't use SSO (Single Sign-On)
- Try logging in manually through a browser first
- Check if your account requires 2FA

#### 2. "Elements Not Found" Error
```
Error: Could not find login form elements
```
**Solutions:**
- Your Moodle site might have a different layout
- Try setting `headless: false` to see what's happening
- Increase the timeout: `timeout: 60000`
- Check if the class URL is correct

#### 3. Two-Factor Authentication Issues
```
Error: Login failed after entering credentials
```
**Solutions:**
- Set `headless: false` to see the 2FA prompt
- Increase timeout: `timeout: 120000` (2 minutes)
- Complete 2FA manually in the browser window
- See the 2FA examples in the `examples/` folder

#### 4. Memory Issues
```
Error: Page crashed
```
**Solutions:**
- Always call `scraper.close()` when done
- Use `headless: true` for production
- Reduce concurrent operations
- Consider using containers for isolation

#### 5. Network Timeouts
```
Error: Navigation timeout exceeded
```
**Solutions:**
- Increase timeout: `timeout: 60000` or higher
- Check your internet connection
- Verify the Moodle site is accessible
- Try during off-peak hours

### Debug Mode
Run with visible browser to see what's happening:
```javascript
const scraper = new MoodleScraper(credentials, {
  headless: false,  // Show browser
  timeout: 60000    // Extended timeout
});
```

## 📁 File Structure for Users

```
your-project/
├── package.json
├── .env                    # Your credentials (don't commit!)
├── .gitignore             # Include .env here
├── my-scraper.js          # Your scraping script
└── output/                # Scraped data will be saved here
    ├── assignments.json
    ├── grades.json
    └── files.json
```

## 🚀 Advanced Examples

### 1. Save Data to JSON Files
```javascript
const fs = require('fs');
const { scrapeMoodle } = require('moodleScrapper');

async function saveScrapedData() {
  const data = await scrapeMoodle({
    email: process.env.MOODLE_EMAIL,
    password: process.env.MOODLE_PASSWORD,
    classUrl: process.env.MOODLE_CLASS_URL
  });

  // Create output directory
  if (!fs.existsSync('output')) {
    fs.mkdirSync('output');
  }

  // Save each data type to separate files
  fs.writeFileSync('output/assignments.json', JSON.stringify(data.assignments, null, 2));
  fs.writeFileSync('output/grades.json', JSON.stringify(data.grades, null, 2));
  fs.writeFileSync('output/files.json', JSON.stringify(data.files, null, 2));
  fs.writeFileSync('output/zybooks.json', JSON.stringify(data.zybookIntegrations, null, 2));

  console.log('✅ Data saved to output/ directory');
}
```

### 2. Multiple Classes
```javascript
const { MoodleScraper } = require('moodleScrapper');

async function scrapeMultipleClasses() {
  const credentials = {
    email: process.env.MOODLE_EMAIL,
    password: process.env.MOODLE_PASSWORD
  };

  const classUrls = [
    'https://moodle.edu/course/view.php?id=123',
    'https://moodle.edu/course/view.php?id=456',
    'https://moodle.edu/course/view.php?id=789'
  ];

  const allData = {};

  for (const classUrl of classUrls) {
    console.log(`📚 Scraping class: ${classUrl}`);
    
    const scraper = new MoodleScraper({
      ...credentials,
      classUrl
    });

    try {
      await scraper.initialize();
      await scraper.login();
      await scraper.navigateToClass();
      
      const data = await scraper.scrapeAll();
      allData[classUrl] = data;
      
    } finally {
      await scraper.close();
    }
  }

  return allData;
}
```

### 3. Scheduled Scraping
```javascript
const cron = require('node-cron');
const { scrapeMoodle } = require('moodleScrapper');

// Run every day at 8 AM
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Starting scheduled Moodle scraping...');
  
  try {
    const data = await scrapeMoodle({
      email: process.env.MOODLE_EMAIL,
      password: process.env.MOODLE_PASSWORD,
      classUrl: process.env.MOODLE_CLASS_URL
    });
    
    // Process or save data
    console.log('✅ Scheduled scraping completed');
    
  } catch (error) {
    console.error('❌ Scheduled scraping failed:', error.message);
  }
});
```

## 📞 Getting Help

- **Documentation**: Check the examples in the `examples/` folder
- **Issues**: Report bugs on GitHub
- **2FA Guide**: See `docs/2fa-handling-guide.md`
- **Container Guide**: See `docs/redhat-integration.md`

## ⚠️ Important Notes

1. **Respect Terms of Service**: Ensure your usage complies with your institution's policies
2. **Rate Limiting**: Don't overload the Moodle server with too many requests
3. **Data Privacy**: Handle scraped data responsibly and securely
4. **Authentication**: Never share or commit your login credentials

## 🎯 Quick Reference

```bash
# Install
npm install moodleScrapper

# Basic usage
node my-scraper.js

# Container usage
npm run container:run

# Debug mode
# Set headless: false in your script
```

That's it! You're ready to start scraping Moodle data. Happy coding! 🎉 