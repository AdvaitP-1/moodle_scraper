import { Browser, Page, ElementHandle } from 'puppeteer';
import { 
  MoodleCredentials, 
  Assignment, 
  Grade, 
  MoodleFile, 
  ZybookIntegration, 
  ScrapedData, 
  ScraperOptions 
} from '../types';

export class MoodleScraper {
  private browser: Browser | null = null;
  protected page: Page | null = null;
  protected credentials: MoodleCredentials;
  private options: ScraperOptions;

  constructor(credentials: MoodleCredentials, options: ScraperOptions = {}) {
    this.credentials = credentials;
    this.options = {
      headless: true,
      timeout: 30000,
      waitForElements: true,
      ...options
    };
  }

  async initialize(): Promise<void> {
    const puppeteer = await import('puppeteer');
    this.browser = await puppeteer.default.launch({
      headless: this.options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1366, height: 768 });
    
    // Set a reasonable timeout
    this.page.setDefaultTimeout(this.options.timeout!);
  }

  async login(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      // Navigate to the class URL first to determine the Moodle login page
      await this.page.goto(this.credentials.classUrl, { waitUntil: 'networkidle0' });
      
      // Check if we're redirected to a login page
      const currentUrl = this.page.url();
      
      // Look for login form elements
      const emailSelector = await this.findLoginSelector();
      const passwordSelector = await this.findPasswordSelector();
      
      if (!emailSelector || !passwordSelector) {
        throw new Error('Could not find login form elements');
      }

      // Fill login form
      await this.page.type(emailSelector, this.credentials.email);
      await this.page.type(passwordSelector, this.credentials.password);
      
      // Find and click login button
      const loginButton = await this.findLoginButton();
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click(loginButton)
      ]);

      // Verify login success
      await this.verifyLogin();
      return true;
      
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async findLoginSelector(): Promise<string> {
    const selectors = [
      'input[name="username"]',
      'input[name="email"]', 
      'input[type="email"]',
      'input[id*="email"]',
      'input[id*="username"]',
      '#username',
      '#email'
    ];

    for (const selector of selectors) {
      const element = await this.page!.$(selector);
      if (element) return selector;
    }
    
    throw new Error('Could not find email/username input field');
  }

  private async findPasswordSelector(): Promise<string> {
    const selectors = [
      'input[name="password"]',
      'input[type="password"]',
      '#password'
    ];

    for (const selector of selectors) {
      const element = await this.page!.$(selector);
      if (element) return selector;
    }
    
    throw new Error('Could not find password input field');
  }

  private async findLoginButton(): Promise<string> {
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Login")',
      'button:contains("Sign in")',
      '.btn-primary',
      '#loginbtn'
    ];

    for (const selector of selectors) {
      const element = await this.page!.$(selector);
      if (element) return selector;
    }
    
    throw new Error('Could not find login button');
  }

  private async verifyLogin(): Promise<void> {
    // Wait a bit for redirect
    await this.page!.waitForTimeout(2000);
    
    // Check if we're still on a login page or if login failed
    const currentUrl = this.page!.url();
    const pageContent = await this.page!.content();
    
    if (pageContent.includes('Invalid login') || 
        pageContent.includes('Login failed') ||
        pageContent.includes('incorrect')) {
      throw new Error('Invalid credentials');
    }
  }

  async navigateToClass(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    await this.page.goto(this.credentials.classUrl, { waitUntil: 'networkidle0' });
    
    // Wait for the course page to load
    await this.page.waitForSelector('.course-content, .main-course-page, #page-content', {
      timeout: 10000
    }).catch(() => {
      throw new Error('Could not access class page. Please verify the class URL.');
    });
  }

  async scrapeAssignments(): Promise<Assignment[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const assignments: Assignment[] = [];
    
    try {
      // Look for assignment links and sections
      const assignmentElements = await this.page.$$('a[href*="assign"], a[href*="assignment"], .activity.assign');
      
      for (const element of assignmentElements) {
        try {
          const assignment = await this.extractAssignmentData(element);
          if (assignment) assignments.push(assignment);
        } catch (error) {
          console.warn('Failed to extract assignment data:', error instanceof Error ? error.message : String(error));
        }
      }
      
    } catch (error) {
      console.warn('Error scraping assignments:', error instanceof Error ? error.message : String(error));
    }
    
    return assignments;
  }

  async scrapeGrades(): Promise<Grade[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const grades: Grade[] = [];
    
    try {
      // Try to find gradebook or grades link
      const gradesLink = await this.page.$('a[href*="grade"], a:contains("Grade"), a:contains("Gradebook")');
      
      if (gradesLink) {
        await gradesLink.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        // Extract grades from the gradebook page
        const gradeRows = await this.page.$$('tr.graderow, .gradestable tr');
        
        for (const row of gradeRows) {
          try {
            const grade = await this.extractGradeData(row);
            if (grade) grades.push(grade);
          } catch (error) {
            console.warn('Failed to extract grade data:', error instanceof Error ? error.message : String(error));
          }
        }
      }
      
    } catch (error) {
      console.warn('Error scraping grades:', error instanceof Error ? error.message : String(error));
    }
    
    return grades;
  }

  async scrapeFiles(): Promise<MoodleFile[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const files: MoodleFile[] = [];
    
    try {
      // Look for file resources and folders
      const fileElements = await this.page.$$('a[href*="resource"], a[href*="folder"], .activity.resource');
      
      for (const element of fileElements) {
        try {
          const file = await this.extractFileData(element);
          if (file) files.push(file);
        } catch (error) {
          console.warn('Failed to extract file data:', error instanceof Error ? error.message : String(error));
        }
      }
      
    } catch (error) {
      console.warn('Error scraping files:', error instanceof Error ? error.message : String(error));
    }
    
    return files;
  }

  async scrapeZybookIntegrations(): Promise<ZybookIntegration[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const zybookIntegrations: ZybookIntegration[] = [];
    
    try {
      // Look for Zybook links or external tool integrations
      const zybookElements = await this.page.$$('a[href*="zybook"], a[href*="zybooks"], .activity.lti');
      
      for (const element of zybookElements) {
        try {
          const zybook = await this.extractZybookData(element);
          if (zybook) zybookIntegrations.push(zybook);
        } catch (error) {
          console.warn('Failed to extract Zybook data:', error instanceof Error ? error.message : String(error));
        }
      }
      
    } catch (error) {
      console.warn('Error scraping Zybook integrations:', error instanceof Error ? error.message : String(error));
    }
    
    return zybookIntegrations;
  }

  async scrapeAll(): Promise<ScrapedData> {
    await this.initialize();
    await this.login();
    await this.navigateToClass();
    
    const [assignments, grades, files, zybookIntegrations] = await Promise.all([
      this.scrapeAssignments(),
      this.scrapeGrades(),
      this.scrapeFiles(),
      this.scrapeZybookIntegrations()
    ]);
    
    await this.close();
    
    return {
      assignments,
      grades,
      files,
      zybookIntegrations
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Check if the current session is still valid
   * Inspired by dotnize/moodle-scrape session management
   */
  async isSessionValid(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      await this.page.goto(this.credentials.classUrl, { waitUntil: 'networkidle0' });
      
      // Check for login indicators
      const loginIndicators = [
        'input[name="username"]',
        'input[name="password"]',
        '.login-form',
        '#loginform'
      ];

      for (const selector of loginIndicators) {
        const element = await this.page.$(selector);
        if (element) return false; // Found login form, session expired
      }

      return true; // No login form found, session likely valid
    } catch (error) {
      return false;
    }
  }

  // Helper methods for data extraction
  private async extractAssignmentData(element: ElementHandle): Promise<Assignment | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const titleEl = el.querySelector('.instancename, .activity-name, h3, .mod-indent-title');
        const linkEl = el.querySelector('a[href*="assign"]') || el;
        const dueDateEl = el.querySelector('.due-date, .assignment-due, [class*="due"]');
        const statusEl = el.querySelector('.status, .submission-status, [class*="status"]');
        
        const title = titleEl?.textContent?.trim() || 'Unknown Assignment';
        const url = (linkEl as HTMLAnchorElement)?.href || '';
        const id = url.match(/id=(\d+)/)?.[1] || Math.random().toString();
        
        let dueDate = null;
        if (dueDateEl) {
          const dueDateText = dueDateEl.textContent?.trim();
          if (dueDateText) {
            const dateMatch = dueDateText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
            if (dateMatch) {
              dueDate = new Date(dateMatch[1]).toISOString();
            }
          }
        }
        
        let submissionStatus: 'submitted' | 'not_submitted' | 'late' = 'not_submitted';
        if (statusEl) {
          const statusText = statusEl.textContent?.toLowerCase() || '';
          if (statusText.includes('submitted') || statusText.includes('complete')) {
            submissionStatus = 'submitted';
          } else if (statusText.includes('late') || statusText.includes('overdue')) {
            submissionStatus = 'late';
          }
        }
        
        return {
          id,
          title,
          url,
          dueDate,
          submissionStatus,
          description: '',
          maxGrade: 0,
          currentGrade: null
        };
      });
      
      return {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      } as Assignment;
      
    } catch (error) {
      console.warn('Error extracting assignment data:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async extractGradeData(element: ElementHandle): Promise<Grade | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const itemNameEl = el.querySelector('.gradeitem, .item-name, td:first-child');
        const gradeEl = el.querySelector('.grade, .points, .score');
        const maxGradeEl = el.querySelector('.max-grade, .total-points, .out-of');
        const feedbackEl = el.querySelector('.feedback, .comment');
        const dateEl = el.querySelector('.date-modified, .last-modified, .timestamp');
        
        const itemName = itemNameEl?.textContent?.trim() || 'Unknown Item';
        const gradeText = gradeEl?.textContent?.trim() || '0';
        const maxGradeText = maxGradeEl?.textContent?.trim() || '0';
        
        const gradeMatch = gradeText.match(/(\d+\.?\d*)/);
        const maxGradeMatch = maxGradeText.match(/(\d+\.?\d*)/);
        
        const grade = gradeMatch ? parseFloat(gradeMatch[1]) : 0;
        const maxGrade = maxGradeMatch ? parseFloat(maxGradeMatch[1]) : 100;
        const percentage = maxGrade > 0 ? (grade / maxGrade) * 100 : null;
        
        const feedback = feedbackEl?.textContent?.trim() || null;
        
        let dateModified = null;
        if (dateEl) {
          const dateText = dateEl.textContent?.trim();
          if (dateText) {
            dateModified = new Date(dateText).toISOString();
          }
        }
        
        return {
          itemName,
          grade: gradeText,
          maxGrade: maxGradeText,
          percentage,
          feedback,
          dateModified
        };
      });
      
      return {
        ...data,
        dateModified: data.dateModified ? new Date(data.dateModified) : null
      } as Grade;
      
    } catch (error) {
      console.warn('Error extracting grade data:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async extractFileData(element: ElementHandle): Promise<MoodleFile | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const linkEl = el.querySelector('a[href*="resource"], a[href*="mod_resource"]') || el;
        const nameEl = el.querySelector('.instancename, .resource-name, .filename');
        const sizeEl = el.querySelector('.filesize, .file-size, [class*="size"]');
        const typeEl = el.querySelector('.filetype, .file-type, .mimetype');
        
        const name = nameEl?.textContent?.trim() || 'Unknown File';
        const url = (linkEl as HTMLAnchorElement)?.href || '';
        const size = sizeEl?.textContent?.trim() || 'Unknown size';
        
        let type = typeEl?.textContent?.trim() || '';
        if (!type && url) {
          const extension = url.split('.').pop()?.toLowerCase();
          type = extension || 'unknown';
        }
        
        return {
          name,
          url,
          size,
          type,
          downloadUrl: url
        };
      });
      
      return data as MoodleFile;
      
    } catch (error) {
      console.warn('Error extracting file data:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async extractZybookData(element: ElementHandle): Promise<ZybookIntegration | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const titleEl = el.querySelector('.instancename, .activity-name, .lti-title');
        const linkEl = el.querySelector('a[href*="zybook"], a[href*="lti"]') || el;
        const dueDateEl = el.querySelector('.due-date, [class*="due"]');
        const statusEl = el.querySelector('.status, .completion-status, [class*="status"]');
        const progressEl = el.querySelector('.progress, .completion, [class*="progress"]');
        
        const title = titleEl?.textContent?.trim() || 'Zybook Activity';
        const url = (linkEl as HTMLAnchorElement)?.href || '';
        
        let dueDate = null;
        if (dueDateEl) {
          const dueDateText = dueDateEl.textContent?.trim();
          if (dueDateText) {
            const dateMatch = dueDateText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
            if (dateMatch) {
              dueDate = new Date(dateMatch[1]).toISOString();
            }
          }
        }
        
        const completionStatus = statusEl?.textContent?.trim() || 'Not started';
        
        let progress = null;
        if (progressEl) {
          const progressText = progressEl.textContent?.trim();
          const progressMatch = progressText?.match(/(\d+)%/);
          if (progressMatch) {
            progress = parseInt(progressMatch[1]);
          }
        }
        
        return {
          title,
          url,
          dueDate,
          completionStatus,
          progress
        };
      });
      
      return {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      } as ZybookIntegration;
      
    } catch (error) {
      console.warn('Error extracting Zybook data:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }
} 