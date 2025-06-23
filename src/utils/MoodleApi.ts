import { Page } from 'puppeteer';
import { Course, Assignment, Grade, MoodleFile, ZybookIntegration, MoodleCredentials } from '../types';

/**
 * Enhanced Moodle API interaction class
 * Inspired by successful patterns from GitHub repositories
 */
export class MoodleApi {
  private page: Page;
  private credentials: MoodleCredentials;
  private sessionCookies: string = '';

  constructor(page: Page, credentials: MoodleCredentials) {
    this.page = page;
    this.credentials = credentials;
  }

  /**
   * Discover all available courses for the authenticated user
   */
  async discoverCourses(): Promise<Course[]> {
    const courses: Course[] = [];

    try {
      // Try dashboard first (most common)
      await this.page.goto(this.getDashboardUrl(), { waitUntil: 'networkidle0' });
      
      // Look for course listings on dashboard
      const courseElements = await this.page.$$([
        '.coursebox',
        '.course-listing .course',
        '.course-item',
        'a[href*="course/view.php"]',
        '[data-course-id]',
        '.course-title a'
      ].join(', '));

      for (const element of courseElements) {
        const course = await this.extractCourseData(element);
        if (course) courses.push(course);
      }

      // If no courses found on dashboard, try navigation menu
      if (courses.length === 0) {
        const navCourses = await this.getCoursesFromNavigation();
        courses.push(...navCourses);
      }

    } catch (error) {
      console.warn('Error discovering courses:', error instanceof Error ? error.message : String(error));
    }

    return courses;
  }

  /**
   * Extract assignments from current course page
   */
  async extractAssignments(): Promise<Assignment[]> {
    const assignments: Assignment[] = [];

    try {
      // Look for assignment activities
      const assignmentSelectors = [
        'a[href*="assign/view.php"]',
        '.activity.assign',
        '[data-activityname*="assign"]',
        '.mod-indent .assign',
        'li.activity[id*="assign"]'
      ];

      for (const selector of assignmentSelectors) {
        const elements = await this.page.$$(selector);
        
        for (const element of elements) {
          try {
            const assignment = await this.extractAssignmentDetails(element);
            if (assignment) assignments.push(assignment);
          } catch (error) {
            console.warn('Failed to extract assignment:', error instanceof Error ? error.message : String(error));
          }
        }
      }

      // Also check for assignment calendar entries
      const calendarAssignments = await this.extractCalendarAssignments();
      assignments.push(...calendarAssignments);

    } catch (error) {
      console.warn('Error extracting assignments:', error instanceof Error ? error.message : String(error));
    }

    return assignments;
  }

  /**
   * Extract detailed assignment information
   */
  private async extractAssignmentDetails(element: any): Promise<Assignment | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        // Find assignment link and title
        const linkEl = el.querySelector('a[href*="assign"]') as HTMLAnchorElement || el as HTMLAnchorElement;
        const titleEl = el.querySelector('.instancename, .activity-name, h3') || el;
        
        const url = linkEl?.href || '';
        const title = titleEl?.textContent?.trim() || 'Unknown Assignment';
        const id = url.match(/id=(\d+)/)?.[1] || Math.random().toString();

        // Look for due date information
        let dueDate = null;
        const dueDateElements = [
          el.querySelector('.due-date'),
          el.querySelector('[class*="due"]'),
          el.querySelector('.assignment-due'),
          el.querySelector('.date')
        ].filter(Boolean);

        for (const dueDateEl of dueDateElements) {
          if (dueDateEl) {
            const dueDateText = dueDateEl.textContent?.trim();
            if (dueDateText) {
              // Try to parse various date formats
              const datePatterns = [
                /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
                /(\w+ \d{1,2}, \d{4})/,
                /(\d{4}-\d{2}-\d{2})/
              ];
              
              for (const pattern of datePatterns) {
                const match = dueDateText.match(pattern);
                if (match) {
                  const parsedDate = new Date(match[1]);
                  if (!isNaN(parsedDate.getTime())) {
                    dueDate = parsedDate.toISOString();
                    break;
                  }
                }
              }
              
              if (dueDate) break;
            }
          }
        }

        // Check submission status
        let submissionStatus: 'submitted' | 'not_submitted' | 'late' = 'not_submitted';
        const statusEl = el.querySelector('.status, .submission-status, [class*="status"]');
        if (statusEl) {
          const statusText = statusEl.textContent?.toLowerCase() || '';
          if (statusText.includes('submitted') || statusText.includes('complete')) {
            submissionStatus = 'submitted';
          } else if (statusText.includes('late') || statusText.includes('overdue')) {
            submissionStatus = 'late';
          }
        }

        // Look for grade information
        let currentGrade = null;
        let maxGrade = 0;
        const gradeEl = el.querySelector('.grade, .points, .score');
        if (gradeEl) {
          const gradeText = gradeEl.textContent?.trim() || '';
          const gradeMatch = gradeText.match(/(\d+\.?\d*)[\s\/]*(\d+\.?\d*)?/);
          if (gradeMatch) {
            currentGrade = parseFloat(gradeMatch[1]);
            maxGrade = gradeMatch[2] ? parseFloat(gradeMatch[2]) : 100;
          }
        }

        return {
          id,
          title,
          description: '',
          dueDate,
          submissionStatus,
          maxGrade,
          currentGrade,
          url
        };
      });

      return {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      } as Assignment;

    } catch (error) {
      console.warn('Error extracting assignment details:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Extract grades from gradebook
   */
  async extractGrades(): Promise<Grade[]> {
    const grades: Grade[] = [];

    try {
      // Try to navigate to gradebook
      const gradebookUrls = [
        this.buildUrl('/grade/report/user/index.php'),
        this.buildUrl('/grade/report/overview/index.php'),
        this.buildUrl('/grade/index.php')
      ];

      let gradebookFound = false;
      for (const url of gradebookUrls) {
        try {
          await this.page.goto(url, { waitUntil: 'networkidle0' });
          const hasGrades = await this.page.$('.gradestable, .grades, .gradeitemheader');
          if (hasGrades) {
            gradebookFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!gradebookFound) {
        // Try to find grades link on current page
        const gradesLink = await this.page.$('a[href*="grade"], a:contains("Grade"), a:contains("Gradebook")');
        if (gradesLink) {
          await gradesLink.click();
          await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
        }
      }

      // Extract grade data
      const gradeRows = await this.page.$$('.gradestable tr, .grades .grade-row, .user-grade');
      
      for (const row of gradeRows) {
        try {
          const grade = await this.extractGradeDetails(row);
          if (grade) grades.push(grade);
        } catch (error) {
          console.warn('Failed to extract grade:', error instanceof Error ? error.message : String(error));
        }
      }

    } catch (error) {
      console.warn('Error extracting grades:', error instanceof Error ? error.message : String(error));
    }

    return grades;
  }

  /**
   * Extract files and resources from course
   */
  async extractFiles(): Promise<MoodleFile[]> {
    const files: MoodleFile[] = [];

    try {
      // Look for file resources
      const fileSelectors = [
        'a[href*="resource/view.php"]',
        'a[href*="folder/view.php"]',
        '.activity.resource',
        '.activity.folder',
        '[data-activityname*="resource"]',
        'a[href*="pluginfile.php"]'
      ];

      for (const selector of fileSelectors) {
        const elements = await this.page.$$(selector);
        
        for (const element of elements) {
          try {
            const file = await this.extractFileDetails(element);
            if (file) files.push(file);
          } catch (error) {
            console.warn('Failed to extract file:', error instanceof Error ? error.message : String(error));
          }
        }
      }

    } catch (error) {
      console.warn('Error extracting files:', error instanceof Error ? error.message : String(error));
    }

    return files;
  }

  /**
   * Extract Zybook and LTI integrations
   */
  async extractZybookIntegrations(): Promise<ZybookIntegration[]> {
    const integrations: ZybookIntegration[] = [];

    try {
      // Look for LTI activities and Zybook-specific links
      const ltiSelectors = [
        'a[href*="zybook"]',
        'a[href*="zybooks"]',
        '.activity.lti',
        '[data-activityname*="zybook"]',
        'a[href*="mod/lti/view.php"]',
        '.external-tool'
      ];

      for (const selector of ltiSelectors) {
        const elements = await this.page.$$(selector);
        
        for (const element of elements) {
          try {
            const integration = await this.extractZybookDetails(element);
            if (integration) integrations.push(integration);
          } catch (error) {
            console.warn('Failed to extract Zybook integration:', error instanceof Error ? error.message : String(error));
          }
        }
      }

    } catch (error) {
      console.warn('Error extracting Zybook integrations:', error instanceof Error ? error.message : String(error));
    }

    return integrations;
  }

  // Helper methods for data extraction

  private async extractCourseData(element: any): Promise<Course | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const linkEl = el.querySelector('a[href*="course/view.php"]') as HTMLAnchorElement || el as HTMLAnchorElement;
        const titleEl = el.querySelector('.coursename, .course-title, h3') || el;
        
        const url = linkEl?.href || '';
        const title = titleEl?.textContent?.trim() || 'Unknown Course';
        const id = url.match(/id=(\d+)/)?.[1] || Math.random().toString();
        
        // Try to find course code or description
        const codeEl = el.querySelector('.course-code, .shortname');
        const descEl = el.querySelector('.course-description, .summary');
        
        return {
          id,
          title,
          shortName: codeEl?.textContent?.trim() || '',
          description: descEl?.textContent?.trim() || '',
          url
        };
      });

      return data as Course;
    } catch (error) {
      return null;
    }
  }

  private async extractGradeDetails(element: any): Promise<Grade | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const itemNameEl = el.querySelector('.gradeitem, .item-name, td:first-child');
        const gradeEl = el.querySelector('.grade, .points, .percentage');
        const maxGradeEl = el.querySelector('.max-grade, .total-points, .out-of');
        const feedbackEl = el.querySelector('.feedback, .comment');
        const dateEl = el.querySelector('.date-modified, .last-modified');

        const itemName = itemNameEl?.textContent?.trim() || 'Unknown Item';
        const gradeText = gradeEl?.textContent?.trim() || '0';
        const maxGradeText = maxGradeEl?.textContent?.trim() || '0';

        // Parse grade and calculate percentage
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
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
              dateModified = parsedDate.toISOString();
            }
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
      return null;
    }
  }

  private async extractFileDetails(element: any): Promise<MoodleFile | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const linkEl = el.querySelector('a[href*="resource"], a[href*="folder"], a[href*="pluginfile"]') as HTMLAnchorElement || el as HTMLAnchorElement;
        const nameEl = el.querySelector('.instancename, .resource-name, .filename') || el;
        const sizeEl = el.querySelector('.filesize, .file-size');
        const typeEl = el.querySelector('.filetype, .file-type');

        const name = nameEl?.textContent?.trim() || 'Unknown File';
        const url = linkEl?.href || '';
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
      return null;
    }
  }

  private async extractZybookDetails(element: any): Promise<ZybookIntegration | null> {
    try {
      const data = await element.evaluate((el: Element) => {
        const titleEl = el.querySelector('.instancename, .activity-name, .lti-title') || el;
        const linkEl = el.querySelector('a[href*="zybook"], a[href*="lti"]') as HTMLAnchorElement || el as HTMLAnchorElement;
        const dueDateEl = el.querySelector('.due-date, [class*="due"]');
        const statusEl = el.querySelector('.status, .completion-status');
        const progressEl = el.querySelector('.progress, .completion');

        const title = titleEl?.textContent?.trim() || 'Zybook Activity';
        const url = linkEl?.href || '';
        
        let dueDate = null;
        if (dueDateEl) {
          const dueDateText = dueDateEl.textContent?.trim();
          if (dueDateText) {
            const dateMatch = dueDateText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
            if (dateMatch) {
              const parsedDate = new Date(dateMatch[1]);
              if (!isNaN(parsedDate.getTime())) {
                dueDate = parsedDate.toISOString();
              }
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
      return null;
    }
  }

  // Utility methods

  private getDashboardUrl(): string {
    const baseUrl = new URL(this.credentials.classUrl).origin;
    return `${baseUrl}/my/`;
  }

  private buildUrl(path: string): string {
    const baseUrl = new URL(this.credentials.classUrl).origin;
    return baseUrl + path;
  }

  private async getCoursesFromNavigation(): Promise<Course[]> {
    const courses: Course[] = [];
    
    try {
      // Look for navigation menu with courses
      const navSelectors = [
        '.navbar .dropdown-menu a[href*="course"]',
        '.navigation .course-link',
        '#nav-drawer a[href*="course"]',
        '.block_navigation a[href*="course"]'
      ];

      for (const selector of navSelectors) {
        const elements = await this.page.$$(selector);
        
        for (const element of elements) {
          const course = await this.extractCourseData(element);
          if (course) courses.push(course);
        }
        
        if (courses.length > 0) break; // Found courses, no need to try other selectors
      }

    } catch (error) {
      console.warn('Error getting courses from navigation:', error instanceof Error ? error.message : String(error));
    }

    return courses;
  }

  private async extractCalendarAssignments(): Promise<Assignment[]> {
    const assignments: Assignment[] = [];
    
    try {
      // Try to access calendar or upcoming events
      const calendarSelectors = [
        '.calendar-upcoming .event',
        '.upcoming-events .assignment',
        '[data-type="assignment"]',
        '.calendar .event[data-event-type="assign"]'
      ];

      for (const selector of calendarSelectors) {
        const elements = await this.page.$$(selector);
        
        for (const element of elements) {
          try {
            const assignment = await this.extractAssignmentDetails(element);
            if (assignment) assignments.push(assignment);
          } catch (error) {
            // Continue with other elements
            continue;
          }
        }
      }

    } catch (error) {
      // Calendar extraction is optional, don't throw
    }

    return assignments;
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      await this.page.goto(this.credentials.classUrl, { waitUntil: 'networkidle0' });
      
      // Check for login indicators
      const loginIndicators = [
        'input[name="username"]',
        'input[name="password"]',
        '.login-form'
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
} 