const { MoodleScraper, scrapeMoodle } = require('../dist');

/**
 * Example showcasing features inspired by GitHub Moodle scraper research
 * 
 * This example demonstrates patterns learned from:
 * - dotnize/moodle-scrape: Clean API design
 * - doebi/MoodleScraper: Robust error handling  
 * - rigwild/moodle-hoover: File management
 */

async function githubInspiredExample() {
  console.log('🔍 GitHub-Inspired Moodle Scraper Example\n');

  const credentials = {
    email: 'your-email@university.edu',
    password: 'your-password',
    classUrl: 'https://moodle.university.edu/course/view.php?id=12345'
  };

  // Example 1: Simple API (inspired by dotnize/moodle-scrape)
  console.log('📋 Example 1: Simple API Usage');
  try {
    const data = await scrapeMoodle(credentials, {
      headless: true,
      timeout: 60000
    });

    console.log(`✅ Found ${data.assignments.length} assignments`);
    console.log(`✅ Found ${data.grades.length} grades`);
    console.log(`✅ Found ${data.files.length} files`);
    console.log(`✅ Found ${data.zybookIntegrations.length} Zybook activities\n`);

  } catch (error) {
    console.error('❌ Simple API failed:', error.message);
  }

  // Example 2: Advanced API with Session Management (inspired by multiple repos)
  console.log('🔧 Example 2: Advanced Session Management');
  
  const scraper = new MoodleScraper(credentials, {
    headless: false, // Visible for debugging
    timeout: 30000
  });

  try {
    // Initialize and authenticate
    await scraper.initialize();
    console.log('🚀 Browser initialized');

    const loginSuccess = await scraper.login();
    if (!loginSuccess) {
      throw new Error('Authentication failed');
    }
    console.log('🔐 Authentication successful');

    // Navigate to class
    await scraper.navigateToClass();
    console.log('🎯 Navigated to class');

    // Get comprehensive data
    const assignments = await scraper.scrapeAssignments();
    console.log(`📝 Extracted ${assignments.length} assignments:`);
    
    assignments.forEach((assignment, index) => {
      console.log(`  ${index + 1}. ${assignment.title}`);
      console.log(`     Status: ${assignment.submissionStatus}`);
      console.log(`     Due: ${assignment.dueDate || 'No due date'}`);
      console.log(`     URL: ${assignment.url}`);
    });

    const files = await scraper.scrapeFiles();
    console.log(`\n📁 Extracted ${files.length} files:`);
    
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.type})`);
      console.log(`     Size: ${file.size}`);
      console.log(`     URL: ${file.downloadUrl}`);
    });

  } catch (error) {
    console.error('❌ Advanced API failed:', error.message);
  } finally {
    await scraper.close();
    console.log('🔒 Browser closed');
  }
}

/**
 * Example 3: Multi-Course Scraping (inspired by doebi's organized approach)
 */
async function multiCourseExample() {
  console.log('\n🎓 Example 3: Multi-Course Scraping');

  const courses = [
    {
      name: 'Computer Science 101',
      url: 'https://moodle.university.edu/course/view.php?id=101'
    },
    {
      name: 'Data Structures',
      url: 'https://moodle.university.edu/course/view.php?id=102'
    }
  ];

  for (const course of courses) {
    console.log(`\n📚 Processing: ${course.name}`);
    
    try {
      const data = await scrapeMoodle({
        email: 'your-email@university.edu',
        password: 'your-password',
        classUrl: course.url
      });

      console.log(`  ✅ ${data.assignments.length} assignments`);
      console.log(`  ✅ ${data.files.length} files`);
      
      // Organize by type (inspired by doebi's folder structure)
      const assignmentsByStatus = data.assignments.reduce((acc, assignment) => {
        acc[assignment.submissionStatus] = (acc[assignment.submissionStatus] || 0) + 1;
        return acc;
      }, {});

      console.log('  📊 Assignment Status:');
      Object.entries(assignmentsByStatus).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
      });

    } catch (error) {
      console.error(`  ❌ Failed to process ${course.name}:`, error.message);
    }
  }
}

/**
 * Example 4: Error Handling Patterns (inspired by comprehensive analysis)
 */
async function robustScrapingExample() {
  console.log('\n🛡️ Example 4: Robust Error Handling');

  const credentials = {
    email: 'your-email@university.edu',
    password: 'your-password',
    classUrl: 'https://moodle.university.edu/course/view.php?id=999' // Might not exist
  };

  const scraper = new MoodleScraper(credentials, {
    headless: true,
    timeout: 15000 // Shorter timeout for testing
  });

  try {
    await scraper.initialize();

    // Test authentication robustness
    try {
      await scraper.login();
      console.log('✅ Login successful');
    } catch (loginError) {
      console.warn('⚠️ Login failed, but continuing with demo:', loginError.message);
      return;
    }

    // Test individual scraping with error recovery
    const scrapingTasks = [
      { name: 'Assignments', method: () => scraper.scrapeAssignments() },
      { name: 'Grades', method: () => scraper.scrapeGrades() },
      { name: 'Files', method: () => scraper.scrapeFiles() },
      { name: 'Zybooks', method: () => scraper.scrapeZybookIntegrations() }
    ];

    for (const task of scrapingTasks) {
      try {
        const result = await task.method();
        console.log(`✅ ${task.name}: ${result.length} items found`);
      } catch (error) {
        console.warn(`⚠️ ${task.name} failed: ${error.message}`);
        // Continue with other tasks instead of failing completely
      }
    }

  } catch (error) {
    console.error('❌ Critical error:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Example 5: Session Validation (inspired by dotnize's approach)
 */
async function sessionValidationExample() {
  console.log('\n🔄 Example 5: Session Validation');

  const scraper = new MoodleScraper({
    email: 'your-email@university.edu',
    password: 'your-password',
    classUrl: 'https://moodle.university.edu/course/view.php?id=12345'
  });

  try {
    await scraper.initialize();
    await scraper.login();

    // Simulate some time passing
    console.log('⏱️ Simulating work...');
    
    // Check if session is still valid before proceeding
    const sessionValid = await scraper.isSessionValid();
    
    if (sessionValid) {
      console.log('✅ Session still valid, proceeding with scraping');
      const assignments = await scraper.scrapeAssignments();
      console.log(`📝 Found ${assignments.length} assignments`);
    } else {
      console.log('🔒 Session expired, re-authenticating...');
      await scraper.login();
      const assignments = await scraper.scrapeAssignments();
      console.log(`📝 Found ${assignments.length} assignments after re-auth`);
    }

  } catch (error) {
    console.error('❌ Session validation failed:', error.message);
  } finally {
    await scraper.close();
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Running GitHub-Inspired Moodle Scraper Examples\n');
  console.log('Based on analysis of:');
  console.log('  - dotnize/moodle-scrape (TypeScript, clean API)');
  console.log('  - doebi/MoodleScraper (Python, file organization)');
  console.log('  - rigwild/moodle-hoover (JavaScript, file downloads)');
  console.log('  - Multiple other implementations\n');

  try {
    await githubInspiredExample();
    await multiCourseExample();
    await robustScrapingExample();
    await sessionValidationExample();
    
    console.log('\n🎉 All examples completed!');
    console.log('\n💡 Key improvements from GitHub analysis:');
    console.log('  ✅ Multi-strategy authentication');
    console.log('  ✅ Robust error handling');
    console.log('  ✅ Session management');
    console.log('  ✅ Multiple selector fallbacks');
    console.log('  ✅ Clean TypeScript API');
    console.log('  ✅ Comprehensive data extraction');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

module.exports = {
  githubInspiredExample,
  multiCourseExample,
  robustScrapingExample,
  sessionValidationExample,
  runAllExamples
}; 