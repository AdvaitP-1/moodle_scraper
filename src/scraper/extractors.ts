import { ElementHandle } from 'puppeteer';
import { Assignment, Grade, MoodleFile, ZybookIntegration } from '../types';

/**
 * Generic extraction functions for different Moodle data types
 * These can be customized based on specific Moodle site configurations
 */

/**
 * Extract assignment data from a DOM element
 * @param element - The DOM element containing assignment information
 * @returns Assignment object or null if extraction fails
 */
export async function extractAssignment(element: ElementHandle): Promise<Assignment | null> {
  try {
    const data = await element.evaluate((el: Element) => {
      // Look for assignment title and link
      const titleElement = el.querySelector('.instancename, .activity-name, h3, .assignment-title');
      const linkElement = el.querySelector('a[href*="assign"]') || el;
      
      // Extract basic information
      const title = titleElement?.textContent?.trim() || 'Unknown Assignment';
      const url = (linkElement as HTMLAnchorElement)?.href || '';
      const id = url.match(/id=(\d+)/)?.[1] || Math.random().toString();
      
      // Look for due date
      const dueDateElement = el.querySelector('.due-date, .duedate, .assignment-due, [class*="due"]');
      let dueDate: string | null = null;
      
      if (dueDateElement) {
        const dueDateText = dueDateElement.textContent?.trim();
        if (dueDateText) {
          // Try different date patterns
          const datePattern = dueDateText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
          if (datePattern) {
            const parsed = new Date(datePattern[1]);
            if (!isNaN(parsed.getTime())) {
              dueDate = parsed.toISOString();
            }
          }
        }
      }
      
      // Check submission status
      const statusElement = el.querySelector('.status, .submission-status, [class*="status"]');
      let submissionStatus: 'submitted' | 'not_submitted' | 'late' = 'not_submitted';
      
      if (statusElement) {
        const statusText = statusElement.textContent?.toLowerCase() || '';
        if (statusText.includes('submitted') || statusText.includes('complete')) {
          submissionStatus = 'submitted';
        } else if (statusText.includes('late') || statusText.includes('overdue')) {
          submissionStatus = 'late';
        }
      }
      
      // Look for description
      const descElement = el.querySelector('.assignment-description, .description, .summary');
      const description = descElement?.textContent?.trim() || '';
      
      // Look for grade information
      const gradeElement = el.querySelector('.grade, .points, .score');
      let currentGrade: number | null = null;
      let maxGrade = 0;
      
      if (gradeElement) {
        const gradeText = gradeElement.textContent?.trim() || '';
        const gradeMatch = gradeText.match(/(\d+\.?\d*)[\s\/]*(\d+\.?\d*)?/);
        if (gradeMatch) {
          currentGrade = parseFloat(gradeMatch[1]);
          maxGrade = gradeMatch[2] ? parseFloat(gradeMatch[2]) : 100;
        }
      }
      
      return {
        id,
        title,
        description,
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
    console.warn('Failed to extract assignment:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Extract grade data from a DOM element
 * @param element - The DOM element containing grade information
 * @returns Grade object or null if extraction fails
 */
export async function extractGrade(element: ElementHandle): Promise<Grade | null> {
  try {
    const data = await element.evaluate((el: Element) => {
      // Look for grade item name
      const itemNameElement = el.querySelector('.gradeitemheader, .item-name, .gradeitem, td:first-child');
      const itemName = itemNameElement?.textContent?.trim() || null;
      
      // Extract grade values
      const gradeElement = el.querySelector('.grade, .points, .percentage, .finalgrade');
      const maxGradeElement = el.querySelector('.max-grade, .total-points, .out-of');
      
      const gradeText = gradeElement?.textContent?.trim() || '0';
      const maxGradeText = maxGradeElement?.textContent?.trim() || '0';
      
      // Calculate percentage
      const gradeMatch = gradeText.match(/(\d+\.?\d*)/);
      const maxGradeMatch = maxGradeText.match(/(\d+\.?\d*)/);
      
      const gradeValue = gradeMatch ? parseFloat(gradeMatch[1]) : 0;
      const maxGradeValue = maxGradeMatch ? parseFloat(maxGradeMatch[1]) : 100;
      const percentage = maxGradeValue > 0 ? (gradeValue / maxGradeValue) * 100 : 0;
      
      // Look for feedback
      const feedbackElement = el.querySelector('.feedback, .comment, .grade-feedback');
      const feedback = feedbackElement?.textContent?.trim() || null;
      
      // Look for date modified
      const dateElement = el.querySelector('.date-modified, .last-modified, .timestamp, .grade-date');
      let dateModified: string | null = null;
      
      if (dateElement) {
        const dateText = dateElement.textContent?.trim();
        if (dateText) {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            dateModified = parsed.toISOString();
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
    console.warn('Failed to extract grade:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Extract file data from a DOM element
 * @param element - The DOM element containing file information
 * @returns MoodleFile object or null if extraction fails
 */
export async function extractFile(element: ElementHandle): Promise<MoodleFile | null> {
  try {
    const data = await element.evaluate((el: Element) => {
      // Look for file name and link
      const nameElement = el.querySelector('.instancename, .resource-name, .filename, .fp-filename');
      const linkElement = el.querySelector('a[href*="resource"], a[href*="pluginfile"], a[href*="folder"]') || el;
      
      const name = nameElement?.textContent?.trim() || 'Unknown File';
      const url = (linkElement as HTMLAnchorElement)?.href || '';
      
      // Look for file size
      const sizeElement = el.querySelector('.filesize, .file-size, .size');
      const size = sizeElement?.textContent?.trim() || 'Unknown size';
      
      // Determine file type
      const typeElement = el.querySelector('.filetype, .file-type, .mimetype');
      let type = typeElement?.textContent?.trim() || '';
      
      if (!type && url) {
        // Determine from URL extension
        const urlParts = url.split('.');
        const extension = urlParts.length > 1 ? urlParts.pop()?.toLowerCase() : '';
        type = extension || 'unknown';
      }
      
      if (!type) {
        type = 'unknown';
      }
      
      // Look for icon to determine type if still unknown
      if (!type || type === 'unknown') {
        const iconElement = el.querySelector('.iconlarge, .activityicon, .icon, img');
        if (iconElement) {
          const iconSrc = (iconElement as HTMLImageElement).src || '';
          const iconClass = iconElement.className || '';
          
          if (iconSrc.includes('pdf') || iconClass.includes('pdf')) type = 'pdf';
          else if (iconSrc.includes('document') || iconClass.includes('document')) type = 'document';
          else if (iconSrc.includes('spreadsheet') || iconClass.includes('spreadsheet')) type = 'spreadsheet';
          else if (iconSrc.includes('presentation') || iconClass.includes('presentation')) type = 'presentation';
          else if (iconSrc.includes('image') || iconClass.includes('image')) type = 'image';
          else if (iconSrc.includes('video') || iconClass.includes('video')) type = 'video';
          else if (iconSrc.includes('audio') || iconClass.includes('audio')) type = 'audio';
        }
      }
      
      return {
        name,
        url,
        size,
        type: type || 'unknown',
        downloadUrl: url // In most cases, the view URL is also the download URL
      };
    });
    
    return data as MoodleFile;
    
  } catch (error) {
    console.warn('Failed to extract file:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Extract Zybook integration data from a DOM element
 * @param element - The DOM element containing Zybook information
 * @returns ZybookIntegration object or null if extraction fails
 */
export async function extractZybookIntegration(element: ElementHandle): Promise<ZybookIntegration | null> {
  try {
    const data = await element.evaluate((el: Element) => {
      // Look for title and link
      const titleElement = el.querySelector('.instancename, .activity-name, .lti-title, .external-tool-title');
      const linkElement = el.querySelector('a[href*="zybook"], a[href*="lti"], a[href*="external"]') || el;
      
      const title = titleElement?.textContent?.trim() || '';
      const url = (linkElement as HTMLAnchorElement)?.href || '';
      
      // Look for due date
      const dueDateElement = el.querySelector('.due-date, .duedate, [class*="due"]');
      let dueDate: string | null = null;
      
      if (dueDateElement) {
        const dueDateText = dueDateElement.textContent?.trim();
        if (dueDateText) {
          const datePattern = dueDateText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
          if (datePattern) {
            const parsed = new Date(datePattern[1]);
            if (!isNaN(parsed.getTime())) {
              dueDate = parsed.toISOString();
            }
          }
        }
      }
      
      // Look for completion status
      const statusElement = el.querySelector('.status, .completion-status, .completion-manual, .completion-auto');
      let completionStatus = 'Not started';
      
      if (statusElement) {
        const statusText = statusElement.textContent?.trim();
        const statusClass = statusElement.className || '';
        
        if (statusText?.toLowerCase().includes('complete') || statusClass.includes('completion-y')) {
          completionStatus = 'Completed';
        } else if (statusText?.toLowerCase().includes('progress') || statusClass.includes('completion-n')) {
          completionStatus = 'In Progress';
        }
      }
      
      // Look for progress percentage
      const progressElement = el.querySelector('.progress, .completion-progress, [class*="progress"]');
      let progress: number | null = null;
      
      if (progressElement) {
        const progressText = progressElement.textContent?.trim();
        if (progressText) {
          const progressMatch = progressText.match(/(\d+)%/);
          if (progressMatch) {
            progress = parseInt(progressMatch[1], 10);
          }
        }
        
        // Also check for progress bar width
        const progressBar = progressElement.querySelector('.progress-bar, .bar');
        if (progressBar && progress === null) {
          const style = (progressBar as HTMLElement).style;
          const width = style.width;
          if (width) {
            const widthMatch = width.match(/(\d+)%/);
            if (widthMatch) {
              progress = parseInt(widthMatch[1], 10);
            }
          }
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
    console.warn('Failed to extract Zybook integration:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Helper function to clean and normalize text
 * @param text - Raw text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .replace(/^\s+|\s+$/g, '')  // Trim start and end
    .replace(/\n/g, ' ')  // Replace newlines with spaces
    .trim();
}

/**
 * Helper function to parse dates from various formats
 * @param dateText - Date text to parse
 * @returns Date object or null if parsing fails
 */
export function parseDate(dateText: string): Date | null {
  if (!dateText) return null;
  
  // Try different date patterns
  const patterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // MM/DD/YYYY or MM-DD-YYYY
    /(\w+ \d{1,2}, \d{4})/,  // Month DD, YYYY
    /(\d{4}-\d{2}-\d{2})/,   // YYYY-MM-DD
    /(\d{1,2} \w+ \d{4})/    // DD Month YYYY
  ];
  
  for (const pattern of patterns) {
    const match = dateText.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  
  return null;
} 