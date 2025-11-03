/**
 * Authentication Helper Functions for E2E Tests
 * 
 * Provides reusable login functions for different user roles:
 * - Admin (HR department with admin role)
 * - Manager (Engineering department)
 * - Staff (Sales department)
 */

/**
 * Login as Admin user
 * - Username: e2e-admin@test.com
 * - Roles: ['admin', 'manager']
 * - Department: hr
 * - Can: Access reports, assign tasks, manage projects
 * 
 * @param {Page} page - Playwright page object
 */
export async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'e2e-admin@test.com');
  await page.fill('input[name="password"]', 'Test@123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✅ Logged in as Admin');
}

/**
 * Login as Manager user
 * - Username: e2e-manager@test.com
 * - Roles: ['manager']
 * - Department: engineering
 * - Can: Assign tasks, manage projects
 * - Cannot: Access reports (not admin)
 * 
 * @param {Page} page - Playwright page object
 */
export async function loginAsManager(page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'e2e-manager@test.com');
  await page.fill('input[name="password"]', 'Test@123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✅ Logged in as Manager');
}

/**
 * Login as Staff user
 * - Username: e2e-staff@test.com
 * - Roles: ['staff']
 * - Department: sales
 * - Cannot: Assign tasks, access reports, manage projects
 * 
 * @param {Page} page - Playwright page object
 */
export async function loginAsStaff(page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'e2e-staff@test.com');
  await page.fill('input[name="password"]', 'Test@123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✅ Logged in as Staff');
}

/**
 * Logout current user
 * 
 * @param {Page} page - Playwright page object
 */
export async function logout(page) {
  // Click logout button (adjust selector based on your UI)
  await page.click('button:has-text("Logout"), a:has-text("Logout")');
  await page.waitForURL('**/login', { timeout: 5000 });
  console.log('✅ Logged out');
}

/**
 * Check if user is authenticated
 * 
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isAuthenticated(page) {
  const url = page.url();
  return url.includes('/dashboard') || 
         url.includes('/tasks') || 
         url.includes('/projects') || 
         url.includes('/reports');
}
