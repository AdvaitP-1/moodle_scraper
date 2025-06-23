# 🔐 Two-Factor Authentication (2FA) Handling Guide

## Overview

Many Moodle instances use 2FA for enhanced security. This guide covers strategies for handling 2FA in your scraping workflow.

## 🚨 Detection

The scraper can detect when 2FA is required:

```typescript
// In MoodleAuth.ts - add 2FA detection
async detect2FA(): Promise<boolean> {
  const twoFactorSelectors = [
    'input[name="pin"]',
    'input[name="code"]', 
    'input[name="token"]',
    'input[name="verification_code"]',
    '.two-factor',
    '.2fa',
    '.mfa',
    '[class*="authenticator"]',
    'input[placeholder*="code" i]',
    'input[placeholder*="token" i]',
    // Duo Mobile specific selectors
    '.duo-frame',
    '#duo_iframe',
    '[src*="duosecurity.com"]',
    '.duo-auth',
    '.duo-login',
    'iframe[title*="duo" i]'
  ];

  for (const selector of twoFactorSelectors) {
    const element = await this.page.$(selector);
    if (element) {
      console.log('🔐 2FA detected - manual intervention required');
      return true;
    }
  }

  // Check for common 2FA page indicators including Duo Mobile
  const pageContent = await this.page.content();
  const twoFactorIndicators = [
    'two-factor',
    'authentication code', 
    'verification code',
    'authenticator app',
    'text message',
    'SMS code',
    // Duo Mobile specific indicators
    'duo mobile',
    'duo security',
    'duo authentication',
    'duosecurity.com',
    'push notification',
    'duo push',
    'checking for request',
    'waiting for response'
  ];

  return twoFactorIndicators.some(indicator => 
    pageContent.toLowerCase().includes(indicator)
  );
}
```

## 🛠️ Solution Approaches

### 1. **Manual Intervention (Recommended)**

Pause the scraper and allow manual 2FA completion:

```typescript
async handleManual2FA(): Promise<void> {
  const is2FA = await this.detect2FA();
  
  if (is2FA) {
    console.log('\n🔐 Two-Factor Authentication Required');
    console.log('📱 Please complete 2FA in the browser window');
    console.log('⏳ Waiting for you to complete authentication...\n');
    
    // Wait for user to complete 2FA
    await this.waitFor2FACompletion();
  }
}

private async waitFor2FACompletion(): Promise<void> {
  const maxWaitTime = 300000; // 5 minutes
  const checkInterval = 2000; // 2 seconds
  let elapsed = 0;
  let duoDetected = false;

  while (elapsed < maxWaitTime) {
    // Check if we've moved past the 2FA page
    const still2FA = await this.detect2FA();
    const onDashboard = await this.isOnDashboard();
    
    // Special handling for Duo Mobile
    if (!duoDetected) {
      const pageContent = await this.page.content();
      if (pageContent.toLowerCase().includes('duo') || 
          pageContent.toLowerCase().includes('push notification')) {
        duoDetected = true;
        console.log('📱 Duo Mobile detected - check your phone for push notification');
      }
    }
    
    if (!still2FA || onDashboard) {
      console.log('✅ 2FA completed successfully!');
      return;
    }

    await this.page.waitForTimeout(checkInterval);
    elapsed += checkInterval;
    
    // Show progress with Duo-specific messaging
    if (elapsed % 10000 === 0) {
      const remaining = Math.floor((maxWaitTime - elapsed) / 1000);
      if (duoDetected) {
        console.log(`📱 Still waiting for Duo Mobile approval... (${remaining}s remaining)`);
        console.log('💡 Check your phone for the push notification');
      } else {
        console.log(`⏳ Still waiting... (${remaining}s remaining)`);
      }
    }
  }

  throw new Error('2FA timeout - please complete authentication faster');
}

private async isOnDashboard(): Promise<boolean> {
  const dashboardSelectors = [
    '.dashboard',
    '.course-overview',
    '.block_myoverview',
    '[data-region="view-overview"]'
  ];

  for (const selector of dashboardSelectors) {
    const element = await this.page.$(selector);
    if (element) return true;
  }

  return false;
}
```

### 2. **Interactive Prompts**

Use command-line prompts for codes:

```typescript
import * as readline from 'readline';

async handleInteractive2FA(): Promise<void> {
  const is2FA = await this.detect2FA();
  
  if (is2FA) {
    const code = await this.prompt2FACode();
    await this.submit2FACode(code);
  }
}

private async prompt2FACode(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🔐 Enter your 2FA code: ', (code) => {
      rl.close();
      resolve(code.trim());
    });
  });
}

private async submit2FACode(code: string): Promise<void> {
  const codeSelectors = [
    'input[name="pin"]',
    'input[name="code"]',
    'input[name="token"]',
    'input[name="verification_code"]'
  ];

  let codeField = null;
  for (const selector of codeSelectors) {
    codeField = await this.page.$(selector);
    if (codeField) break;
  }

  if (!codeField) {
    throw new Error('Could not find 2FA code input field');
  }

  await codeField.type(code);
  
  // Find and click submit button
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:contains("Verify")',
    'button:contains("Continue")',
    'button:contains("Submit")'
  ];

  let submitButton = null;
  for (const selector of submitSelectors) {
    submitButton = await this.page.$(selector);
    if (submitButton) break;
  }

  if (submitButton) {
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
      submitButton.click()
    ]);
  }
}
```

### 3. **Alternative Authentication Methods**

#### App-Specific Passwords
Some institutions allow app-specific passwords:

```typescript
// Use app-specific password instead of regular password
const credentials = {
  email: 'your-email@university.edu',
  password: 'app-specific-password-here', // Not your regular password
  classUrl: 'https://moodle.university.edu/course/view.php?id=123'
};
```

#### API Tokens (If Available)
Check if your Moodle instance supports API access:

```typescript
// Alternative API-based approach
class MoodleAPIClient {
  constructor(private token: string, private baseUrl: string) {}

  async getAssignments(): Promise<Assignment[]> {
    const response = await fetch(`${this.baseUrl}/webservice/rest/server.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        wstoken: this.token,
        wsfunction: 'mod_assign_get_assignments',
        moodlewsrestformat: 'json'
      })
    });
    
    return await response.json();
  }
}
```

### 4. **Configuration-Based Approach**

Allow users to specify 2FA handling method:

```typescript
interface ScraperOptions {
  timeout?: number;
  headless?: boolean;
  waitForElements?: boolean;
  twoFactorMethod?: '2fa-manual' | '2fa-interactive' | '2fa-skip';
  twoFactorTimeout?: number; // milliseconds
}

// Usage
const scraper = new MoodleScraper(credentials, {
  twoFactorMethod: '2fa-manual',
  twoFactorTimeout: 300000 // 5 minutes
});
```

## 🔧 Implementation in MoodleScraper

Add 2FA handling to your login method:

```typescript
async login(): Promise<boolean> {
  if (!this.page) throw new Error('Browser not initialized');

  try {
    const auth = new MoodleAuth(this.page, this.credentials);
    const loginSuccess = await auth.authenticate();
    
    if (!loginSuccess) {
      // Check if 2FA is blocking us
      const requires2FA = await auth.detect2FA();
      if (requires2FA) {
        console.log('🔐 2FA detected - switching to manual mode');
        await auth.handleManual2FA();
        return true; // Assume success after manual completion
      }
      throw new Error('Login failed');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

## 💡 Best Practices

### 1. **User Communication**
```typescript
console.log('🔐 2FA Required');
console.log('📱 Please check your authenticator app or SMS');
console.log('⌨️  Enter the code in the browser window');
console.log('⏳ The scraper will continue automatically once completed');
```

### 2. **Graceful Timeouts**
```typescript
const options = {
  twoFactorTimeout: 300000, // 5 minutes - reasonable time
  onTimeout: () => {
    console.log('⏰ 2FA timeout - you can restart the scraper');
    console.log('💡 Tip: Complete 2FA faster next time');
  }
};
```

### 3. **Browser Visibility**
```typescript
// Make browser visible for 2FA
const scraper = new MoodleScraper(credentials, { 
  headless: false  // Show browser for 2FA completion
});
```

### 4. **Session Persistence**
```typescript
// Save session after successful 2FA
async save2FASession(): Promise<void> {
  const cookies = await this.page.cookies();
  await fs.writeFile('.moodle-session.json', JSON.stringify(cookies));
}

async restore2FASession(): Promise<boolean> {
  try {
    const cookiesData = await fs.readFile('.moodle-session.json', 'utf8');
    const cookies = JSON.parse(cookiesData);
    await this.page.setCookie(...cookies);
    return true;
  } catch {
    return false;
  }
}
```

## 📱 Usage Examples

### Example 1: Manual 2FA
```javascript
const { MoodleScraper } = require('moodle-scraper');

const credentials = {
  email: 'your-email@university.edu',
  password: 'your-password',
  classUrl: 'https://moodle.university.edu/course/view.php?id=123'
};

const scraper = new MoodleScraper(credentials, {
  headless: false, // Show browser for 2FA
  twoFactorMethod: '2fa-manual',
  twoFactorTimeout: 300000 // 5 minutes
});

try {
  await scraper.initialize();
  console.log('🚀 Starting login...');
  
  await scraper.login(); // Will pause for 2FA if needed
  console.log('✅ Login successful!');
  
  const data = await scraper.scrapeAll();
  console.log('📊 Data scraped:', data);
  
} catch (error) {
  if (error.message.includes('2FA timeout')) {
    console.log('⏰ Please complete 2FA faster next time');
  } else {
    console.error('❌ Error:', error.message);
  }
} finally {
  await scraper.close();
}
```

### Example 2: Check for 2FA First
```javascript
async function smartScrape() {
  const scraper = new MoodleScraper(credentials);
  
  await scraper.initialize();
  
  // Check if 2FA is required before proceeding
  await scraper.navigateToLogin();
  const requires2FA = await scraper.detect2FA();
  
  if (requires2FA) {
    console.log('🔐 This site requires 2FA');
    console.log('🔧 Switching to interactive mode...');
    
    // Update scraper configuration
    scraper.options.headless = false;
    scraper.options.twoFactorMethod = '2fa-manual';
  }
  
  const data = await scraper.scrapeAll();
  return data;
}
```

## ⚠️ Important Notes

1. **Security**: Never hardcode 2FA codes or try to automate them
2. **Session Management**: 2FA sessions typically last longer - save cookies
3. **User Experience**: Always show browser window during 2FA
4. **Timeouts**: Give users reasonable time (5+ minutes) to complete 2FA
5. **Fallback**: Always provide clear error messages and retry options

## 🆘 Troubleshooting

**Problem**: 2FA not detected
- Check for additional selectors specific to your Moodle instance
- Look at page source during 2FA prompt

**Problem**: Code submission fails  
- Verify the correct input field selector
- Check if there are multiple 2FA methods available

**Problem**: Session expires quickly
- Save and restore cookies after successful 2FA
- Check institution's session timeout policies

---

*Remember: 2FA is a security feature - work with it, don't try to bypass it!* 