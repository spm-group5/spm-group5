/**
 * Login Page Object
 * 
 * Page Object Model for the login page.
 * Encapsulates login page elements and actions.
 */

export class LoginPage {
  constructor(page) {
    this.page = page;
    
    // Selectors
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error, [class*="error"]');
    this.loginCard = page.locator('[class*="loginBox"], [class*="card"]');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Perform login with credentials
   * 
   * @param {string} username - Username (email format)
   * @param {string} password - Password
   */
  async login(username, password) {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    await this.login('e2e-admin@test.com', 'Test@123');
  }

  /**
   * Login as manager user
   */
  async loginAsManager() {
    await this.login('e2e-manager@test.com', 'Test@123');
  }

  /**
   * Login as staff user
   */
  async loginAsStaff() {
    await this.login('e2e-staff@test.com', 'Test@123');
  }

  /**
   * Attempt login (without waiting for success)
   * Useful for testing invalid credentials
   * 
   * @param {string} username - Username
   * @param {string} password - Password
   */
  async attemptLogin(username, password) {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Don't wait for redirect - let test verify behavior
  }

  /**
   * Check if error message is displayed
   * 
   * @returns {Promise<boolean>} True if error is visible
   */
  async hasError() {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   * 
   * @returns {Promise<string>} Error message text
   */
  async getErrorText() {
    return await this.errorMessage.textContent();
  }
}
