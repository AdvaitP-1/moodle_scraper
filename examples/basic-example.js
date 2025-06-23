const { scrapeMoodle, MoodleScraper } = require('../dist');

async function example() {
  // Basic usage with the convenience function
  try {
    const credentials = {
      email: 'your-email@example.com',
      password: 'your-password',
      classUrl: 'https://your-moodle-site.com/course/view.php?id=123'
    };

    const options = {
      headless: false, // Set to true for production
      timeout: 30000
    };

    console.log('🚀 Starting Moodle scraping...');
    
    const data = await scrapeMoodle(credentials, options);
    
    console.log('\n📚 Scraped Data Summary:');
    console.log(`- Assignments: ${data.assignments.length}`);
    console.log(`- Grades: ${data.grades.length}`);
    console.log(`- Files: ${data.files.length}`);
    console.log(`- Zybook Integrations: ${data.zybookIntegrations.length}`);
    
    console.log('\n📝 Assignments:');
    data.assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. ${assignment.title} (Due: ${assignment.dueDate || 'No due date'})`);
    });
    
    console.log('\n📊 Grades:');
    data.grades.forEach((grade, index) => {
      console.log(`${index + 1}. ${grade.itemName}: ${grade.grade}/${grade.maxGrade}`);
    });
    
  } catch (error) {
    console.error('❌ Error scraping Moodle:', error.message);
  }
}

// Advanced usage with more control
async function advancedExample() {
  const scraper = new MoodleScraper({
    email: 'your-email@example.com',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.com/course/view.php?id=123'
  }, {
    headless: true,
    timeout: 60000
  });

  try {
    await scraper.initialize();
    await scraper.login();
    await scraper.navigateToClass();
    
    // Scrape specific data types individually
    const assignments = await scraper.scrapeAssignments();
    const grades = await scraper.scrapeGrades();
    
    console.log('Individual scraping results:', { assignments, grades });
    
  } catch (error) {
    console.error('Error in advanced example:', error.message);
  } finally {
    await scraper.close();
  }
}

// Run the basic example
example();

// Uncomment to run the advanced example
// advancedExample(); 