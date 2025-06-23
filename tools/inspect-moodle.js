const puppeteer = require('puppeteer');

async function inspectMoodle() {
  const browser = await puppeteer.launch({ 
    headless: false, // Keep browser open so you can see what's happening
    devtools: true   // Open DevTools automatically
  });
  
  const page = await browser.newPage();
  
  // Replace with your actual Moodle credentials and URL
  const credentials = {
    email: 'your-email@example.com',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.com/course/view.php?id=123'
  };
  
  try {
    console.log('🔍 Navigating to Moodle...');
    await page.goto(credentials.classUrl);
    
    // Wait for you to manually login (if needed)
    console.log('Please login manually if required, then press Enter...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    console.log('📊 Analyzing page structure...');
    
    // Extract and log all potential assignment elements
    const assignmentSelectors = await page.evaluate(() => {
      const selectors = [];
      
      // Look for assignment-related elements
      const potentialAssignments = document.querySelectorAll(`
        a[href*="assign"],
        a[href*="assignment"], 
        .activity.assign,
        .activity[data-module="assign"],
        .mod_assign,
        [class*="assignment"]
      `);
      
      potentialAssignments.forEach((el, index) => {
        selectors.push({
          type: 'assignment',
          index,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          href: el.href,
          text: el.textContent?.trim().substring(0, 100),
          innerHTML: el.innerHTML.substring(0, 200)
        });
      });
      
      return selectors;
    });
    
    console.log('\n📝 Found Assignment Elements:');
    assignmentSelectors.forEach(sel => {
      console.log(`${sel.index}: ${sel.tagName}.${sel.className} - "${sel.text}"`);
    });
    
    // Extract grade/gradebook elements
    const gradeSelectors = await page.evaluate(() => {
      const selectors = [];
      
      const potentialGrades = document.querySelectorAll(`
        a[href*="grade"],
        a[href*="gradebook"],
        .gradestable,
        .grade,
        [class*="grade"]
      `);
      
      potentialGrades.forEach((el, index) => {
        selectors.push({
          type: 'grade',
          index,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          href: el.href,
          text: el.textContent?.trim().substring(0, 100)
        });
      });
      
      return selectors;
    });
    
    console.log('\n📊 Found Grade Elements:');
    gradeSelectors.forEach(sel => {
      console.log(`${sel.index}: ${sel.tagName}.${sel.className} - "${sel.text}"`);
    });
    
    // Extract file elements
    const fileSelectors = await page.evaluate(() => {
      const selectors = [];
      
      const potentialFiles = document.querySelectorAll(`
        a[href*="resource"],
        a[href*="mod_resource"],
        .activity.resource,
        .mod_resource,
        [class*="resource"]
      `);
      
      potentialFiles.forEach((el, index) => {
        selectors.push({
          type: 'file',
          index,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          href: el.href,
          text: el.textContent?.trim().substring(0, 100)
        });
      });
      
      return selectors;
    });
    
    console.log('\n📁 Found File Elements:');
    fileSelectors.forEach(sel => {
      console.log(`${sel.index}: ${sel.tagName}.${sel.className} - "${sel.text}"`);
    });
    
    // Look for Zybook elements
    const zybookSelectors = await page.evaluate(() => {
      const selectors = [];
      
      const potentialZybooks = document.querySelectorAll(`
        a[href*="zybook"],
        a[href*="zybooks"],
        .activity.lti,
        .mod_lti,
        [class*="zybook"]
      `);
      
      potentialZybooks.forEach((el, index) => {
        selectors.push({
          type: 'zybook',
          index,
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          href: el.href,
          text: el.textContent?.trim().substring(0, 100)
        });
      });
      
      return selectors;
    });
    
    console.log('\n🔗 Found Zybook Elements:');
    zybookSelectors.forEach(sel => {
      console.log(`${sel.index}: ${sel.tagName}.${sel.className} - "${sel.text}"`);
    });
    
    // Generate CSS selectors for you to use
    console.log('\n✨ Suggested CSS Selectors:');
    console.log('Assignments:', assignmentSelectors.length > 0 ? `"${assignmentSelectors[0].tagName.toLowerCase()}.${assignmentSelectors[0].className.split(' ')[0]}"` : 'None found');
    console.log('Grades:', gradeSelectors.length > 0 ? `"${gradeSelectors[0].tagName.toLowerCase()}.${gradeSelectors[0].className.split(' ')[0]}"` : 'None found');
    console.log('Files:', fileSelectors.length > 0 ? `"${fileSelectors[0].tagName.toLowerCase()}.${fileSelectors[0].className.split(' ')[0]}"` : 'None found');
    console.log('Zybooks:', zybookSelectors.length > 0 ? `"${zybookSelectors[0].tagName.toLowerCase()}.${zybookSelectors[0].className.split(' ')[0]}"` : 'None found');
    
    console.log('\n🎯 Next steps:');
    console.log('1. Use the DevTools to inspect specific elements');
    console.log('2. Note down the exact CSS selectors you need');
    console.log('3. Implement the extraction methods using these selectors');
    console.log('4. Press Ctrl+C when done inspecting');
    
    // Keep browser open for manual inspection
    await new Promise(() => {}); // Wait indefinitely
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

// Run the inspection
inspectMoodle().catch(console.error); 