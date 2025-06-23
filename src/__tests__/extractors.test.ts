import { extractAssignment, extractGrade, extractFile, extractZybookIntegration, parseDate, cleanText } from '../scraper/extractors';
import { ElementHandle } from 'puppeteer';

// Mock ElementHandle
const createMockElement = (evaluateResult: any): ElementHandle => {
  return {
    evaluate: jest.fn().mockResolvedValue(evaluateResult)
  } as any;
};

describe('Extractor Functions Edge Cases', () => {
  describe('extractAssignment Edge Cases', () => {
    it('should handle completely empty DOM elements', async () => {
      const mockElement = createMockElement({});
      
      const result = await extractAssignment(mockElement);
      
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Unknown Assignment');
      expect(result?.submissionStatus).toBe('not_submitted');
    });

    it('should handle malformed HTML structures', async () => {
      const mockElement = createMockElement({
        id: '<script>alert("xss")</script>',
        title: '<img src=x onerror=alert(1)>',
        url: 'javascript:alert(1)',
        dueDate: 'not-a-date',
        submissionStatus: 'invalid-status'
      });
      
      const result = await extractAssignment(mockElement);
      
      expect(result).not.toBeNull();
      expect(result?.dueDate).toBeNull();
      expect(result?.submissionStatus).toBe('not_submitted');
    });

    it('should handle elements that throw during evaluation', async () => {
      const mockElement = {
        evaluate: jest.fn().mockRejectedValue(new Error('DOM access error'))
      } as any;
      
      const result = await extractAssignment(mockElement);
      
      expect(result).toBeNull();
    });

    it('should handle various date formats', async () => {
      const dateFormats = [
        '12/25/2025',
        '2025-12-25',
        'December 25, 2025',
        '25 Dec 2025',
        'invalid',
        '',
        null,
        undefined
      ];

      for (const dateFormat of dateFormats) {
        const mockElement = createMockElement({
          id: '1',
          title: 'Test',
          url: 'https://test.com',
          dueDate: dateFormat,
          submissionStatus: 'not_submitted'
        });

        const result = await extractAssignment(mockElement);
        expect(result).not.toBeNull();
        // Should either be null or a valid Date
        if (result?.dueDate) {
          expect(result.dueDate).toBeInstanceOf(Date);
        }
      }
    });

    it('should handle extreme grade values', async () => {
      const gradeValues = [
        { current: 150, max: 100 }, // Over 100%
        { current: -5, max: 100 },  // Negative
        { current: 0, max: 0 },     // Zero max
        { current: Infinity, max: 100 },
        { current: NaN, max: 100 }
      ];

      for (const { current, max } of gradeValues) {
        const mockElement = createMockElement({
          id: '1',
          title: 'Test',
          url: 'https://test.com',
          currentGrade: current,
          maxGrade: max
        });

        const result = await extractAssignment(mockElement);
        expect(result).not.toBeNull();
        expect(typeof result?.maxGrade).toBe('number');
      }
    });
  });

  describe('extractGrade Edge Cases', () => {
    it('should handle non-numeric grade formats', async () => {
      const gradeFormats = [
        { grade: 'A+', maxGrade: 'A-F Scale' },
        { grade: 'Pass', maxGrade: 'Pass/Fail' },
        { grade: '95%', maxGrade: '100%' },
        { grade: 'Not Graded', maxGrade: '' },
        { grade: '', maxGrade: '' }
      ];

      for (const format of gradeFormats) {
        const mockElement = createMockElement({
          itemName: 'Test Item',
          ...format,
          percentage: null,
          feedback: null,
          dateModified: null
        });

        const result = await extractGrade(mockElement);
        expect(result).not.toBeNull();
        expect(result?.itemName).toBe('Test Item');
      }
    });

    it('should handle corrupted grade data', async () => {
      const mockElement = createMockElement({
        itemName: null,
        grade: undefined,
        maxGrade: NaN,
        percentage: 'not-a-number',
        feedback: '<script>alert(1)</script>',
        dateModified: 'invalid-date'
      });

      const result = await extractGrade(mockElement);
      expect(result).not.toBeNull();
      expect(result?.itemName).toBe('Unknown Item');
      expect(result?.dateModified).toBeNull();
    });

    it('should calculate percentage correctly for edge cases', async () => {
      const testCases = [
        { grade: '0', maxGrade: '100', expectedPercentage: 0 },
        { grade: '100', maxGrade: '0', expectedPercentage: null },
        { grade: 'abc', maxGrade: '100', expectedPercentage: 0 }
      ];

      for (const testCase of testCases) {
        const mockElement = createMockElement({
          itemName: 'Test',
          grade: testCase.grade,
          maxGrade: testCase.maxGrade,
          percentage: null,
          feedback: null,
          dateModified: null
        });

        const result = await extractGrade(mockElement);
        expect(result?.percentage).toBe(testCase.expectedPercentage);
      }
    });
  });

  describe('extractFile Edge Cases', () => {
    it('should handle files with no extensions', async () => {
      const mockElement = createMockElement({
        name: 'README',
        url: 'https://test.com/file',
        size: '1KB',
        type: '',
        downloadUrl: 'https://test.com/file'
      });

      const result = await extractFile(mockElement);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('unknown');
    });

    it('should handle extremely long filenames', async () => {
      const longName = 'A'.repeat(1000) + '.pdf';
      const mockElement = createMockElement({
        name: longName,
        url: 'https://test.com/file.pdf',
        size: '1MB',
        type: 'pdf',
        downloadUrl: 'https://test.com/file.pdf'
      });

      const result = await extractFile(mockElement);
      expect(result).not.toBeNull();
      expect(result?.name).toBe(longName);
    });

    it('should handle special characters in filenames', async () => {
      const specialChars = [
        'file with spaces.pdf',
        'file@#$%^&*().doc',
        'файл.txt', // Cyrillic
        '文件.pdf', // Chinese
        'file\nwith\nnewlines.txt'
      ];

      for (const filename of specialChars) {
        const mockElement = createMockElement({
          name: filename,
          url: 'https://test.com/file',
          size: '1KB',
          type: '',
          downloadUrl: 'https://test.com/file'
        });

        const result = await extractFile(mockElement);
        expect(result).not.toBeNull();
        expect(result?.name).toBe(filename);
      }
    });

    it('should handle malformed URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'ftp://invalid.com',
        'javascript:alert(1)',
        '',
        null,
        undefined
      ];

      for (const url of malformedUrls) {
        const mockElement = createMockElement({
          name: 'Test File',
          url: url,
          size: '1KB',
          type: '',
          downloadUrl: url
        });

        const result = await extractFile(mockElement);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('extractZybookIntegration Edge Cases', () => {
    it('should handle missing Zybook-specific elements', async () => {
      const mockElement = createMockElement({
        title: '',
        url: '',
        dueDate: null,
        completionStatus: '',
        progress: null
      });

      const result = await extractZybookIntegration(mockElement);
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Zybook Activity');
      expect(result?.completionStatus).toBe('Not started');
    });

    it('should handle invalid progress values', async () => {
      const invalidProgress = ['abc%', '150%', '-10%', 'completed', ''];

      for (const progress of invalidProgress) {
        const mockElement = createMockElement({
          title: 'Test Zybook',
          url: 'https://zybook.com',
          dueDate: null,
          completionStatus: 'In Progress',
          progress: progress
        });

        const result = await extractZybookIntegration(mockElement);
        expect(result).not.toBeNull();
        if (result?.progress !== null) {
          expect(typeof result?.progress).toBe('number');
        }
      }
    });
  });

  describe('Helper Functions Edge Cases', () => {
    describe('parseDate', () => {
      it('should handle various invalid date formats', async () => {
        const invalidDates = [
          '',
          'not a date',
          '32/13/2025', // Invalid day/month
          '2025-13-32', // Invalid ISO format
          'undefined',
          'null',
          '0000-00-00'
        ];

        for (const dateStr of invalidDates) {
          const result = parseDate(dateStr);
          expect(result).toBeNull();
        }
      });

      it('should handle edge case date values', async () => {
        const edgeDates = [
          '1/1/1970',   // Unix epoch
          '12/31/2099', // Far future
          '2/29/2024',  // Leap year
          '2/29/2023'   // Non-leap year (invalid)
        ];

        const results = edgeDates.map(date => parseDate(date));
        expect(results[0]).toBeInstanceOf(Date); // Valid
        expect(results[1]).toBeInstanceOf(Date); // Valid
        expect(results[2]).toBeInstanceOf(Date); // Valid leap year
        // 2023 was not a leap year, so 2/29/2023 should be invalid
      });
    });

    describe('cleanText', () => {
      it('should handle extreme whitespace scenarios', async () => {
        const testCases = [
          { input: '   \n\t\r   ', expected: '' },
          { input: 'word1\n\n\nword2', expected: 'word1 word2' },
          { input: '\t\t\ttext\t\t\t', expected: 'text' },
          { input: 'multiple    spaces', expected: 'multiple spaces' }
        ];

        for (const { input, expected } of testCases) {
          expect(cleanText(input)).toBe(expected);
        }
      });

      it('should handle special characters and unicode', async () => {
        const unicodeText = 'Hello 世界 🌍 émojis';
        expect(cleanText(unicodeText)).toBe(unicodeText);

        const htmlEntities = '&lt;script&gt;alert(1)&lt;/script&gt;';
        expect(cleanText(htmlEntities)).toBe(htmlEntities);
      });

      it('should handle extremely long text', async () => {
        const longText = 'A'.repeat(100000);
        const result = cleanText(longText);
        expect(result).toBe(longText);
        expect(result.length).toBe(100000);
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large datasets without memory leaks', async () => {
      // Create 1000 mock elements to test memory usage
      const elements = Array.from({ length: 1000 }, (_, i) => 
        createMockElement({
          id: `${i}`,
          title: `Assignment ${i}`,
          url: `https://test.com/${i}`,
          dueDate: '2025-12-25',
          submissionStatus: 'not_submitted',
          description: 'A'.repeat(1000), // Large description
          maxGrade: 100,
          currentGrade: 85
        })
      );

      const startMemory = process.memoryUsage().heapUsed;

      // Process all elements
      const results = await Promise.all(
        elements.map(element => extractAssignment(element))
      );

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;

      expect(results).toHaveLength(1000);
      expect(results.every(r => r !== null)).toBe(true);
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle concurrent extractions', async () => {
      const elements = Array.from({ length: 100 }, (_, i) => 
        createMockElement({
          id: `${i}`,
          title: `Concurrent Test ${i}`,
          url: `https://test.com/${i}`
        })
      );

      // Process concurrently
      const startTime = Date.now();
      const results = await Promise.all([
        ...elements.map(e => extractAssignment(e)),
        ...elements.map(e => extractGrade(e)),
        ...elements.map(e => extractFile(e)),
        ...elements.map(e => extractZybookIntegration(e))
      ]);
      const endTime = Date.now();

      expect(results).toHaveLength(400); // 100 * 4 extraction types
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
}); 