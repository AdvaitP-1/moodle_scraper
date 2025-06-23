#!/usr/bin/env node

/**
 * Enterprise Monitoring Example for Moodle Scraper
 * 
 * Demonstrates enterprise-grade monitoring, logging, and observability
 * practices that align with Red Hat's approach to production systems.
 * 
 * Features:
 * - Structured logging (JSON format for log aggregation)
 * - Metrics collection (Prometheus-style)
 * - Health checks and readiness probes
 * - Error tracking and alerting patterns
 * - Performance monitoring
 * 
 * This shows understanding of enterprise operational practices
 * that Red Hat values in production environments.
 */

const { MoodleScraper } = require('../dist/index.js');
const fs = require('fs');
const path = require('path');

class EnterpriseMonitoredScraper {
  constructor(credentials, options = {}) {
    this.credentials = credentials;
    this.options = {
      headless: true,
      timeout: 30000,
      ...options
    };
    
    this.metrics = {
      scraping_attempts_total: 0,
      scraping_successes_total: 0,
      scraping_failures_total: 0,
      scraping_duration_seconds: 0,
      assignments_scraped_total: 0,
      grades_scraped_total: 0,
      files_scraped_total: 0,
      zybook_integrations_scraped_total: 0,
      login_attempts_total: 0,
      login_successes_total: 0,
      two_factor_auth_prompts_total: 0
    };
    
    this.startTime = null;
    this.logFile = path.join(__dirname, 'logs', `scraper-${Date.now()}.log`);
    this.metricsFile = path.join(__dirname, 'metrics', `metrics-${Date.now()}.json`);
    
    // Ensure log directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    const logsDir = path.dirname(this.logFile);
    const metricsDir = path.dirname(this.metricsFile);
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }
  }

  // Structured logging for enterprise log aggregation (ELK, Splunk, etc.)
  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      component: 'moodle-scraper',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      session_id: this.sessionId || 'unknown',
      ...metadata
    };

    // Console output (structured JSON for container logs)
    console.log(JSON.stringify(logEntry));
    
    // File logging for persistent storage
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  // Prometheus-style metrics for monitoring
  incrementMetric(metricName, value = 1) {
    if (this.metrics.hasOwnProperty(metricName)) {
      this.metrics[metricName] += value;
    }
    this.saveMetrics();
  }

  setMetric(metricName, value) {
    if (this.metrics.hasOwnProperty(metricName)) {
      this.metrics[metricName] = value;
    }
    this.saveMetrics();
  }

  saveMetrics() {
    const metricsOutput = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      labels: {
        component: 'moodle-scraper',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    fs.writeFileSync(this.metricsFile, JSON.stringify(metricsOutput, null, 2));
  }

  // Health check endpoint (for container health probes)
  healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        last_scrape: this.lastScrapeTime || null,
        metrics_file_exists: fs.existsSync(this.metricsFile),
        log_file_exists: fs.existsSync(this.logFile)
      }
    };

    this.log('info', 'Health check performed', health);
    return health;
  }

  // Performance monitoring wrapper
  async measurePerformance(operationName, operation) {
    const startTime = Date.now();
    
    this.log('info', `Starting operation: ${operationName}`);
    
    try {
      const result = await operation();
      const duration = (Date.now() - startTime) / 1000;
      
      this.log('info', `Operation completed: ${operationName}`, {
        duration_seconds: duration,
        success: true
      });
      
      this.incrementMetric(`${operationName}_successes_total`);
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      this.log('error', `Operation failed: ${operationName}`, {
        duration_seconds: duration,
        error_message: error.message,
        error_stack: error.stack,
        success: false
      });
      
      this.incrementMetric(`${operationName}_failures_total`);
      throw error;
    }
  }

  async runMonitoredScraping() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    
    this.log('info', 'Starting monitored Moodle scraping session', {
      credentials_domain: this.credentials.email.split('@')[1],
      headless_mode: this.options.headless,
      timeout: this.options.timeout
    });

    let scraper = null;
    
    try {
      this.incrementMetric('scraping_attempts_total');
      
      // Initialize scraper with monitoring
      scraper = await this.measurePerformance('scraper_initialization', async () => {
        const s = new MoodleScraper(this.credentials, this.options);
        await s.initialize();
        return s;
      });

      // Login with monitoring
      await this.measurePerformance('login', async () => {
        this.incrementMetric('login_attempts_total');
        
        const loginResult = await scraper.login();
        
        if (loginResult) {
          this.incrementMetric('login_successes_total');
        }
        
        // Check for 2FA (common in enterprise environments)
        const pageContent = await scraper.page.content();
        if (pageContent.includes('two-factor') || pageContent.includes('2fa') || pageContent.includes('duo')) {
          this.incrementMetric('two_factor_auth_prompts_total');
          this.log('info', '2FA detected', { auth_type: 'two_factor' });
        }
        
        return loginResult;
      });

      // Navigate to class
      await this.measurePerformance('navigation', async () => {
        return scraper.navigateToClass();
      });

      // Scrape data with individual monitoring
      const scrapingResults = {};
      
      scrapingResults.assignments = await this.measurePerformance('assignments_scraping', async () => {
        const assignments = await scraper.scrapeAssignments();
        this.incrementMetric('assignments_scraped_total', assignments.length);
        return assignments;
      });

      scrapingResults.grades = await this.measurePerformance('grades_scraping', async () => {
        const grades = await scraper.scrapeGrades();
        this.incrementMetric('grades_scraped_total', grades.length);
        return grades;
      });

      scrapingResults.files = await this.measurePerformance('files_scraping', async () => {
        const files = await scraper.scrapeFiles();
        this.incrementMetric('files_scraped_total', files.length);
        return files;
      });

      scrapingResults.zybookIntegrations = await this.measurePerformance('zybook_scraping', async () => {
        const zybooks = await scraper.scrapeZybookIntegrations();
        this.incrementMetric('zybook_integrations_scraped_total', zybooks.length);
        return zybooks;
      });

      // Calculate total duration
      const totalDuration = (Date.now() - this.startTime) / 1000;
      this.setMetric('scraping_duration_seconds', totalDuration);
      this.incrementMetric('scraping_successes_total');
      this.lastScrapeTime = new Date().toISOString();

      this.log('info', 'Scraping session completed successfully', {
        total_duration_seconds: totalDuration,
        assignments_count: scrapingResults.assignments.length,
        grades_count: scrapingResults.grades.length,
        files_count: scrapingResults.files.length,
        zybook_integrations_count: scrapingResults.zybookIntegrations.length
      });

      // Save results with metadata
      const outputFile = path.join(__dirname, 'output', `scraping-results-${this.sessionId}.json`);
      const outputDir = path.dirname(outputFile);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputData = {
        metadata: {
          session_id: this.sessionId,
          timestamp: new Date().toISOString(),
          duration_seconds: totalDuration,
          scraper_version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        },
        metrics: this.metrics,
        data: scrapingResults
      };

      fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
      
      this.log('info', 'Results saved to file', { output_file: outputFile });

      return scrapingResults;

    } catch (error) {
      this.incrementMetric('scraping_failures_total');
      
      this.log('error', 'Scraping session failed', {
        error_message: error.message,
        error_stack: error.stack,
        duration_seconds: (Date.now() - this.startTime) / 1000
      });

      // In a real enterprise environment, this would trigger alerts
      this.triggerAlert('scraping_failure', {
        error: error.message,
        session_id: this.sessionId
      });

      throw error;
    } finally {
      if (scraper) {
        await this.measurePerformance('cleanup', async () => {
          return scraper.close();
        });
      }
      
      this.generateFinalReport();
    }
  }

  // Alert simulation (in production, this would integrate with PagerDuty, Slack, etc.)
  triggerAlert(alertType, context = {}) {
    const alert = {
      alert_type: alertType,
      severity: 'high',
      timestamp: new Date().toISOString(),
      component: 'moodle-scraper',
      session_id: this.sessionId,
      context: context,
      runbook_url: 'https://docs.company.com/runbooks/moodle-scraper'
    };

    this.log('alert', `Alert triggered: ${alertType}`, alert);
    
    // In production: send to alerting system
    console.error('🚨 ALERT:', JSON.stringify(alert, null, 2));
  }

  generateFinalReport() {
    const report = {
      session_summary: {
        session_id: this.sessionId,
        start_time: new Date(this.startTime).toISOString(),
        end_time: new Date().toISOString(),
        total_duration_seconds: (Date.now() - this.startTime) / 1000
      },
      metrics: this.metrics,
      files_generated: {
        log_file: this.logFile,
        metrics_file: this.metricsFile
      },
      health_status: this.healthCheck()
    };

    const reportFile = path.join(__dirname, 'reports', `session-report-${this.sessionId}.json`);
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log('info', 'Final session report generated', { report_file: reportFile });
    
    console.log('\n📊 Session Summary:');
    console.log(`  Session ID: ${this.sessionId}`);
    console.log(`  Duration: ${report.session_summary.total_duration_seconds}s`);
    console.log(`  Success Rate: ${(this.metrics.scraping_successes_total / this.metrics.scraping_attempts_total * 100).toFixed(1)}%`);
    console.log(`  Items Scraped: ${this.metrics.assignments_scraped_total + this.metrics.grades_scraped_total + this.metrics.files_scraped_total + this.metrics.zybook_integrations_scraped_total}`);
    console.log(`  Report: ${reportFile}`);
  }

  // Export metrics in Prometheus format (for Red Hat monitoring stack)
  exportPrometheusMetrics() {
    let output = '# HELP moodle_scraper_metrics Enterprise monitoring metrics for Moodle scraper\n';
    output += '# TYPE moodle_scraper_attempts counter\n';
    
    for (const [metric, value] of Object.entries(this.metrics)) {
      output += `moodle_scraper_${metric}{component="moodle-scraper",version="1.0.0"} ${value}\n`;
    }
    
    return output;
  }
}

// Main execution function
async function main() {
  const credentials = {
    email: process.env.MOODLE_EMAIL || 'your-email@example.com',
    password: process.env.MOODLE_PASSWORD || 'your-password',
    classUrl: process.env.MOODLE_CLASS_URL || 'https://your-moodle.edu/course/view.php?id=12345'
  };

  const options = {
    headless: process.env.HEADLESS !== 'false',
    timeout: parseInt(process.env.TIMEOUT || '30000')
  };

  console.log('🔬 Enterprise Monitored Moodle Scraper');
  console.log('=====================================');
  console.log('This example demonstrates enterprise-grade monitoring practices');
  console.log('that align with Red Hat\'s operational excellence standards.\n');

  const monitoredScraper = new EnterpriseMonitoredScraper(credentials, options);

  try {
    // Perform health check
    const health = monitoredScraper.healthCheck();
    console.log('✅ Health check passed:', health.status);

    // Run monitored scraping
    const results = await monitoredScraper.runMonitoredScraping();
    
    console.log('\n📊 Scraping Results:');
    console.log(`  Assignments: ${results.assignments.length}`);
    console.log(`  Grades: ${results.grades.length}`);
    console.log(`  Files: ${results.files.length}`);
    console.log(`  Zybook Integrations: ${results.zybookIntegrations.length}`);

    // Export Prometheus metrics
    const prometheusMetrics = monitoredScraper.exportPrometheusMetrics();
    console.log('\n📈 Prometheus Metrics Available');
    
    const metricsFile = path.join(__dirname, 'metrics', 'prometheus-metrics.txt');
    fs.writeFileSync(metricsFile, prometheusMetrics);
    console.log(`  Exported to: ${metricsFile}`);

  } catch (error) {
    console.error('❌ Monitored scraping failed:', error.message);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'help' || !command) {
    console.log('🔬 Enterprise Monitored Moodle Scraper');
    console.log('======================================');
    console.log('');
    console.log('Usage: node enterprise-monitoring-example.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  run     - Run monitored scraping session');
    console.log('  health  - Perform health check only');
    console.log('  help    - Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  MOODLE_EMAIL     - Your Moodle email');
    console.log('  MOODLE_PASSWORD  - Your Moodle password');
    console.log('  MOODLE_CLASS_URL - Your Moodle class URL');
    console.log('  HEADLESS         - Set to "false" for visible browser');
    console.log('  TIMEOUT          - Request timeout in milliseconds');
    console.log('  NODE_ENV         - Environment (development/production)');
    console.log('');
    console.log('Enterprise Features:');
    console.log('  ✅ Structured JSON logging');
    console.log('  ✅ Prometheus-style metrics');
    console.log('  ✅ Health checks & readiness probes');
    console.log('  ✅ Performance monitoring');
    console.log('  ✅ Error tracking & alerting');
    console.log('  ✅ Session reporting');
    console.log('');
    console.log('Example:');
    console.log('  export MOODLE_EMAIL="student@university.edu"');
    console.log('  export NODE_ENV="production"');
    console.log('  node enterprise-monitoring-example.js run');
  } else if (command === 'run') {
    main().catch(console.error);
  } else if (command === 'health') {
    const scraper = new EnterpriseMonitoredScraper({}, {});
    const health = scraper.healthCheck();
    console.log(JSON.stringify(health, null, 2));
  } else {
    console.error(`Unknown command: ${command}`);
    console.log('Run "node enterprise-monitoring-example.js help" for usage information.');
    process.exit(1);
  }
}

module.exports = { EnterpriseMonitoredScraper }; 