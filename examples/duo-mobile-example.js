/**
 * Duo Mobile 2FA Integration Example
 * 
 * This example demonstrates handling Duo Mobile authentication
 * which is commonly used by universities and institutions.
 */

const { MoodleScraper } = require('../dist/index');
const readline = require('readline');

const credentials = {
  email: 'your-email@university.edu',
  password: 'your-password',
  classUrl: 'https://moodle.university.edu/course/view.php?id=123'
};

/**
 * Example 1: Automatic Duo Mobile Push Notification
 * Most common and user-friendly approach
 */
async function duoPushExample() {
  console.log('📱 Example: Duo Mobile Push Notification\n');
  
  const scraper = new MoodleScraper(credentials, {
    headless: false, // Show browser to see Duo interface
    timeout: 180000  // 3 minutes for Duo approval
  });

  try {
    await scraper.initialize();
    console.log('🚀 Starting login process...');
    
    // Navigate to login
    await scraper.page.goto(credentials.classUrl);
    
    // Perform initial username/password login
    await performInitialLogin(scraper);
    
    // Check for Duo Mobile
    const isDuo = await detectDuoMobile(scraper.page);
    
    if (isDuo) {
      console.log('\n📱 Duo Mobile 2FA Detected!');
      console.log('🔔 A push notification has been sent to your phone');
      console.log('👆 Please tap "Approve" in the Duo Mobile app');
      console.log('⏳ Waiting for your approval...\n');
      
      await waitForDuoApproval(scraper.page);
      console.log('✅ Duo Mobile authentication successful!\n');
    }
    
    // Continue with scraping
    console.log('📊 Scraping course data...');
    const data = await scraper.scrapeAll();
    
    console.log(`✅ Successfully scraped:`);
    console.log(`   📚 ${data.assignments.length} assignments`);
    console.log(`   📊 ${data.grades.length} grades`);
    console.log(`   📁 ${data.files.length} files`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Duo')) {
      console.log('\n💡 Duo Mobile troubleshooting:');
      console.log('   📱 Check your phone for the notification');
      console.log('   📶 Ensure your phone has internet connection');
      console.log('   🔄 The notification may have expired - try again');
    }
  } finally {
    await scraper.close();
  }
}

/**
 * Example 2: Duo Mobile with Method Selection
 * Handles different Duo authentication methods
 */
async function duoMethodSelectionExample() {
  console.log('📱 Example: Duo Mobile Method Selection\n');
  
  const scraper = new MoodleScraper(credentials, {
    headless: false,
    timeout: 180000
  });

  try {
    await scraper.initialize();
    await scraper.page.goto(credentials.classUrl);
    await performInitialLogin(scraper);
    
    const isDuo = await detectDuoMobile(scraper.page);
    
    if (isDuo) {
      console.log('📱 Duo Mobile detected - checking available methods...');
      
      // Wait for Duo interface to load
      await scraper.page.waitForTimeout(3000);
      
      const methods = await detectDuoMethods(scraper.page);
      console.log(`Available methods: ${methods.join(', ')}\n`);
      
      if (methods.includes('push')) {
        console.log('🔔 Using push notification (recommended)');
        await handleDuoPush(scraper.page);
      } else if (methods.includes('passcode')) {
        console.log('🔢 Using passcode entry');
        await handleDuoPasscode(scraper.page);
      } else {
        console.log('🔐 Please complete Duo authentication manually');
        await waitForManualDuo(scraper.page);
      }
    }
    
    const data = await scraper.scrapeAll();
    console.log('✅ Scraping completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Example 3: Duo Mobile with Session Persistence
 * Save session to avoid repeated Duo authentication
 */
async function duoSessionPersistenceExample() {
  console.log('📱 Example: Duo Mobile with Session Persistence\n');
  
  const scraper = new MoodleScraper(credentials, {
    headless: false,
    timeout: 180000
  });

  try {
    await scraper.initialize();
    
    // Try to restore previous session
    const sessionRestored = await restoreSession(scraper.page);
    
    if (sessionRestored) {
      console.log('✅ Previous Duo session restored - skipping authentication');
      
      // Verify session is still valid
      await scraper.page.goto(credentials.classUrl);
      const needsAuth = await checkIfNeedsAuth(scraper.page);
      
      if (needsAuth) {
        console.log('⚠️ Session expired - performing fresh authentication');
        await performDuoAuthentication(scraper);
        await saveSession(scraper.page);
      }
    } else {
      console.log('🔑 No valid session found - performing Duo authentication');
      await performDuoAuthentication(scraper);
      
      // Save session after successful authentication
      await saveSession(scraper.page);
      console.log('💾 Session saved for future use (will skip Duo next time)');
    }
    
    const data = await scraper.scrapeAll();
    console.log('✅ Data scraped successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

// Helper Functions

/**
 * Detect if Duo Mobile is present
 */
async function detectDuoMobile(page) {
  const duoSelectors = [
    'iframe[src*="duosecurity.com"]',
    'iframe[title*="duo" i]',
    '.duo-frame',
    '#duo_iframe',
    '.duo-auth'
  ];

  // Check for Duo elements
  for (const selector of duoSelectors) {
    const element = await page.$(selector);
    if (element) return true;
  }

  // Check page content
  const content = await page.content();
  const duoIndicators = [
    'duo mobile',
    'duo security',
    'duosecurity.com',
    'duo authentication',
    'push notification'
  ];

  return duoIndicators.some(indicator => 
    content.toLowerCase().includes(indicator)
  );
}

/**
 * Detect available Duo authentication methods
 */
async function detectDuoMethods(page) {
  const methods = [];
  
  // Switch to Duo iframe if it exists
  const duoFrame = await page.$('iframe[src*="duosecurity.com"]');
  if (duoFrame) {
    const frame = await duoFrame.contentFrame();
    if (frame) {
      // Check methods within iframe
      const pushBtn = await frame.$('button:contains("Send Me a Push"), .auth-button[data-factor="push"]');
      if (pushBtn) methods.push('push');
      
      const passcodeBtn = await frame.$('button:contains("Enter a Passcode"), .auth-button[data-factor="passcode"]');
      if (passcodeBtn) methods.push('passcode');
      
      const phoneBtn = await frame.$('button:contains("Call Me"), .auth-button[data-factor="phone"]');
      if (phoneBtn) methods.push('phone');
    }
  }
  
  // Fallback: check main page
  if (methods.length === 0) {
    const content = await page.content();
    if (content.includes('push') || content.includes('notification')) methods.push('push');
    if (content.includes('passcode') || content.includes('token')) methods.push('passcode');
    if (content.includes('call') || content.includes('phone')) methods.push('phone');
  }
  
  return methods.length > 0 ? methods : ['push']; // Default to push
}

/**
 * Handle Duo push notification
 */
async function handleDuoPush(page) {
  console.log('🔔 Sending Duo push notification...');
  
  // Click push button if available
  const pushButton = await page.$('button:contains("Send Me a Push"), .push-button');
  if (pushButton) {
    await pushButton.click();
    console.log('📱 Push notification sent to your device');
  }
  
  await waitForDuoApproval(page);
}

/**
 * Handle Duo passcode entry
 */
async function handleDuoPasscode(page) {
  // Click passcode option
  const passcodeButton = await page.$('button:contains("Enter a Passcode"), .passcode-button');
  if (passcodeButton) {
    await passcodeButton.click();
    await page.waitForTimeout(1000);
  }
  
  // Prompt for passcode
  const passcode = await promptForPasscode();
  
  // Enter passcode
  const passcodeField = await page.$('input[name="passcode"], input[placeholder*="passcode" i]');
  if (passcodeField) {
    await passcodeField.type(passcode);
    
    const submitButton = await page.$('button[type="submit"], button:contains("Log In")');
    if (submitButton) {
      await submitButton.click();
    } else {
      await passcodeField.press('Enter');
    }
  }
  
  await page.waitForTimeout(3000);
}

/**
 * Wait for Duo approval (push notification)
 */
async function waitForDuoApproval(page) {
  const maxWaitTime = 180000; // 3 minutes
  const checkInterval = 3000;  // 3 seconds
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    // Check if authentication completed
    const duoComplete = await isDuoComplete(page);
    const backOnMoodle = await isBackOnMoodle(page);
    
    if (duoComplete || backOnMoodle) {
      return;
    }
    
    // Check for failure states
    const duoFailed = await isDuoFailed(page);
    if (duoFailed) {
      throw new Error('Duo authentication failed or was denied');
    }

    await page.waitForTimeout(checkInterval);
    elapsed += checkInterval;
    
    // Progress updates
    if (elapsed % 15000 === 0) { // Every 15 seconds
      const remaining = Math.floor((maxWaitTime - elapsed) / 1000);
      console.log(`📱 Still waiting for approval... (${remaining}s remaining)`);
      
      if (elapsed >= 60000) { // After 1 minute
        console.log('💡 Tip: Check your phone - notification may need to be tapped');
      }
    }
  }

  throw new Error('Duo Mobile timeout - push notification expired');
}

/**
 * Check if Duo authentication is complete
 */
async function isDuoComplete(page) {
  const content = await page.content();
  return content.includes('success') || 
         content.includes('approved') ||
         !content.includes('duo');
}

/**
 * Check if we're back on Moodle (authentication successful)
 */
async function isBackOnMoodle(page) {
  const moodleIndicators = [
    '.course-content',
    '.dashboard',
    '.block_myoverview',
    '#page-wrapper'
  ];

  for (const selector of moodleIndicators) {
    const element = await page.$(selector);
    if (element) return true;
  }
  
  return false;
}

/**
 * Check if Duo authentication failed
 */
async function isDuoFailed(page) {
  const content = await page.content();
  return content.includes('denied') ||
         content.includes('failed') ||
         content.includes('expired') ||
         content.includes('error');
}

/**
 * Perform initial username/password login
 */
async function performInitialLogin(scraper) {
  console.log('🔑 Performing initial login...');
  
  // Find and fill username
  const usernameField = await scraper.page.$('input[name="username"], input[name="email"], input[type="email"]');
  if (usernameField) {
    await usernameField.type(credentials.email);
  }
  
  // Find and fill password
  const passwordField = await scraper.page.$('input[name="password"], input[type="password"]');
  if (passwordField) {
    await passwordField.type(credentials.password);
  }
  
  // Submit form
  const submitButton = await scraper.page.$('button[type="submit"], input[type="submit"], button:contains("Log in")');
  if (submitButton) {
    await Promise.all([
      scraper.page.waitForNavigation({ waitUntil: 'networkidle0' }),
      submitButton.click()
    ]);
  }
}

/**
 * Complete Duo authentication process
 */
async function performDuoAuthentication(scraper) {
  await scraper.page.goto(credentials.classUrl);
  await performInitialLogin(scraper);
  
  const isDuo = await detectDuoMobile(scraper.page);
  if (isDuo) {
    console.log('📱 Duo Mobile detected - sending push notification');
    await handleDuoPush(scraper.page);
  }
}

/**
 * Prompt for Duo passcode
 */
async function promptForPasscode() {
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

/**
 * Wait for manual Duo completion
 */
async function waitForManualDuo(page) {
  console.log('🔐 Please complete Duo authentication manually in the browser');
  
  const maxWaitTime = 300000; // 5 minutes
  const checkInterval = 3000;
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    const complete = await isBackOnMoodle(page);
    if (complete) {
      console.log('✅ Manual Duo authentication completed');
      return;
    }

    await page.waitForTimeout(checkInterval);
    elapsed += checkInterval;
    
    if (elapsed % 20000 === 0) {
      const remaining = Math.floor((maxWaitTime - elapsed) / 1000);
      console.log(`⏳ Still waiting for manual completion... (${remaining}s remaining)`);
    }
  }

  throw new Error('Manual Duo authentication timeout');
}

/**
 * Save session cookies
 */
async function saveSession(page) {
  const fs = require('fs').promises;
  const cookies = await page.cookies();
  await fs.writeFile('.duo-session.json', JSON.stringify(cookies, null, 2));
}

/**
 * Restore session cookies
 */
async function restoreSession(page) {
  try {
    const fs = require('fs').promises;
    const cookiesData = await fs.readFile('.duo-session.json', 'utf8');
    const cookies = JSON.parse(cookiesData);
    
    if (cookies && cookies.length > 0) {
      await page.setCookie(...cookies);
      return true;
    }
  } catch (error) {
    return false;
  }
  
  return false;
}

/**
 * Check if authentication is needed
 */
async function checkIfNeedsAuth(page) {
  const authIndicators = [
    'input[name="username"]',
    'input[name="password"]',
    '.login-form',
    'duosecurity.com'
  ];

  for (const selector of authIndicators) {
    const element = await page.$(selector);
    if (element) return true;
  }
  
  const content = await page.content();
  return content.includes('login') || content.includes('authentication');
}

// Run examples
async function runDuoExamples() {
  console.log('📱 Duo Mobile Integration Examples\n');
  console.log('Choose an example:');
  console.log('1. Automatic push notification');
  console.log('2. Method selection (push/passcode/phone)');
  console.log('3. Session persistence (save login state)');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nEnter choice (1-3): ', async (choice) => {
    rl.close();
    
    try {
      switch (choice) {
        case '1':
          await duoPushExample();
          break;
        case '2':
          await duoMethodSelectionExample();
          break;
        case '3':
          await duoSessionPersistenceExample();
          break;
        default:
          console.log('Invalid choice. Running push notification example...');
          await duoPushExample();
      }
    } catch (error) {
      console.error('❌ Example failed:', error.message);
      process.exit(1);
    }
  });
}

// Run if called directly
if (require.main === module) {
  runDuoExamples();
}

module.exports = {
  duoPushExample,
  duoMethodSelectionExample,
  duoSessionPersistenceExample,
  detectDuoMobile,
  handleDuoPush,
  handleDuoPasscode
}; 