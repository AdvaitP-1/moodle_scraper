# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-23

### Added
- Initial release of Moodle Scraper
- TypeScript-first design with full type safety
- Comprehensive data extraction for assignments, grades, files, and Zybook integrations
- Multi-strategy authentication with fallback mechanisms
- Session management and validation
- Production-ready error handling
- Clean API design with both simple and advanced usage patterns
- Comprehensive documentation and examples
- Inspection tool for site-specific customization
- Support for various Moodle configurations and HTML structures

### Features
- **MoodleScraper Class**: Main scraper with full control
- **scrapeMoodle Function**: Simple one-line usage
- **MoodleAuth**: Advanced authentication handling
- **MoodleApi**: API interaction utilities
- **Extractors**: Customizable data extraction functions
- **TypeScript Support**: Full type definitions included
- **Error Recovery**: Graceful handling of missing elements
- **Multi-Course Support**: Discover and scrape multiple courses
- **Session Persistence**: Efficient authentication management

### Technical Details
- Built with Puppeteer for reliable browser automation
- Comprehensive error handling and fallback strategies
- Multiple CSS selector strategies for robustness
- Support for CSRF tokens and various login mechanisms
- Metadata extraction including due dates, submission status, file types
- Calendar integration for assignment discovery
- LTI and external tool integration support 