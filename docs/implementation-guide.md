# 🔧 Implementation Guide: Getting the Scraping Logic

This guide will walk you through the process of customizing the Moodle scraper for your specific Moodle site.

## 🎯 Overview

Different Moodle installations have different HTML structures, themes, and configurations. You'll need to:

1. **Inspect** your Moodle site's HTML structure
2. **Identify** the correct CSS selectors
3. **Implement** the extraction functions
4. **Test** and refine your implementation

## 📋 Step-by-Step Process

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run the Inspection Tool

```bash
# First, update your credentials in tools/inspect-moodle.js
node tools/inspect-moodle.js
```

This will:
- Open your Moodle site in a browser
- Allow you to login manually
- Analyze the HTML structure
- Show you potential CSS selectors
- Keep DevTools open for manual inspection

### Step 3: Manual HTML Inspection

With the browser open, use these techniques:

1. **Right-click on elements** → "Inspect Element"
2. **Look for patterns** in class names and IDs
3. **Note the HTML structure** around assignments, grades, etc.
4. **Test CSS selectors** in the browser console:

```javascript
// Test if your selector works
document.querySelectorAll('.your-selector-here');
```

### Step 4: Common Moodle Patterns to Look For

#### 🔍 **Assignments**
Look for elements containing:
- `class*="assign"` or `class*="assignment"`
- `href*="mod/assign"` or `href*="assignment"`
- `.activity.assign`
- `.mod_assign`

Example HTML patterns:
```html
<!-- Pattern 1: Activity Block -->
<div class="activity assign modtype_assign">
  <div class="mod-indent-title">
    <a href="/mod/assign/view.php?id=123">Assignment Name</a>
  </div>
  <div class="due-date">Due: March 15, 2024</div>
</div>

<!-- Pattern 2: Course Module -->
<li class="activity activity-wrapper">
  <div class="activityinstance">
    <a href="/mod/assign/view.php?id=456">
      <span class="instancename">Essay Assignment</span>
    </a>
  </div>
</li>
```

#### 📊 **Grades**
Look for:
- Grade tables: `.gradestable`, `.grades`
- Grade items: `.gradeitem`, `.grade-row`
- Links: `href*="grade"`, `href*="gradebook"`

#### 📁 **Files**
Look for:
- Resource activities: `.activity.resource`, `.mod_resource`
- File links: `href*="mod/resource"`, `href*="pluginfile"`

#### 🔗 **Zybooks**
Look for:
- External tools: `.activity.lti`, `.mod_lti`
- Zybook-specific: `href*="zybook"`, `class*="zybook"`

### Step 5: Update the Extraction Functions

Edit `src/scraper/extractors.ts` and customize the CSS selectors:

```typescript
// Example: Update assignment extraction
const titleEl = el.querySelector('.instancename'); // ← Change this selector
const dueDateEl = el.querySelector('.due-date');   // ← And this one
```

### Step 6: Test Your Implementation

Create a test script:

```javascript
// test-scraper.js
const { MoodleScraper } = require('./dist');

async function test() {
  const scraper = new MoodleScraper({
    email: 'your-email@example.com',
    password: 'your-password',
    classUrl: 'https://your-moodle-site.com/course/view.php?id=123'
  }, {
    headless: false // Keep visible for debugging
  });

  try {
    await scraper.initialize();
    await scraper.login();
    await scraper.navigateToClass();
    
    // Test individual components
    const assignments = await scraper.scrapeAssignments();
    console.log('Found assignments:', assignments.length);
    console.log('Sample assignment:', assignments[0]);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await scraper.close();
  }
}

test();
```

## 🛠️ Advanced Techniques

### Finding Dynamic Content

Some Moodle sites load content dynamically. Handle this by:

```javascript
// Wait for content to load
await page.waitForSelector('.your-selector', { timeout: 10000 });

// Wait for network requests to complete
await page.waitForLoadState('networkidle');

// Scroll to trigger lazy loading
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
```

### Handling Different Date Formats

Moodle can display dates in various formats:

```javascript
function parseDate(dateText) {
  // Try multiple patterns
  const patterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/,   // MM-DD-YYYY  
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
    // Add more patterns as needed
  ];
  
  for (const pattern of patterns) {
    const match = dateText.match(pattern);
    if (match) {
      return new Date(match[0]);
    }
  }
  
  return null;
}
```

### Debugging Tips

1. **Use `console.log`** liberally in your extraction functions
2. **Set `headless: false`** to see what's happening
3. **Take screenshots** when things go wrong:

```javascript
await page.screenshot({ path: 'debug.png' });
```

4. **Check the page source**:

```javascript
const html = await page.content();
console.log(html); // See the actual HTML
```

## 📊 Example: Real Implementation

Here's how you might customize for a specific Moodle site:

```typescript
// Based on inspection, you found that assignments use this structure:
export async function extractAssignmentData(element: ElementHandle): Promise<Assignment | null> {
  const data = await element.evaluate((el) => {
    // Your site-specific selectors (discovered through inspection)
    const titleEl = el.querySelector('.mod-indent-title .instancename');
    const linkEl = el.closest('a') || el.querySelector('a');
    const statusEl = el.querySelector('.completion-icon');
    
    const title = titleEl?.textContent?.replace(/\s+/g, ' ').trim() || 'Unknown';
    const url = linkEl?.href || '';
    const id = url.match(/id=(\d+)/)?.[1] || '';
    
    // Your site shows status as an icon class
    let submissionStatus = 'not_submitted';
    if (statusEl?.classList.contains('completion-complete')) {
      submissionStatus = 'submitted';
    }
    
    return { id, title, url, submissionStatus };
  });
  
  return data as Assignment;
}
```

## 🚀 Next Steps

1. Run the inspection tool
2. Document the patterns you find
3. Update the extraction functions
4. Test thoroughly with different courses
5. Handle edge cases and errors
6. Consider different Moodle themes/versions

## 🔄 Iteration Process

This is an iterative process:

1. **Inspect** → **Implement** → **Test** → **Refine** → **Repeat**
2. Start with one data type (e.g., assignments) and get it working perfectly
3. Then move to the next data type
4. Test with multiple courses to ensure robustness

Remember: Each Moodle installation is unique, so the extraction logic will need to be tailored to your specific site! 