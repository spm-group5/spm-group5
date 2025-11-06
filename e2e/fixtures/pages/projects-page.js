/**
 * Projects Page Object
 * 
 * Page Object Model for the projects page.
 * Encapsulates project page elements and actions.
 */

export class ProjectsPage {
  constructor(page) {
    this.page = page;
    this.baseUrl = 'http://localhost:5173';
  }

  /**
   * Navigate to projects page
   */
  async goto() {
    await this.page.goto(`${this.baseUrl}/projects`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "New Project" button
   */
  async clickNewProject() {
    await this.page.getByRole('button', { name: /New Project/i }).click();
    // Wait for form to appear
    await this.page.waitForSelector('h2:has-text("Create New Project")');
  }

  /**
   * Fill project form fields
   * @param {Object} projectData - Project data
   * @param {string} projectData.name - Project name (required)
   * @param {string} projectData.description - Project description (optional)
   * @param {string} projectData.status - Project status (To Do, In Progress, Completed, Blocked)
   * @param {number} projectData.priority - Priority 1-10 (optional)
   * @param {string} projectData.dueDate - Due date in YYYY-MM-DD format (optional)
   * @param {string} projectData.tags - Comma-separated tags (optional)
   */
  async fillProjectForm(projectData) {
    // Fill name
    await this.page.locator('input[name="name"]').fill(projectData.name);

    // Fill description if provided
    if (projectData.description) {
      await this.page.locator('textarea[id="project-description-textarea"]').fill(projectData.description);
    }

    // Select status if provided
    if (projectData.status) {
      await this.page.locator('select[id="project-status-select"]').selectOption(projectData.status);
    }

    // Fill priority if provided
    if (projectData.priority) {
      await this.page.locator('input[name="priority"]').fill(String(projectData.priority));
    }

    // Fill due date if provided
    if (projectData.dueDate) {
      await this.page.locator('input[name="dueDate"]').fill(projectData.dueDate);
    }

    // Fill tags if provided
    if (projectData.tags) {
      await this.page.locator('input[name="tags"]').fill(projectData.tags);
    }
  }

  /**
   * Submit project form
   */
  async submitForm() {
    await this.page.getByRole('button', { name: /Create Project/i }).click();
    // Wait for form to close and project to appear in list
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel project form
   */
  async cancelForm() {
    await this.page.getByRole('button', { name: /Cancel/i }).click();
  }

  /**
   * Create a new project (combines all steps)
   * @param {Object} projectData - Project data
   * @returns {Promise<void>}
   */
  async createProject(projectData) {
    await this.clickNewProject();
    await this.fillProjectForm(projectData);
    await this.submitForm();
  }

  /**
   * Find project card by name
   * @param {string} projectName - Name of the project
   * @returns {Promise<Locator>} Project card locator
   */
  getProjectCard(projectName) {
    // Use more specific selector to avoid matching wrapper divs
    return this.page.locator('[class*="projectCard"]:not([class*="projectCardWrapper"])').filter({ hasText: projectName });
  }

  /**
   * Click on project card to view tasks
   * @param {string} projectName - Name of the project
   */
  async clickProjectCard(projectName) {
    const card = this.getProjectCard(projectName);
    await card.click();
    // Wait for navigation to tasks page
    await this.page.waitForURL(/\/projects\/.*\/tasks/);
  }

  /**
   * Check if project card is accessible (canViewTasks = true)
   * @param {string} projectName - Name of the project
   * @returns {Promise<boolean>} True if accessible
   */
  async isProjectAccessible(projectName) {
    const card = this.getProjectCard(projectName);
    const className = await card.getAttribute('class');
    // Check if card has "accessible" class and NOT "notAccessible"
    return className.includes('accessible') && !className.includes('notAccessible');
  }

  /**
   * Check if project card shows "no access" indicator
   * @param {string} projectName - Name of the project
   * @returns {Promise<boolean>} True if not accessible
   */
  async isProjectNotAccessible(projectName) {
    const card = this.getProjectCard(projectName);
    const className = await card.getAttribute('class');
    return className.includes('notAccessible');
  }

  /**
   * Check if edit button is visible on project card
   * @param {string} projectName - Name of the project
   * @returns {Promise<boolean>} True if edit button visible
   */
  async hasEditButton(projectName) {
    const card = this.getProjectCard(projectName);
    const editButton = card.locator('button', { hasText: /Edit/i });
    return await editButton.isVisible().catch(() => false);
  }

  /**
   * Check if archive button is visible on project card
   * @param {string} projectName - Name of the project
   * @returns {Promise<boolean>} True if archive button visible
   */
  async hasArchiveButton(projectName) {
    const card = this.getProjectCard(projectName);
    const archiveButton = card.locator('button', { hasText: /Archive/i });
    return await archiveButton.isVisible().catch(() => false);
  }

  /**
   * Click edit button on project card
   * @param {string} projectName - Name of the project
   */
  async clickEditProject(projectName) {
    const card = this.getProjectCard(projectName);
    await card.locator('button', { hasText: /Edit/i }).click();
    // Wait for edit form to appear
    await this.page.waitForSelector('h2:has-text("Edit Project")');
  }

  /**
   * Click archive button on project card
   * @param {string} projectName - Name of the project
   */
  async clickArchiveProject(projectName) {
    const card = this.getProjectCard(projectName);
    
    // Set up dialog handler before clicking
    this.page.once('dialog', dialog => dialog.accept());
    
    await card.locator('button', { hasText: /Archive/i }).click();
    
    // Wait for archive operation to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click unarchive button on project card
   * @param {string} projectName - Name of the project
   */
  async clickUnarchiveProject(projectName) {
    const card = this.getProjectCard(projectName);
    
    // Set up dialog handler before clicking
    this.page.once('dialog', dialog => dialog.accept());
    
    await card.locator('button', { hasText: /Unarchive/i }).click();
    
    // Wait for unarchive operation to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if project exists in list
   * @param {string} projectName - Name of the project
   * @returns {Promise<boolean>} True if project is visible
   */
  async hasProject(projectName) {
    const card = this.getProjectCard(projectName);
    return await card.isVisible().catch(() => false);
  }

  /**
   * Get project ID from URL after navigating to project tasks
   * @returns {Promise<string>} Project ID
   */
  async getProjectIdFromUrl() {
    const url = this.page.url();
    const match = url.match(/\/projects\/([^/]+)\/tasks/);
    return match ? match[1] : null;
  }

  /**
   * Filter projects by status
   * @param {string} status - 'all', 'To Do', 'In Progress', 'Completed', 'Blocked', 'archived'
   */
  async filterByStatus(status) {
    // The UI uses tabs (buttons) for filtering, not a select dropdown
    // Find and click the button with the matching text
    const tabButton = this.page.getByRole('button', { name: new RegExp(status, 'i') });
    await tabButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter projects by tag
   * @param {string} tag - Tag to filter by
   */
  async filterByTag(tag) {
    await this.page.locator('select[name="filterTag"]').selectOption(tag);
    await this.page.waitForTimeout(500);
  }

  /**
   * Sort projects
   * @param {string} sortBy - 'dateCreated', 'dateUpdated', 'name', 'priority', 'dueDate'
   */
  async sortBy(sortBy) {
    await this.page.locator('select[name="sortBy"]').selectOption(sortBy);
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for project to appear in list
   * @param {string} projectName - Name of the project
   * @param {number} timeout - Timeout in milliseconds (default 5000)
   */
  async waitForProject(projectName, timeout = 5000) {
    await this.page.waitForSelector(`[class*="projectCard"]:has-text("${projectName}")`, { timeout });
  }
}
