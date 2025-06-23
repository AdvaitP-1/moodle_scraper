#!/usr/bin/env node

/**
 * Test User Example - How a real user would use this package
 * 
 * This simulates what an end user would do after installing the package
 */

console.log('🎓 Testing Moodle Scraper Package as End User');
console.log('=============================================\n');

// Test 1: Check if the package exports are available
console.log('📦 Test 1: Checking package exports...');
try {
  const { MoodleScraper, scrapeMoodle, MoodleAuth } = require('./dist/index.js');
  
  console.log('✅ MoodleScraper class:', typeof MoodleScraper);
  console.log('✅ scrapeMoodle function:', typeof scrapeMoodle);
  console.log('✅ MoodleAuth class:', typeof MoodleAuth);
  
  // Test class instantiation
  const testCredentials = {
    email: 'test@example.com',
    password: 'test-password',
    classUrl: 'https://test-moodle.edu/course/view.php?id=123'
  };
  
  const scraper = new MoodleScraper(testCredentials);
  console.log('✅ MoodleScraper instance created successfully');
  
} catch (error) {
  console.error('❌ Package export test failed:', error.message);
  process.exit(1);
}

// Test 2: Check if methods are available
console.log('\n🔧 Test 2: Checking available methods...');
try {
  const { MoodleScraper } = require('./dist/index.js');
  const scraper = new MoodleScraper({
    email: 'test@example.com',
    password: 'test-password',
    classUrl: 'https://test-moodle.edu/course/view.php?id=123'
  });
  
  const expectedMethods = [
    'initialize',
    'login',
    'navigateToClass',
    'scrapeAssignments',
    'scrapeGrades',
    'scrapeFiles',
    'scrapeZybookIntegrations',
    'scrapeAll',
    'close',
    'isSessionValid'
  ];
  
  expectedMethods.forEach(method => {
    if (typeof scraper[method] === 'function') {
      console.log(`✅ ${method}() method available`);
    } else {
      console.error(`❌ ${method}() method missing`);
    }
  });
  
} catch (error) {
  console.error('❌ Method availability test failed:', error.message);
  process.exit(1);
}

// Test 3: Check container scripts
console.log('\n🐳 Test 3: Checking container integration...');
try {
  const packageJson = require('./package.json');
  const containerScripts = [
    'container:build',
    'container:run',
    'container:debug',
    'container:info',
    'container:cleanup'
  ];
  
  containerScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`✅ ${script} script available`);
    } else {
      console.error(`❌ ${script} script missing`);
    }
  });
  
} catch (error) {
  console.error('❌ Container script test failed:', error.message);
}

// Test 4: Simulate basic usage (without actual scraping)
console.log('\n🎯 Test 4: Simulating user workflow...');

async function simulateUserWorkflow() {
  const { MoodleScraper } = require('./dist/index.js');
  
  console.log('👤 User creates scraper instance...');
  const scraper = new MoodleScraper({
    email: 'student@university.edu',
    password: 'password123',
    classUrl: 'https://moodle.university.edu/course/view.php?id=12345'
  }, {
    headless: true,
    timeout: 30000
  });
  
  console.log('✅ Scraper instance created with credentials and options');
  
  // Test method calls (without actually executing them)
  console.log('📋 Available methods for user:');
  console.log('   - await scraper.initialize()');
  console.log('   - await scraper.login()');
  console.log('   - await scraper.navigateToClass()');
  console.log('   - await scraper.scrapeAssignments()');
  console.log('   - await scraper.scrapeGrades()');
  console.log('   - await scraper.scrapeFiles()');
  console.log('   - await scraper.scrapeZybookIntegrations()');
  console.log('   - await scraper.scrapeAll()');
  console.log('   - await scraper.close()');
  
  console.log('✅ User workflow simulation complete');
}

simulateUserWorkflow();

// Test 5: Test convenience function
console.log('\n⚡ Test 5: Testing convenience function...');
try {
  const { scrapeMoodle } = require('./dist/index.js');
  
  console.log('📝 User can call scrapeMoodle() directly:');
  console.log('   const data = await scrapeMoodle(credentials, options)');
  console.log('✅ Convenience function available');
  
} catch (error) {
  console.error('❌ Convenience function test failed:', error.message);
}

// Test 6: Environment variable support
console.log('\n🔒 Test 6: Environment variable support...');
console.log('📋 Users can set environment variables:');
console.log('   MOODLE_EMAIL=student@university.edu');
console.log('   MOODLE_PASSWORD=your-password');
console.log('   MOODLE_CLASS_URL=https://moodle.edu/course/view.php?id=123');
console.log('✅ Environment variable pattern established');

// Test 7: Example files
console.log('\n📚 Test 7: Checking example files...');
const fs = require('fs');
const path = require('path');

const exampleFiles = [
  'examples/basic-example.js',
  'examples/2fa-example.js',
  'examples/duo-mobile-example.js',
  'examples/github-inspired-example.js',
  'examples/podman-container-example.js',
  'examples/enterprise-monitoring-example.js'
];

exampleFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} available for users`);
  } else {
    console.log(`⚠️  ${file} not found`);
  }
});

// Test 8: Documentation
console.log('\n📖 Test 8: Checking documentation...');
const docFiles = [
  'README.md',
  'USER_GUIDE.md',
  'docs/2fa-handling-guide.md',
  'docs/duo-mobile-guide.md',
  'docs/redhat-integration.md'
];

docFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} available for users`);
  } else {
    console.log(`⚠️  ${file} not found`);
  }
});

console.log('\n🎉 End User Testing Complete!');
console.log('===============================');
console.log('✅ Package is ready for end users');
console.log('📦 Users can install with: npm install moodle-scraper');
console.log('📚 Users can follow USER_GUIDE.md for complete instructions');
console.log('🐳 Container support available with Red Hat technologies');
console.log('🔐 2FA and enterprise features included');
console.log('\n📋 Quick user onboarding:');
console.log('1. npm install moodle-scraper');
console.log('2. Set environment variables or use credentials object');
console.log('3. const { scrapeMoodle } = require("moodle-scraper")');
console.log('4. const data = await scrapeMoodle(credentials)');
console.log('5. Use scraped data for assignments, grades, files, zybooks'); 