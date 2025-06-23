# 📱 Duo Mobile 2FA Integration Guide

## Overview

Duo Mobile is one of the most common 2FA systems used by universities and institutions. This guide covers specific strategies for handling Duo Mobile authentication with the Moodle scraper.

## 🔍 How Duo Mobile Works

Duo Mobile typically presents users with several authentication options:

1. **📱 Push Notification** (Most Common)
   - Sends notification to Duo Mobile app
   - User approves/denies on their phone
   - Usually takes 5-30 seconds

2. **🔢 Passcode Entry**
   - User enters 6-digit code from app
   - Code changes every 30 seconds

3. **📞 Phone Call**
   - Duo calls user's registered phone
   - User presses # to approve

4. **🔑 Hardware Token**
   - Physical device generates codes

## 🚨 Detecting Duo Mobile

```typescript
async detectDuoMobile(): Promise<boolean> {
  // Check for Duo iframe or container
  const duoSelectors = [
    '.duo-frame',
    '#duo_iframe', 
    'iframe[src*="duosecurity.com"]',
    'iframe[title*="duo" i]',
    '.duo-auth',
    '.duo-login'
  ];

  for (const selector of duoSelectors) {
    const element = await this.page.$(selector);
    if (element) return true;
  }

  // Check page content for Duo indicators
  const content = await this.page.content();
  const duoIndicators = [
    'duo mobile',
    'duo security', 
    'duosecurity.com',
    'duo authentication',
    'duo push',
    'push notification',
    'checking for request',
    'waiting for response'
  ];

  return duoIndicators.some(indicator => 
    content.toLowerCase().includes(indicator)
  );
}
```

## 🛠️ Handling Different Duo Methods

### 1. Push Notification (Recommended)

Most users prefer push notifications. The scraper should wait patiently:

```typescript
async handleDuoPush(): Promise<void> {
  console.log('\n📱 Duo Mobile Push Notification Required');
  console.log('🔔 Check your phone for the Duo Mobile notification');
  console.log('👆 Tap "Approve" to continue authentication');
  console.log('⏳ Waiting for your approval...\n');

  await this.waitForDuoCompletion();
}

private async waitForDuoCompletion(): Promise<void> {
  const maxWaitTime = 180000; // 3 minutes (Duo push timeout)
  const checkInterval = 2000;
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    // Check if Duo authentication completed
    const duoComplete = await this.isDuoComplete();
    const onMoodlePage = await this.isBackOnMoodle();
    
    if (duoComplete || onMoodlePage) {
      console.log('✅ Duo Mobile authentication successful!');
      return;
    }

    // Check for expired/failed states
    const duoFailed = await this.isDuoFailed();
    if (duoFailed) {
      throw new Error('Duo authentication failed or expired - please try again');
    }

    await this.page.waitForTimeout(checkInterval);
    elapsed += checkInterval;

    // Progress updates
    if (elapsed % 15000 === 0) { // Every 15 seconds
      const remaining = Math.floor((maxWaitTime - elapsed) / 1000);
      console.log(`📱 Still waiting for Duo approval... (${remaining}s remaining)`);
      
      if (elapsed >= 60000) { // After 1 minute
        console.log('💡 Tip: Make sure your phone has internet connection');
      }
    }
  }

  throw new Error('Duo Mobile timeout - push notification may have expired');
}
```

### 2. Passcode Entry

For users who prefer entering codes manually:

```typescript
async handleDuoPasscode(): Promise<void> {
  console.log('🔢 Duo Mobile passcode required');
  
  // Check if passcode option is available
  const passcodeButton = await this.page.$('button:contains("Enter a Passcode"), .passcode-option, [data-factor="passcode"]');
  
  if (passcodeButton) {
    await passcodeButton.click();
    await this.page.waitForTimeout(1000);
  }

  // Prompt for passcode
  const passcode = await this.promptDuoPasscode();
  await this.submitDuoPasscode(passcode);
}

private async promptDuoPasscode(): Promise<string> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🔢 Enter your 6-digit Duo passcode: ', (code) => {
      rl.close();
      resolve(code.trim());
    });
  });
}

private async submitDuoPasscode(passcode: string): Promise<void> {
  const passcodeSelectors = [
    'input[name="passcode"]',
    'input[placeholder*="passcode" i]',
    'input[placeholder*="token" i]',
    '.passcode-input'
  ];

  let passcodeField = null;
  for (const selector of passcodeSelectors) {
    passcodeField = await this.page.$(selector);
    if (passcodeField) break;
  }

  if (!passcodeField) {
    throw new Error('Could not find Duo passcode input field');
  }

  await passcodeField.type(passcode);
  
  // Submit the passcode
  const submitButton = await this.page.$('button[type="submit"], .passcode-submit, button:contains("Log In")');
  if (submitButton) {
    await submitButton.click();
  } else {
    await passcodeField.press('Enter');
  }

  await this.page.waitForTimeout(3000);
}
```

### 3. Automatic Method Detection

Smart detection of available Duo methods:

```typescript
async detectDuoMethods(): Promise<string[]> {
  const methods = [];
  
  // Wait for Duo iframe to load
  await this.page.waitForTimeout(2000);
  
  // Check for push notification (usually default)
  const pushAvailable = await this.page.$('.push-option, [data-factor="push"], button:contains("Send Me a Push")');
  if (pushAvailable) methods.push('push');
  
  // Check for passcode option  
  const passcodeAvailable = await this.page.$('.passcode-option, [data-factor="passcode"], button:contains("Enter a Passcode")');
  if (passcodeAvailable) methods.push('passcode');
  
  // Check for phone call option
  const phoneAvailable = await this.page.$('.phone-option, [data-factor="phone"], button:contains("Call Me")');
  if (phoneAvailable) methods.push('phone');

  return methods;
}
```

## 🔧 Integration with MoodleScraper

Update the main scraper to handle Duo Mobile specifically:

```typescript
async login(): Promise<boolean> {
  if (!this.page) throw new Error('Browser not initialized');

  try {
    // Perform initial login
    await this.performInitialLogin();
    
    // Check for Duo Mobile
    const isDuo = await this.detectDuoMobile();
    
    if (isDuo) {
      console.log('📱 Duo Mobile 2FA detected');
      
      // Detect available methods
      const methods = await this.detectDuoMethods();
      console.log(`Available methods: ${methods.join(', ')}`);
      
      // Default to push notification if available
      if (methods.includes('push')) {
        await this.handleDuoPush();
      } else if (methods.includes('passcode')) {
        await this.handleDuoPasscode();
      } else {
        // Manual completion fallback
        console.log('🔐 Please complete Duo authentication manually');
        await this.waitForManualCompletion();
      }
    }
    
    return true;
  } catch (error) {
    throw new Error(`Duo Mobile authentication failed: ${error.message}`);
  }
}
```

## 📱 Practical Usage Examples

### Example 1: Automatic Duo Push

```javascript
const { MoodleScraper } = require('moodle-scraper');

const scraper = new MoodleScraper({
  email: 'your-email@university.edu',
  password: 'your-password',
  classUrl: 'https://moodle.university.edu/course/view.php?id=123'
}, {
  headless: false, // Show browser to see Duo prompt
  timeout: 180000  // 3 minutes for Duo approval
});

try {
  await scraper.initialize();
  console.log('🚀 Starting login with Duo Mobile...');
  
  await scraper.login(); // Will automatically handle Duo push
  console.log('✅ Duo authentication successful!');
  
  const data = await scraper.scrapeAll();
  console.log('📊 Data scraped successfully');
  
} catch (error) {
  if (error.message.includes('Duo')) {
    console.log('📱 Duo Mobile issue - check your phone and try again');
  }
} finally {
  await scraper.close();
}
```

### Example 2: Manual Method Selection

```javascript
async function duoWithMethodChoice() {
  const scraper = new MoodleScraper(credentials, { headless: false });
  
  await scraper.initialize();
  await scraper.navigateToLogin();
  
  // Detect Duo and available methods
  const isDuo = await scraper.detectDuoMobile();
  
  if (isDuo) {
    const methods = await scraper.detectDuoMethods();
    console.log('📱 Duo Mobile detected');
    console.log(`Available methods: ${methods.join(', ')}`);
    
    // Let user choose method
    const choice = await promptUserChoice(methods);
    
    switch (choice) {
      case 'push':
        await scraper.handleDuoPush();
        break;
      case 'passcode':
        await scraper.handleDuoPasscode();
        break;
      default:
        console.log('Please complete authentication manually');
        await scraper.waitForManualCompletion();
    }
  }
  
  const data = await scraper.scrapeAll();
  return data;
}
```

## 🆘 Troubleshooting Duo Mobile

### Common Issues

**1. Push notification not received**
```typescript
// Add retry logic
if (!pushReceived) {
  console.log('📱 No push notification? Trying again...');
  const retryButton = await this.page.$('button:contains("Send Another Push"), .retry-push');
  if (retryButton) await retryButton.click();
}
```

**2. Duo iframe not loading**
```typescript
// Wait for iframe to load properly
await this.page.waitForSelector('iframe[src*="duosecurity.com"]', { timeout: 30000 });
```

**3. Session timeouts**
```typescript
// Save session after successful Duo auth
await this.saveDuoSession();
```

### Debug Mode

```javascript
const scraper = new MoodleScraper(credentials, {
  headless: false,
  duoDebug: true, // Enable Duo-specific logging
  timeout: 300000 // 5 minute timeout for debugging
});
```

## 💡 Best Practices

1. **Always use push notifications** when available (fastest method)
2. **Save sessions** after successful Duo auth to avoid repeated prompts
3. **Handle timeouts gracefully** - Duo pushes expire after ~2 minutes
4. **Provide clear user feedback** about what's happening
5. **Test different methods** - some users may not have push enabled

## 🔒 Security Notes

- Duo Mobile adds an extra layer of security - respect it
- Never try to bypass or automate the actual authentication
- Session persistence reduces repeated Duo prompts
- Always use secure session storage

---

*Duo Mobile is designed to be user-friendly while maintaining security. Work with it, not against it!* 