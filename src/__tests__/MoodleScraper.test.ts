import { MoodleScraper } from '../scraper/MoodleScraper';
import { MoodleCredentials } from '../types';

// Mock Puppeteer to control browser behavior
jest.mock('puppeteer', () => ({
  default: {
    launch: jest.fn(),
  },
}));

describe('MoodleScraper Edge Cases', () => {
  let mockCredentials: MoodleCredentials;
  let mockPage: any;
  let mockBrowser: any;

  beforeEach(() => {
    mockCredentials = {
      email: 'test@example.com',
      password: 'testpassword',
      classUrl: 'https://test-moodle.com/course/view.php?id=123'
    };

    mockPage = {
      goto: jest.fn(),
      setViewport: jest.fn(),
      setDefaultTimeout: jest.fn(),
      url: jest.fn(),
      $: jest.fn(),
      $$: jest.fn(),
      type: jest.fn(),
      click: jest.fn(),
      waitForNavigation: jest.fn(),
      waitForSelector: jest.fn(),
      waitForTimeout: jest.fn(),
      content: jest.fn(),
      evaluate: jest.fn(),
      getProperty: jest.fn(),
      cookies: jest.fn(),
      setCookie: jest.fn(),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    const puppeteer = require('puppeteer');
    puppeteer.default.launch.mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Edge Cases', () => {
    it('should handle invalid credentials gracefully', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      
      // Mock login failure
      mockPage.content.mockResolvedValue('<div class="error">Invalid login</div>');
      mockPage.$.mockImplementation((selector: string) => {
        if (selector.includes('username')) return Promise.resolve(mockPage);
        if (selector.includes('password')) return Promise.resolve(mockPage);
        if (selector.includes('submit')) return Promise.resolve(mockPage);
        return Promise.resolve(null);
      });

      await expect(scraper.login()).rejects.toThrow('Login failed: Invalid credentials');
    });

    it('should handle network timeouts during login', async () => {
      const scraper = new MoodleScraper(mockCredentials, { timeout: 100 });
      
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      await expect(scraper.login()).rejects.toThrow('Authentication failed');
    });

    it('should handle missing login form elements', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      
      // Mock missing login form
      mockPage.$.mockResolvedValue(null);

      await expect(scraper.login()).rejects.toThrow('Could not find login form elements');
    });

    it('should handle CSRF token extraction failure', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      
      mockPage.$.mockImplementation((selector: string) => {
        if (selector.includes('username') || selector.includes('password') || selector.includes('submit')) {
          return Promise.resolve(mockPage);
        }
        return Promise.resolve(null);
      });

      // Should not throw even without CSRF token
      mockPage.content.mockResolvedValue('<div>Dashboard</div>');
      await expect(scraper.login()).resolves.toBe(true);
    });
  });

  describe('Data Extraction Edge Cases', () => {
    it('should handle pages with no assignments', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      mockPage.$$.mockResolvedValue([]); // No assignments found
      
      const assignments = await scraper.scrapeAssignments();
      expect(assignments).toEqual([]);
    });

    it('should handle malformed assignment data', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      const mockElement = {
        evaluate: jest.fn().mockResolvedValue({
          id: null,
          title: '',
          url: 'invalid-url',
          dueDate: 'invalid-date',
          submissionStatus: 'unknown-status',
          description: null,
          maxGrade: NaN,
          currentGrade: undefined
        })
      };

      mockPage.$$.mockResolvedValue([mockElement]);
      
      const assignments = await scraper.scrapeAssignments();
      expect(assignments).toHaveLength(1);
      expect(assignments[0].dueDate).toBeNull();
      expect(assignments[0].submissionStatus).toBe('not_submitted');
    });

    it('should handle corrupted DOM elements', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      const mockElement = {
        evaluate: jest.fn().mockRejectedValue(new Error('Element not attached to DOM'))
      };

      mockPage.$$.mockResolvedValue([mockElement]);
      
      const assignments = await scraper.scrapeAssignments();
      expect(assignments).toEqual([]); // Should return empty array, not throw
    });

    it('should handle various date formats in assignments', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      const dateFormats = [
        'December 25, 2025',
        '12/25/2025',
        '2025-12-25',
        '25 Dec 2025',
        'invalid date',
        '',
        null
      ];

      const mockElements = dateFormats.map(dateStr => ({
        evaluate: jest.fn().mockResolvedValue({
          id: '1',
          title: 'Test Assignment',
          url: 'https://test.com',
          dueDate: dateStr,
          submissionStatus: 'not_submitted',
          description: '',
          maxGrade: 100,
          currentGrade: null
        })
      }));

      mockPage.$$.mockResolvedValue(mockElements);
      
      const assignments = await scraper.scrapeAssignments();
      
      // Should handle all formats gracefully
      expect(assignments).toHaveLength(dateFormats.length);
      assignments.forEach(assignment => {
        expect(assignment).toHaveProperty('dueDate');
      });
    });
  });

  describe('Grade Processing Edge Cases', () => {
    it('should handle non-numeric grades', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      const mockElement = {
        evaluate: jest.fn().mockResolvedValue({
          itemName: 'Test Grade',
          grade: 'A+',
          maxGrade: 'Pass/Fail',
          percentage: null,
          feedback: null,
          dateModified: null
        })
      };

      mockPage.$$.mockResolvedValue([mockElement]);
      
      const grades = await scraper.scrapeGrades();
      expect(grades).toHaveLength(1);
      expect(grades[0].grade).toBe('A+');
    });

    it('should handle missing gradebook access', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      mockPage.goto.mockRejectedValue(new Error('Access denied'));
      mockPage.$.mockResolvedValue(null); // No grades link found
      
      const grades = await scraper.scrapeGrades();
      expect(grades).toEqual([]);
    });
  });

  describe('File Processing Edge Cases', () => {
    it('should handle files without proper extensions', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      const mockElement = {
        evaluate: jest.fn().mockResolvedValue({
          name: 'Document without extension',
          url: 'https://test.com/file',
          size: 'Unknown',
          type: '',
          downloadUrl: 'https://test.com/file'
        })
      };

      mockPage.$$.mockResolvedValue([mockElement]);
      
      const files = await scraper.scrapeFiles();
      expect(files).toHaveLength(1);
      expect(files[0].type).toBe('unknown');
    });

    it('should handle large file listings', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      // Create 1000 mock file elements
      const mockElements = Array.from({ length: 1000 }, (_, i) => ({
        evaluate: jest.fn().mockResolvedValue({
          name: `File ${i}`,
          url: `https://test.com/file${i}`,
          size: '1MB',
          type: 'pdf',
          downloadUrl: `https://test.com/file${i}`
        })
      }));

      mockPage.$$.mockResolvedValue(mockElements);
      
      const files = await scraper.scrapeFiles();
      expect(files).toHaveLength(1000);
    });
  });

  describe('Browser and Network Edge Cases', () => {
    it('should handle browser crashes gracefully', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      
      mockBrowser.close.mockRejectedValue(new Error('Browser crashed'));
      
      await scraper.initialize();
      await expect(scraper.close()).resolves.not.toThrow();
    });

    it('should handle slow page loads', async () => {
      const scraper = new MoodleScraper(mockCredentials, { timeout: 1000 });
      
      mockPage.goto.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(scraper.navigateToClass()).rejects.toThrow();
    });

    it('should handle connection interruptions', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      mockPage.goto.mockRejectedValue(new Error('net::ERR_INTERNET_DISCONNECTED'));
      
      await expect(scraper.navigateToClass()).rejects.toThrow();
    });
  });

  describe('Session Management Edge Cases', () => {
    it('should detect session expiration', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      // Mock session expired - redirected back to login
      mockPage.url.mockReturnValue('https://test.com/login');
      mockPage.$.mockImplementation((selector: string) => {
        if (selector.includes('username') || selector.includes('password')) {
          return Promise.resolve(mockPage);
        }
        return Promise.resolve(null);
      });

      const isValid = await scraper.isSessionValid();
      expect(isValid).toBe(false);
    });

    it('should handle cookie corruption', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      mockPage.cookies.mockRejectedValue(new Error('Failed to read cookies'));
      
      // Should not throw, should handle gracefully
      await expect(scraper.isSessionValid()).resolves.toBe(false);
    });
  });

  describe('URL and Navigation Edge Cases', () => {
    it('should handle invalid class URLs', async () => {
      const invalidCredentials = {
        ...mockCredentials,
        classUrl: 'not-a-valid-url'
      };
      
      const scraper = new MoodleScraper(invalidCredentials);
      await scraper.initialize();
      
      mockPage.goto.mockRejectedValue(new Error('Invalid URL'));
      
      await expect(scraper.navigateToClass()).rejects.toThrow();
    });

    it('should handle URLs with missing course IDs', async () => {
      const invalidCredentials = {
        ...mockCredentials,
        classUrl: 'https://test.com/course/view.php'
      };
      
      const scraper = new MoodleScraper(invalidCredentials);
      await scraper.initialize();
      
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
      
      await expect(scraper.navigateToClass()).rejects.toThrow('Could not access class page');
    });

    it('should handle redirects to maintenance pages', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      mockPage.content.mockResolvedValue('<h1>Site under maintenance</h1>');
      mockPage.waitForSelector.mockRejectedValue(new Error('Element not found'));
      
      await expect(scraper.navigateToClass()).rejects.toThrow();
    });
  });

  describe('Data Consistency Edge Cases', () => {
    it('should handle assignment data with missing required fields', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      const mockElement = {
        evaluate: jest.fn().mockResolvedValue({
          // Missing id, title, url - should use defaults
          submissionStatus: 'submitted',
          maxGrade: 100
        })
      };

      mockPage.$$.mockResolvedValue([mockElement]);
      
      const assignments = await scraper.scrapeAssignments();
      expect(assignments).toHaveLength(1);
      expect(assignments[0]).toHaveProperty('id');
      expect(assignments[0]).toHaveProperty('title');
      expect(assignments[0]).toHaveProperty('url');
    });

    it('should handle extremely long text content', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
      const longText = 'A'.repeat(10000);
      
      const mockElement = {
        evaluate: jest.fn().mockResolvedValue({
          id: '1',
          title: longText,
          description: longText,
          url: 'https://test.com',
          dueDate: null,
          submissionStatus: 'not_submitted',
          maxGrade: 100,
          currentGrade: null
        })
      };

      mockPage.$$.mockResolvedValue([mockElement]);
      
      const assignments = await scraper.scrapeAssignments();
      expect(assignments).toHaveLength(1);
      expect(assignments[0].title).toBe(longText);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle memory constraints with large datasets', async () => {
      const scraper = new MoodleScraper(mockCredentials);
      await scraper.initialize();
      
             // Simulate memory pressure
       const originalMemoryUsage = process.memoryUsage;
       process.memoryUsage = jest.fn().mockReturnValue({
         rss: 1024 * 1024 * 1024, // 1GB
         heapTotal: 512 * 1024 * 1024,
         heapUsed: 500 * 1024 * 1024,
         external: 100 * 1024 * 1024,
         arrayBuffers: 50 * 1024 * 1024
       }) as any;
      
      try {
        const data = await scraper.scrapeAll();
        expect(data).toBeDefined();
      } finally {
        process.memoryUsage = originalMemoryUsage;
      }
    });
  });
}); 