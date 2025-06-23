/**
 * Example: Handling Two-Factor Authentication (2FA) with Moodle Scraper
 * 
 * This example shows different approaches to handle 2FA in your scraping workflow.
 */

const { MoodleScraper } = require('../dist/index');
const readline = require('readline');

// Your Moodle credentials
const credentials = {
  email: 'your-email@university.edu',
  password: 'your-password',
  classUrl: 'https://moodle.university.edu/course/view.php?id=123'
};

/**
 * Example 1: Automatic 2FA Detection with Manual Completion
 * This is the most user-friendly approach
 */
async function manualTwoFactorExample() {
  console.log('🔐 Example 1: Manual 2FA Handling\n');
  
  const scraper = new MoodleScraper(credentials, {
    headless: false, // Show browser so user can see 2FA prompt
    timeout: 60000   // Extended timeout for manual intervention
  });

  try {
    await scraper.initialize();
    console.log('🚀 Starting login process...');
    
    // Navigate to login page first to check for 2FA
    await scraper.page.goto(credentials.classUrl);
    
    // Check if we're redirected to a login page
    const currentUrl = scraper.page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('🔍 Checking for 2FA requirements...');
      
      // Look for 2FA indicators
      const has2FA = await detect2FA(scraper.page);
      
      if (has2FA) {
        console.log('\n🔐 Two-Factor Authentication Detected!');
        console.log('📱 Please complete 2FA in the browser window');
        console.log('⏳ The scraper will wait for you...\n');
        
        // Wait for user to complete 2FA
        await waitForManual2FA(scraper.page);
        console.log('✅ 2FA completed! Continuing...\n');
      }
    }
    
    // Continue with normal login if not already authenticated
    const isLoggedIn = await checkIfLoggedIn(scraper.page);
    if (!isLoggedIn) {
      await scraper.login();
    }
    
    // Scrape data
    console.log('📊 Scraping course data...');
    const data = await scraper.scrapeAll();
    
    console.log(`✅ Successfully scraped:`);
    console.log(`   📚 ${data.assignments.length} assignments`);
    console.log(`   📊 ${data.grades.length} grades`);
    console.log(`   📁 ${data.files.length} files`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('2FA timeout')) {
      console.log('\n💡 Tip: Complete 2FA faster next time');
      console.log('🔄 You can restart the scraper to try again');
    }
  } finally {
    await scraper.close();
  }
}

/**
 * Example 2: Interactive Command-Line 2FA
 * For environments where showing browser isn't practical
 */
async function interactiveTwoFactorExample() {
  console.log('🔐 Example 2: Interactive 2FA Handling\n');
  
  const scraper = new MoodleScraper(credentials, {
    headless: true // Run headless, get code via command line
  });

  try {
    await scraper.initialize();
    
    // Custom login with 2FA handling
    await scraper.page.goto(credentials.classUrl);
    
    // Check for 2FA
    const has2FA = await detect2FA(scraper.page);
    
    if (has2FA) {
      console.log('🔐 2FA required - please provide verification code');
      const code = await promptFor2FACode();
      await submit2FACode(scraper.page, code);
      console.log('✅ 2FA submitted!\n');
    }
    
    // Continue with scraping
    const data = await scraper.scrapeAll();
    console.log('✅ Scraping completed:', data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Example 3: Session Persistence
 * Save session after 2FA to avoid repeated authentication
 */
async function sessionPersistenceExample() {
  console.log('🔐 Example 3: Session Persistence\n');
  
  const scraper = new MoodleScraper(credentials, {
    headless: false
  });

  try {
    await scraper.initialize();
    
    // Try to restore previous session
    const sessionRestored = await restoreSession(scraper.page);
    
    if (sessionRestored) {
      console.log('✅ Previous session restored - skipping login');
    } else {
      console.log('🔑 No valid session found - performing login');
      
      // Navigate and handle potential 2FA
      await scraper.page.goto(credentials.classUrl);
      const has2FA = await detect2FA(scraper.page);
      
      if (has2FA) {
        console.log('🔐 2FA required - completing manually...');
        await waitForManual2FA(scraper.page);
        
        // Save session after successful 2FA
        await saveSession(scraper.page);
        console.log('💾 Session saved for future use');
      }
    }
    
    // Scrape data
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
 * Detect if 2FA is required on current page
 */
async function detect2FA(page) {
  const twoFactorSelectors = [
    'input[name="pin"]',
    'input[name="code"]',
    'input[name="token"]',
    'input[name="verification_code"]',
    'input[placeholder*="code" i]',
    'input[placeholder*="verification" i]',
    '.two-factor',
    '.2fa',
    '.mfa'
  ];

  // Check for input fields
  for (const selector of twoFactorSelectors) {
    const element = await page.$(selector);
    if (element) {
      return true;
    }
  }

  // Check page content
  const content = await page.content();
  const indicators = [
    'two-factor',
    'verification code',
    'authentication code',
    'authenticator app',
    'enter code'
  ];

  return indicators.some(indicator => 
    content.toLowerCase().includes(indicator)
  );
}

/**
 * Wait for manual 2FA completion
 */
async function waitForManual2FA(page) {
  const maxWaitTime = 300000; // 5 minutes
  const checkInterval = 2000;  // 2 seconds
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    // Check if still on 2FA page
    const still2FA = await detect2FA(page);
    const onDashboard = await checkIfLoggedIn(page);
    
    if (!still2FA || onDashboard) {
      return; // 2FA completed
    }

    await page.waitForTimeout(checkInterval);
    elapsed += checkInterval;
    
    // Show progress every 10 seconds
    if (elapsed % 10000 === 0) {
      const remaining = Math.floor((maxWaitTime - elapsed) / 1000);
      console.log(`⏳ Still waiting... (${remaining}s remaining)`);
    }
  }

  throw new Error('2FA timeout - please complete authentication faster');
}

/**
 * Check if user is logged in (on dashboard/course page)
 */
async function checkIfLoggedIn(page) {
  const loggedInSelectors = [
    '.dashboard',
    '.course-content',
    '.block_myoverview',
    '[data-region="view-overview"]',
    '.course-section'
  ];

  for (const selector of loggedInSelectors) {
    const element = await page.$(selector);
    if (element) return true;
  }

  return false;
}

/**
 * Prompt user for 2FA code via command line
 */
async function promptFor2FACode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🔐 Enter your 2FA verification code: ', (code) => {
      rl.close();
      resolve(code.trim());
    });
  });
}

/**
 * Submit 2FA code to the page
 */
async function submit2FACode(page, code) {
  // Find code input field
  const codeSelectors = [
    'input[name="pin"]',
    'input[name="code"]',
    'input[name="token"]',
    'input[name="verification_code"]'
  ];

  let codeField = null;
  for (const selector of codeSelectors) {
    codeField = await page.$(selector);
    if (codeField) break;
  }

  if (!codeField) {
    throw new Error('Could not find 2FA code input field');
  }

  // Enter code
  await codeField.click();
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
    submitButton = await page.$(selector);
    if (submitButton) break;
  }

  if (submitButton) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      submitButton.click()
    ]);
  } else {
    // Try pressing Enter as fallback
    await codeField.press('Enter');
    await page.waitForTimeout(3000);
  }
}

/**
 * Save session cookies for future use
 */
async function saveSession(page) {
  const fs = require('fs').promises;
  const cookies = await page.cookies();
  await fs.writeFile('.moodle-session.json', JSON.stringify(cookies, null, 2));
}

/**
 * Restore previous session
 */
async function restoreSession(page) {
  try {
    const fs = require('fs').promises;
    const cookiesData = await fs.readFile('.moodle-session.json', 'utf8');
    const cookies = JSON.parse(cookiesData);
    
    if (cookies && cookies.length > 0) {
      await page.setCookie(...cookies);
      return true;
    }
  } catch (error) {
    // Session file doesn't exist or is invalid
    return false;
  }
  
  return false;
}

// Run examples
async function runExamples() {
  console.log('🔐 Moodle 2FA Handling Examples\n');
  console.log('Choose an example to run:');
  console.log('1. Manual 2FA (show browser, wait for completion)');
  console.log('2. Interactive 2FA (command-line code entry)');
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
          await manualTwoFactorExample();
          break;
        case '2':
          await interactiveTwoFactorExample();
          break;
        case '3':
          await sessionPersistenceExample();
          break;
        default:
          console.log('Invalid choice. Running manual 2FA example...');
          await manualTwoFactorExample();
      }
    } catch (error) {
      console.error('❌ Example failed:', error.message);
      process.exit(1);
    }
  });
}

// Run if called directly
if (require.main === module) {
  runExamples();
}

module.exports = {
  manualTwoFactorExample,
  interactiveTwoFactorExample,  
  sessionPersistenceExample,
  detect2FA,
  waitForManual2FA
}; 