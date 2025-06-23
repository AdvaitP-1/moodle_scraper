// Main exports
export { MoodleScraper } from './scraper/MoodleScraper';
export { MoodleAuth } from './scraper/MoodleAuth';
export * from './scraper/extractors';

// Type exports
export * from './types';

// Utility exports
export { MoodleApi } from './utils/MoodleApi';

// Convenience function for basic scraping
import { MoodleScraper } from './scraper/MoodleScraper';
import { MoodleCredentials, ScraperOptions, ScrapedData } from './types';

export async function scrapeMoodle(
  credentials: MoodleCredentials,
  options?: ScraperOptions
): Promise<ScrapedData> {
  const scraper = new MoodleScraper(credentials, options);
  
  try {
    await scraper.initialize();
    await scraper.login();
    return await scraper.scrapeAll();
  } finally {
    await scraper.close();
  }
}



// Default export
export default MoodleScraper; 