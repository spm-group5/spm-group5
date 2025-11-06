/**
 * Tasks Page Object
 * 
 * Page Object Model for the project tasks page.
 * Encapsulates task page elements and actions.
 */

export class TasksPage {
  constructor(page) {
    this.page = page;
    this.baseUrl = 'http://localhost:5173';
  }

  /**
   * Navigate to project tasks page
   * @param {string} projectId - Project ID
   */
  async goto(projectId) {
    await this.page.goto(`${this.baseUrl}/projects/${projectId}/tasks`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "New Task" button
   */
  async clickNewTask() {
    await this.page.getByRole('button', { name: /New Task/i }).click();
    // Wait for form to appear
    await this.page.waitForSelector('h2:has-text("Create New Task")');
  }

  /**
   * Fill task form fields
   * @param {Object} taskData - Task data
   * @param {string} taskData.title - Task title (required)
   * @param {string} taskData.description - Task description (optional)
   * @param {string} taskData.status - Task status (To Do, In Progress, Completed, Blocked)
   * @param {number} taskData.priority - Priority 1-10 (optional)
   * @param {string} taskData.dueDate - Due date in YYYY-MM-DD format (optional)
   * @param {string} taskData.tags - Tags (optional)
   * @param {string|string[]} taskData.assignees - Single username or array of usernames to assign
   */
  async fillTaskForm(taskData) {
    // Fill title
    await this.page.locator('input[name="title"]').fill(taskData.title);

    // Fill description if provided
    if (taskData.description) {
      await this.page.locator('textarea[id="description-textarea"]').fill(taskData.description);
    }

    // Select status if provided
    if (taskData.status) {
      await this.page.locator('select[id="status-select"]').selectOption(taskData.status);
    }

    // Fill priority if provided
    if (taskData.priority !== undefined) {
      await this.page.locator('input[name="priority"]').fill(String(taskData.priority));
    }

    // Fill due date if provided
    if (taskData.dueDate) {
      await this.page.locator('input[name="dueDate"]').fill(taskData.dueDate);
    }

    // Fill tags if provided
    if (taskData.tags) {
      await this.page.locator('input[name="tags"]').fill(taskData.tags);
    }

    // Add assignees if provided
    if (taskData.assignees) {
      const assignees = Array.isArray(taskData.assignees) ? taskData.assignees : [taskData.assignees];
      
      for (const assigneeEmail of assignees) {
        await this.addAssignee(assigneeEmail);
      }
    }
  }

  /**
   * Add an assignee to the task form
   * @param {string} userEmail - Email of user to assign
   */
  async addAssignee(userEmail) {
    // Find the assignee select dropdown
    const assigneeSelect = this.page.locator('select[id="assignee-select"]');
    
    // Wait for the select to be visible
    await assigneeSelect.waitFor({ state: 'visible' });
    
    // Wait for options to load (should have more than just the placeholder)
    // Increased timeout to 20 seconds to handle slow API responses
    await this.page.waitForFunction(
      () => {
        const select = document.querySelector('select[id="assignee-select"]');
        return select && select.options.length > 1; // More than just "-- Select user --"
      },
      { timeout: 20000 }
    );
    
    // Additional wait to ensure all options are rendered
    await this.page.waitForTimeout(500);
    
    // Get all options and find the one containing the username/email
    // The option text format is: "username (role)", e.g., "e2e-staff@test.com (Staff)"
    const options = await assigneeSelect.locator('option').all();
    let targetValue = null;
    
    for (const option of options) {
      const text = await option.textContent();
      const value = await option.getAttribute('value');
      
      // Check if option text starts with the email/username
      if (text && text.startsWith(userEmail)) {
        targetValue = value;
        break;
      }
    }
    
    if (!targetValue) {
      throw new Error(`Could not find assignee with email: ${userEmail}`);
    }
    
    // Select the user by value
    await assigneeSelect.selectOption(targetValue);
    
    // Click the Add button
    await this.page.getByRole('button', { name: /Add/i }).click();
    
    // Wait for assignee to be added
    await this.page.waitForTimeout(300);
  }

  /**
   * Remove an assignee from the task form
   * @param {string} userEmail - Email of user to remove
   */
  async removeAssignee(userEmail) {
    // Find and click the remove button for this assignee
    const assigneeChip = this.page.locator(`[class*="assigneeChip"]:has-text("${userEmail}")`);
    await assigneeChip.locator('button', { hasText: /×|Remove/i }).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Submit task form
   */
  async submitForm() {
    await this.page.getByRole('button', { name: /Create Task|Save/i }).click();
    // Wait for form to close and task to appear in list
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel task form
   */
  async cancelForm() {
    await this.page.getByRole('button', { name: /Cancel/i }).click();
  }

  /**
   * Create a new task (combines all steps)
   * @param {Object} taskData - Task data
   * @returns {Promise<void>}
   */
  async createTask(taskData) {
    await this.clickNewTask();
    // Wait for the form modal to be fully loaded (especially assignee dropdown)
    await this.page.waitForSelector('input[name="title"]', { state: 'visible', timeout: 5000 });
    if (taskData.assignees) {
      // Ensure assignee select is present before filling form
      await this.page.waitForSelector('select[id="assignee-select"]', { state: 'visible', timeout: 5000 });
    }
    await this.fillTaskForm(taskData);
    await this.submitForm();
  }

  /**
   * Find task card by title
   * @param {string} taskTitle - Title of the task
   * @returns {Locator} Task card locator
   */
  getTaskCard(taskTitle) {
    return this.page.locator('[class*="taskCard"]').filter({ hasText: taskTitle });
  }

  /**
   * Check if task exists in list
   * @param {string} taskTitle - Title of the task
   * @returns {Promise<boolean>} True if task is visible
   */
  async hasTask(taskTitle) {
    const card = this.getTaskCard(taskTitle);
    return await card.isVisible().catch(() => false);
  }

  /**
   * Click on task card to expand/view details
   * @param {string} taskTitle - Title of the task
   */
  async clickTaskCard(taskTitle) {
    const card = this.getTaskCard(taskTitle);
    await card.click();
    // Wait for expansion/details to load
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit a task
   * @param {string} taskTitle - Title of the task
   */
  async clickEditTask(taskTitle) {
    const card = this.getTaskCard(taskTitle);
    await card.locator('button', { hasText: /Edit/i }).click();
    // Wait for edit form to appear
    await this.page.waitForSelector('h2:has-text("Edit Task")');
  }

  /**
   * Archive a task
   * @param {string} taskTitle - Title of the task
   */
  async clickArchiveTask(taskTitle) {
    const card = this.getTaskCard(taskTitle);
    
    // Set up dialog handler before clicking
    this.page.once('dialog', dialog => dialog.accept());
    
    await card.locator('button', { hasText: /Archive/i }).click();
    
    // Wait for archive operation to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if 403 Forbidden error is displayed
   * @returns {Promise<boolean>} True if error is visible
   */
  async has403Error() {
    const errorText = this.page.locator('text=/You do not have permission to view tasks/i');
    return await errorText.isVisible().catch(() => false);
  }

  /**
   * Check if 404 Not Found error is displayed
   * @returns {Promise<boolean>} True if error is visible
   */
  async has404Error() {
    const errorText = this.page.locator('text=/Project not found/i');
    return await errorText.isVisible().catch(() => false);
  }

  /**
   * Get error message if displayed
   * @returns {Promise<string|null>} Error message or null
   */
  async getErrorMessage() {
    const errorLocator = this.page.locator('[class*="error"]').first();
    const isVisible = await errorLocator.isVisible().catch(() => false);
    if (isVisible) {
      return await errorLocator.textContent();
    }
    return null;
  }

  /**
   * Click "Back to Projects" button
   */
  async clickBackToProjects() {
    await this.page.getByRole('button', { name: /Back to Projects/i }).click();
    // Wait for navigation
    await this.page.waitForURL(/\/projects$/);
  }

  /**
   * Filter tasks by status
   * @param {string} status - 'all', 'To Do', 'In Progress', 'Completed', 'Blocked'
   */
  async filterByStatus(status) {
    await this.page.locator('select[name="filterStatus"]').selectOption(status);
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter tasks by assignment
   * @param {string} view - 'my-tasks', 'team-tasks', 'all'
   */
  async filterByAssignment(view) {
    await this.page.locator('button', { hasText: new RegExp(view, 'i') }).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Sort tasks
   * @param {string} sortBy - 'priority', 'dueDate', 'status', 'dateCreated'
   */
  async sortBy(sortBy) {
    await this.page.locator('select[name="sortBy"]').selectOption(sortBy);
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to archived tasks tab
   */
  async showArchivedTasks() {
    await this.page.locator('button', { hasText: /Archived/i }).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to active tasks tab
   */
  async showActiveTasks() {
    await this.page.locator('button', { hasText: /Active/i }).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for task to appear by title
   * @param {string} taskTitle - Title of the task
   * @param {number} timeout - Timeout in milliseconds (default 5000)
   */
  async waitForTask(taskTitle, timeout = 5000) {
    // Wait for either task card or task heading
    await this.page.waitForSelector(
      `[class*="taskCard"]:has-text("${taskTitle}"), h3:has-text("${taskTitle}")`,
      { timeout }
    );
  }

  /**
   * Get count of tasks displayed
   * @returns {Promise<number>} Number of tasks
   */
  async getTaskCount() {
    const taskCards = this.page.locator('[class*="taskCard"]');
    return await taskCards.count();
  }

  /**
   * Check if empty state is shown
   * @returns {Promise<boolean>} True if empty state is visible
   */
  async hasEmptyState() {
    const emptyState = this.page.locator('text=/No tasks/i');
    return await emptyState.isVisible().catch(() => false);
  }
}
