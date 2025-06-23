#!/usr/bin/env node

/**
 * Podman Container Example for Moodle Scraper
 * 
 * This example demonstrates how to:
 * 1. Build and run the Moodle scraper using Podman
 * 2. Use Red Hat Universal Base Image (UBI) for enterprise security
 * 3. Run containerized scraping with proper security practices
 * 
 * Prerequisites:
 * - Podman installed (https://podman.io/getting-started/installation)
 * - This package built and ready
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Example configuration
const config = {
  // Container settings
  containerName: 'moodle-scraper',
  imageTag: 'moodle-scraper:latest',
  
  // Moodle credentials (use environment variables in production)
  moodleConfig: {
    email: process.env.MOODLE_EMAIL || 'your-email@example.com',
    password: process.env.MOODLE_PASSWORD || 'your-password',
    classUrl: process.env.MOODLE_CLASS_URL || 'https://your-moodle.edu/course/view.php?id=12345'
  }
};

class PodmanMoodleScraper {
  constructor() {
    this.checkPodmanInstalled();
  }

  checkPodmanInstalled() {
    try {
      execSync('podman --version', { stdio: 'pipe' });
      console.log('✅ Podman is installed and ready');
    } catch (error) {
      console.error('❌ Podman is not installed. Please install from https://podman.io/getting-started/installation');
      process.exit(1);
    }
  }

  buildContainer() {
    console.log('🔨 Building container with Red Hat UBI...');
    
    try {
      // Build using Podman with UBI base image
      const buildCommand = `podman build -t ${config.imageTag} .`;
      console.log(`Running: ${buildCommand}`);
      
      execSync(buildCommand, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log('✅ Container built successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to build container:', error.message);
      return false;
    }
  }

  runScrapingContainer() {
    console.log('🚀 Running Moodle scraper in container...');
    
    try {
      // Create a temporary directory for output
      const outputDir = path.join(__dirname, 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Run container with proper security settings
      const runCommand = [
        'podman', 'run',
        '--rm',  // Remove container after use
        '--name', config.containerName,
        
        // Security settings (rootless by default in Podman)
        '--security-opt', 'no-new-privileges',
        '--cap-drop', 'ALL',
        '--read-only',  // Read-only filesystem
        '--tmpfs', '/tmp',  // Writable temp directory
        
        // Environment variables for credentials
        '-e', `MOODLE_EMAIL=${config.moodleConfig.email}`,
        '-e', `MOODLE_PASSWORD=${config.moodleConfig.password}`,
        '-e', `MOODLE_CLASS_URL=${config.moodleConfig.classUrl}`,
        
        // Mount output directory
        '-v', `${outputDir}:/app/output:Z`,  // :Z for SELinux contexts
        
        // Resource limits
        '--memory', '1g',
        '--cpus', '1.0',
        
        config.imageTag,
        
        // Run a simple scraping example
        'node', '-e', `
          const { scrapeMoodle } = require('./dist/index.js');
          const fs = require('fs');
          
          async function runScraping() {
            try {
              console.log('Starting containerized Moodle scraping...');
              
              const credentials = {
                email: process.env.MOODLE_EMAIL,
                password: process.env.MOODLE_PASSWORD,
                classUrl: process.env.MOODLE_CLASS_URL
              };
              
              const options = {
                headless: true,
                timeout: 30000,
                waitForElements: true
              };
              
              const data = await scrapeMoodle(credentials, options);
              
              // Save results to mounted volume
              const outputPath = '/app/output/scraped-data.json';
              fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
              
              console.log('✅ Scraping completed successfully!');
              console.log('📊 Results summary:');
              console.log(\`  - Assignments: \${data.assignments.length}\`);
              console.log(\`  - Grades: \${data.grades.length}\`);
              console.log(\`  - Files: \${data.files.length}\`);
              console.log(\`  - Zybook Integrations: \${data.zybookIntegrations.length}\`);
              console.log(\`  - Output saved to: \${outputPath}\`);
              
            } catch (error) {
              console.error('❌ Scraping failed:', error.message);
              process.exit(1);
            }
          }
          
          runScraping();
        `
      ];

      console.log('Running containerized scraping...');
      execSync(runCommand.join(' '), { stdio: 'inherit' });
      
      console.log('✅ Containerized scraping completed');
      console.log(`📁 Results saved to: ${outputDir}/scraped-data.json`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to run container:', error.message);
      return false;
    }
  }

  runInteractiveContainer() {
    console.log('🔧 Running interactive container for debugging...');
    
    try {
      const runCommand = [
        'podman', 'run',
        '-it',  // Interactive terminal
        '--rm',
        '--name', `${config.containerName}-debug`,
        
        // Security settings
        '--security-opt', 'no-new-privileges',
        '--cap-drop', 'ALL',
        
        // Environment variables
        '-e', `MOODLE_EMAIL=${config.moodleConfig.email}`,
        '-e', `MOODLE_PASSWORD=${config.moodleConfig.password}`,
        '-e', `MOODLE_CLASS_URL=${config.moodleConfig.classUrl}`,
        
        config.imageTag,
        '/bin/bash'
      ];

      console.log('Starting interactive container...');
      console.log('💡 Inside the container, you can run:');
      console.log('   node dist/index.js');
      console.log('   npm test');
      console.log('   Or explore the environment');
      
      execSync(runCommand.join(' '), { stdio: 'inherit' });
      
    } catch (error) {
      console.error('❌ Failed to run interactive container:', error.message);
      return false;
    }
  }

  showContainerInfo() {
    console.log('📋 Container Information:');
    console.log(`   Image: ${config.imageTag}`);
    console.log(`   Base: Red Hat Universal Base Image (UBI) 9`);
    console.log(`   Runtime: Podman (rootless, daemonless)`);
    console.log(`   Security: No new privileges, capabilities dropped`);
    console.log(`   Resources: 1GB RAM, 1 CPU limit`);
    
    try {
      // Show image info if it exists
      execSync(`podman image inspect ${config.imageTag}`, { stdio: 'pipe' });
      console.log('✅ Image is built and ready');
    } catch (error) {
      console.log('ℹ️  Image not built yet - run build command first');
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up containers and images...');
    
    try {
      // Stop and remove containers
      execSync(`podman stop ${config.containerName} 2>/dev/null || true`, { stdio: 'pipe' });
      execSync(`podman rm ${config.containerName} 2>/dev/null || true`, { stdio: 'pipe' });
      
      // Optional: Remove image (uncomment if needed)
      // execSync(`podman rmi ${config.imageTag} 2>/dev/null || true`, { stdio: 'pipe' });
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.log('ℹ️  Cleanup completed (some resources may not have existed)');
    }
  }
}

// Main execution
async function main() {
  const scraper = new PodmanMoodleScraper();
  
  const command = process.argv[2] || 'help';
  
  switch (command) {
    case 'build':
      scraper.buildContainer();
      break;
      
    case 'run':
      if (!scraper.buildContainer()) {
        console.error('❌ Build failed, cannot run container');
        process.exit(1);
      }
      scraper.runScrapingContainer();
      break;
      
    case 'debug':
      scraper.runInteractiveContainer();
      break;
      
    case 'info':
      scraper.showContainerInfo();
      break;
      
    case 'cleanup':
      scraper.cleanup();
      break;
      
    case 'help':
    default:
      console.log('🐳 Podman Moodle Scraper - Red Hat Container Example');
      console.log('');
      console.log('Usage: node podman-container-example.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  build    - Build the container image using Red Hat UBI');
      console.log('  run      - Build and run scraping in container');
      console.log('  debug    - Run interactive container for debugging');
      console.log('  info     - Show container information');
      console.log('  cleanup  - Clean up containers and resources');
      console.log('  help     - Show this help message');
      console.log('');
      console.log('Environment Variables:');
      console.log('  MOODLE_EMAIL     - Your Moodle login email');
      console.log('  MOODLE_PASSWORD  - Your Moodle password');
      console.log('  MOODLE_CLASS_URL - Your Moodle class URL');
      console.log('');
      console.log('Example:');
      console.log('  export MOODLE_EMAIL="student@university.edu"');
      console.log('  export MOODLE_PASSWORD="your-password"');
      console.log('  export MOODLE_CLASS_URL="https://moodle.university.edu/course/view.php?id=12345"');
      console.log('  node podman-container-example.js run');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PodmanMoodleScraper }; 