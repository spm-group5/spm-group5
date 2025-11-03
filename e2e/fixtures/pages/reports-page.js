/**
 * Reports Page Object
 * 
 * Provides methods to interact with the Reports page UI.
 * Handles report type selection, form filling, and submission.
 */

export class ReportsPage {
  constructor(page) {
    this.page = page;
    this.baseUrl = 'http://localhost:5173';
  }

  /**
   * Navigate to reports page
   */
  async goto() {
    await this.page.goto(`${this.baseUrl}/reports`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select report type (radio button)
   * @param {string} reportType - 'user', 'project', 'team-summary', 'logged-time', 'logged-time-department'
   */
  async selectReportType(reportType) {
    await this.page.locator(`input[type="radio"][value="${reportType}"]`).click();
  }

  /**
   * Select user from SearchableSelect dropdown
   * @param {string} userDisplay - Full user display text (e.g., "user@test.com (department)")
   */
  async selectUser(userDisplay) {
    // Extract email part for search
    const email = userDisplay.split(' (')[0];
    
    // Click to open dropdown
    await this.page.locator('input[placeholder="Select a user"]').click();
    
    // Type the email to filter
    await this.page.locator('input[placeholder="Search users..."]').fill(email);
    
    // Click the matching option
    await this.page.locator(`li[class*="option"]:has-text("${email}")`).first().click();
  }

  /**
   * Select project from SearchableSelect dropdown
   * @param {string} projectName - Full project name
   */
  async selectProject(projectName) {
    // Click to open dropdown
    await this.page.locator('input[placeholder="Select a project"]').click();
    
    // Type the project name to filter
    await this.page.locator('input[placeholder="Search projects..."]').fill(projectName);
    
    // Click the matching option
    await this.page.locator(`li[class*="option"]:has-text("${projectName}")`).first().click();
  }

  /**
   * Select department from SearchableSelect dropdown
   * @param {string} departmentLabel - Full department label
   */
  async selectDepartment(departmentLabel) {
    // Click to open dropdown
    await this.page.locator('input[placeholder="Select a department"]').click();
    
    // Type the department label to filter
    await this.page.locator('input[placeholder="Search departments..."]').fill(departmentLabel);
    
    // Click the matching option
    await this.page.locator(`li[class*="option"]:has-text("${departmentLabel}")`).first().click();
  }

  /**
   * Set start date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async setStartDate(date) {
    await this.page.locator('input[type="date"]').first().fill(date);
  }

  /**
   * Set end date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async setEndDate(date) {
    await this.page.locator('input[type="date"]').nth(1).fill(date);
  }

  /**
   * Select timeframe (week or month) for team summary reports
   * @param {string} timeframe - 'week' or 'month'
   */
  async selectTimeframe(timeframe) {
    await this.page.locator(`input[type="radio"][value="${timeframe}"]`).click();
  }

  /**
   * Select format (PDF or Excel)
   * @param {string} format - 'pdf' or 'excel'
   */
  async selectFormat(format) {
    await this.page.locator('select[name="format"]').selectOption(format);
  }

  /**
   * Submit the report generation form
   */
  async submitForm() {
    await this.page.locator('button[type="submit"]:has-text("Generate Report")').click();
  }

  /**
   * Check if error message is visible
   * @returns {Promise<boolean>}
   */
  async hasError() {
    const errorLocator = this.page.locator('.error, [class*="error"]').first();
    return await errorLocator.isVisible().catch(() => false);
  }

  /**
   * Check if warning message is visible
   * @returns {Promise<boolean>}
   */
  async hasWarning() {
    const warningLocator = this.page.locator('.warning, [class*="warning"]').first();
    return await warningLocator.isVisible().catch(() => false);
  }

  /**
   * Get error message text
   * @returns {Promise<string|null>}
   */
  async getErrorMessage() {
    const errorLocator = this.page.locator('.error, [class*="error"]').first();
    const isVisible = await errorLocator.isVisible().catch(() => false);
    if (isVisible) {
      return await errorLocator.textContent();
    }
    return null;
  }

  /**
   * Get warning message text
   * @returns {Promise<string|null>}
   */
  async getWarningMessage() {
    const warningLocator = this.page.locator('.warning, [class*="warning"]').first();
    const isVisible = await warningLocator.isVisible().catch(() => false);
    if (isVisible) {
      return await warningLocator.textContent();
    }
    return null;
  }

  /**
   * Wait for report generation to complete
   * Waits for either success notification, error, or warning
   * @param {number} timeout - Timeout in milliseconds (default 5000)
   */
  async waitForReportGeneration(timeout = 5000) {
    // Give time for download to trigger or error to appear
    await this.page.waitForTimeout(2000);
  }

  /**
   * Generate Task Completion Report by User
   * @param {string} username - User to select
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} format - 'pdf' or 'excel'
   */
  async generateUserTaskCompletionReport(username, startDate, endDate, format) {
    await this.selectReportType('user');
    await this.selectUser(username);
    await this.setStartDate(startDate);
    await this.setEndDate(endDate);
    await this.selectFormat(format);
    await this.submitForm();
    await this.waitForReportGeneration();
  }

  /**
   * Generate Task Completion Report by Project
   * @param {string} projectName - Project to select
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} format - 'pdf' or 'excel'
   */
  async generateProjectTaskCompletionReport(projectName, startDate, endDate, format) {
    await this.selectReportType('project');
    await this.selectProject(projectName);
    await this.setStartDate(startDate);
    await this.setEndDate(endDate);
    await this.selectFormat(format);
    await this.submitForm();
    await this.waitForReportGeneration();
  }

  /**
   * Generate Team Summary Report
   * @param {string} projectName - Project to select
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} timeframe - 'week' or 'month'
   * @param {string} format - 'pdf' or 'excel'
   */
  async generateTeamSummaryReport(projectName, startDate, timeframe, format) {
    await this.selectReportType('team-summary');
    await this.selectProject(projectName);
    await this.setStartDate(startDate);
    await this.selectTimeframe(timeframe);
    await this.selectFormat(format);
    await this.submitForm();
    await this.waitForReportGeneration();
  }

  /**
   * Generate Logged Time Report by Project
   * @param {string} projectName - Project to select
   * @param {string} format - 'pdf' or 'excel'
   */
  async generateProjectLoggedTimeReport(projectName, format) {
    await this.selectReportType('logged-time');
    await this.selectProject(projectName);
    await this.selectFormat(format);
    await this.submitForm();
    await this.waitForReportGeneration();
  }

  /**
   * Generate Logged Time Report by Department
   * @param {string} departmentLabel - Department to select (e.g., "Engineering")
   * @param {string} format - 'pdf' or 'excel'
   */
  async generateDepartmentLoggedTimeReport(departmentLabel, format) {
    await this.selectReportType('logged-time-department');
    await this.selectDepartment(departmentLabel);
    await this.selectFormat(format);
    await this.submitForm();
    await this.waitForReportGeneration();
  }
}
