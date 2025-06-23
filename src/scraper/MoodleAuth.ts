import { Page } from 'puppeteer';
import { MoodleCredentials } from '../types';

export class MoodleAuth {
  private page: Page;
  private credentials: MoodleCredentials;
  public loginToken: string = '';
  public cookies: string = '';

  constructor(page: Page, credentials: MoodleCredentials) {
    this.page = page;
    this.credentials = credentials;
  }

  async login(): Promise<boolean> {
    try {
      // First try to navigate to the class URL to detect login redirect
      await this.page.goto(this.credentials.classUrl, { waitUntil: 'networkidle0' });
      
      // Check if we're already logged in
      if (await this.isAlreadyLoggedIn()) {
        return true;
      }
      
      // Find login URL if redirected or detect login form
      const loginUrl = await this.findLoginUrl();
      if (loginUrl && loginUrl !== this.page.url()) {
        await this.page.goto(loginUrl, { waitUntil: 'networkidle0' });
      }
      
      // Extract CSRF token if present
      const csrfToken = await this.extractCSRFToken();
      
      // Perform login
      await this.performLogin(csrfToken);
      
      // Verify login success
      return await this.verifyLoginSuccess();
      
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async isAlreadyLoggedIn(): Promise<boolean> {
    try {
      const loginIndicators = [
        'input[name="username"]',
        'input[name="password"]',
        '.loginform',
        '#login',
        '.login-container'
      ];

      for (const selector of loginIndicators) {
        const element = await this.page.$(selector);
        if (element) {
          return false; // Found login form, not logged in
        }
      }

      // Check for typical logged-in indicators
      const loggedInIndicators = [
        '.usermenu',
        '.user-menu',
        '[data-region="user-menu"]',
        '.navbar-nav .dropdown',
        'a[href*="logout"]'
      ];

      for (const selector of loggedInIndicators) {
        const element = await this.page.$(selector);
        if (element) {
          return true; // Found logged-in indicator
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async findLoginUrl(): Promise<string> {
    const currentUrl = this.page.url();
    const baseUrl = new URL(currentUrl).origin;
    
    // Common Moodle login paths
    const loginPaths = [
      '/login/index.php',
      '/login/',
      '/auth/login.php',
      '/user/login.php',
      '/login.php'
    ];

    // Check if current page has login form
    const hasLoginForm = await this.page.$('input[name="username"], input[name="password"]');
    if (hasLoginForm) {
      return currentUrl;
    }

    // Try to find login link on current page
    const loginLink = await this.page.$('a[href*="login"]');
    if (loginLink) {
      const href = await loginLink.getProperty('href');
      const loginUrl = await href.jsonValue() as string;
      if (loginUrl) {
        return loginUrl;
      }
    }

    // Try common login paths
    for (const path of loginPaths) {
      try {
        const testUrl = baseUrl + path;
        await this.page.goto(testUrl, { waitUntil: 'networkidle0' });
        const hasForm = await this.page.$('input[name="username"], input[name="password"]');
        if (hasForm) {
          return testUrl;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    return currentUrl; // Fallback to current URL
  }

  private async extractCSRFToken(): Promise<string | null> {
    try {
      const tokenSelectors = [
        'input[name="logintoken"]',
        'input[name="_token"]',
        'input[name="csrftoken"]',
        'input[name="authenticity_token"]',
        'input[type="hidden"][name*="token"]'
      ];

      for (const selector of tokenSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          const value = await element.getProperty('value');
          const token = await value.jsonValue() as string;
          if (token) {
            return token;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async performLogin(csrfToken: string | null): Promise<void> {
    const usernameSelector = await this.findUsernameField();
    const passwordSelector = await this.findPasswordField();
    const submitSelector = await this.findSubmitButton();

    if (!usernameSelector || !passwordSelector || !submitSelector) {
      throw new Error('Could not locate all required login form elements');
    }

    await this.page.click(usernameSelector, { clickCount: 3 });
    await this.page.type(usernameSelector, this.credentials.email);
    
    await this.page.click(passwordSelector, { clickCount: 3 });
    await this.page.type(passwordSelector, this.credentials.password);

    if (csrfToken) {
      const tokenField = await this.page.$('input[name="logintoken"], input[name="_token"]');
      if (tokenField) {
        await tokenField.evaluate((el: HTMLInputElement, token: string) => {
          el.value = token;
        }, csrfToken);
      }
    }

    // Submit form and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      this.page.click(submitSelector)
    ]);
  }

  /**
   * Find username/email field with multiple fallback selectors
   */
  private async findUsernameField(): Promise<string | null> {
    const selectors = [
      'input[name="username"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[id="username"]',
      'input[id="email"]',
      'input[placeholder*="username" i]',
      'input[placeholder*="email" i]',
      'input[aria-label*="username" i]',
      'input[aria-label*="email" i]',
      '.form-group input[type="text"]:first-of-type',
      'form input[type="text"]:first-of-type'
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        return selector;
      }
    }

    return null;
  }

  /**
   * Find password field with multiple fallback selectors
   */
  private async findPasswordField(): Promise<string | null> {
    const selectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[id="password"]',
      'input[placeholder*="password" i]',
      'input[aria-label*="password" i]'
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        return selector;
      }
    }

    return null;
  }

  /**
   * Find submit button with multiple fallback selectors
   */
  private async findSubmitButton(): Promise<string | null> {
    const selectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'button:contains("Login")',
      'button:contains("Sign in")',
      'button:contains("Log in")',
      'input[value*="login" i]',
      'input[value*="sign in" i]',
      '.btn-primary',
      '.login-btn',
      '#loginbtn',
      'form button:last-of-type'
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        return selector;
      }
    }

    return null;
  }

  /**
   * Verify that login was successful
   */
  private async verifyLoginSuccess(): Promise<boolean> {
    try {
      // Wait a moment for any redirects
      await this.page.waitForTimeout(2000);

      // Check for error messages
      const errorSelectors = [
        '.error',
        '.alert-danger',
        '.login-error',
        '[class*="error"]',
        'div:contains("Invalid")',
        'div:contains("incorrect")',
        'div:contains("failed")'
      ];

      for (const selector of errorSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          const text = await element.evaluate((el: Element) => el.textContent);
          if (text && (text.includes('Invalid') || text.includes('incorrect') || text.includes('failed'))) {
            throw new Error(`Login failed: ${text.trim()}`);
          }
        }
      }

      // Check if we're back at a login page (indicates failed login)
      const stillOnLogin = await this.page.$('input[name="username"], input[name="password"]');
      if (stillOnLogin) {
        throw new Error('Login failed - still on login page');
      }

      // Check for successful login indicators
      const successIndicators = [
        '.usermenu',
        '.user-menu',
        '[data-region="user-menu"]',
        'a[href*="logout"]',
        '.navbar .dropdown'
      ];

      for (const selector of successIndicators) {
        const element = await this.page.$(selector);
        if (element) {
          return true; // Found success indicator
        }
      }

      // If no clear indicators, assume success if we're not on login page
      return true;

    } catch (error) {
      throw new Error(`Login verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if current session is still valid
   */
  async validateSession(): Promise<boolean> {
    try {
      await this.page.goto(this.credentials.classUrl, { waitUntil: 'networkidle0' });
      return await this.isAlreadyLoggedIn();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current session cookies for potential reuse
   */
  async getSessionCookies(): Promise<any[]> {
    try {
      return await this.page.cookies();
    } catch (error) {
      return [];
    }
  }

  /**
   * Set session cookies for reuse
   */
  async setSessionCookies(cookies: any[]): Promise<void> {
    try {
      await this.page.setCookie(...cookies);
    } catch (error) {
      // Ignore cookie setting errors
    }
  }
} 