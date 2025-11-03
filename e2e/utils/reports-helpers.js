/**
 * Reports E2E Test Helpers
 * 
 * Common flows and utilities for Reports E2E tests.
 */

import { LoginPage } from '../fixtures/pages/login-page.js';
import { ReportsPage } from '../fixtures/pages/reports-page.js';

/**
 * Setup: Login as admin and navigate to reports page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<ReportsPage>}
 */
export async function loginAsAdminAndNavigateToReports(page) {
  const loginPage = new LoginPage(page);
  const reportsPage = new ReportsPage(page);
  
  // Login as admin (from auth helpers - using existing admin)
  await loginPage.goto();
  await loginPage.login('test@allinone.com.sg', 'password');
  
  // Navigate to reports
  await reportsPage.goto();
  
  return reportsPage;
}

/**
 * Setup: Login as E2E admin and navigate to reports page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<ReportsPage>}
 */
export async function loginAsE2EAdminAndNavigateToReports(page) {
  const loginPage = new LoginPage(page);
  const reportsPage = new ReportsPage(page);
  
  // Login as E2E reports admin
  await loginPage.goto();
  await loginPage.login('e2e-reports-admin@test.com', 'Test@123');
  
  // Navigate to reports
  await reportsPage.goto();
  
  return reportsPage;
}

/**
 * Setup: Login as E2E manager and navigate to reports page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<ReportsPage>}
 */
export async function loginAsE2EManagerAndNavigateToReports(page) {
  const loginPage = new LoginPage(page);
  const reportsPage = new ReportsPage(page);
  
  // Login as E2E reports manager
  await loginPage.goto();
  await loginPage.login('e2e-reports-manager@test.com', 'Test@123');
  
  // Navigate to reports
  await reportsPage.goto();
  
  return reportsPage;
}

/**
 * Setup: Login as E2E staff and navigate to reports page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<ReportsPage>}
 */
export async function loginAsE2EStaffAndNavigateToReports(page) {
  const loginPage = new LoginPage(page);
  const reportsPage = new ReportsPage(page);
  
  // Login as E2E reports staff
  await loginPage.goto();
  await loginPage.login('e2e-reports-staff-eng@test.com', 'Test@123');
  
  // Navigate to reports
  await reportsPage.goto();
  
  return reportsPage;
}

/**
 * Wait for download to start (checks download event)
 * @param {import('@playwright/test').Page} page
 * @param {Function} triggerAction - Async function that triggers the download
 * @returns {Promise<boolean>} - True if download was triggered
 */
export async function waitForDownload(page, triggerAction) {
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await triggerAction();
    const download = await downloadPromise;
    return !!download;
  } catch (error) {
    return false;
  }
}

/**
 * Check if download was triggered for a report generation
 * @param {import('@playwright/test').Page} page
 * @param {Function} generateReportAction - Async function that generates the report
 * @returns {Promise<boolean>}
 */
export async function checkDownloadTriggered(page, generateReportAction) {
  return await waitForDownload(page, generateReportAction);
}

/**
 * Get test date ranges for reports
 * @returns {Object} Date ranges for testing
 */
export function getTestDateRanges() {
  return {
    // January 2024 (covers all test tasks)
    january: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    // First week (Jan 1-7)
    firstWeek: {
      start: '2024-01-01',
      end: '2024-01-07'
    },
    // Second week (Jan 8-14)
    secondWeek: {
      start: '2024-01-08',
      end: '2024-01-14'
    },
    // Third week (Jan 15-21)
    thirdWeek: {
      start: '2024-01-15',
      end: '2024-01-21'
    },
    // Fourth week (Jan 22-28)
    fourthWeek: {
      start: '2024-01-22',
      end: '2024-01-28'
    },
    // Entire month (Jan 1-31)
    entireMonth: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    // February (no data expected)
    february: {
      start: '2024-02-01',
      end: '2024-02-28'
    },
    // Future (no data expected)
    future: {
      start: '2025-01-01',
      end: '2025-01-31'
    }
  };
}

/**
 * Get test user identifiers
 * @returns {Object} User identifiers for testing
 */
export function getTestUsers() {
  return {
    admin: 'e2e-reports-admin@test.com',
    adminDisplay: 'e2e-reports-admin@test.com (hr)',
    manager: 'e2e-reports-manager@test.com',
    managerDisplay: 'e2e-reports-manager@test.com (sales)',
    staffEng: 'e2e-reports-staff-eng@test.com',
    staffEngDisplay: 'e2e-reports-staff-eng@test.com (engineering)',
    staffFinance: 'e2e-reports-staff-finance@test.com',
    staffFinanceDisplay: 'e2e-reports-staff-finance@test.com (finance)',
    staffConsultancy: 'e2e-reports-staff-consultancy@test.com',
    staffConsultancyDisplay: 'e2e-reports-staff-consultancy@test.com (consultancy)'
  };
}

/**
 * Get test project names (must match DB exactly)
 * @returns {Object} Project names for testing
 */
export function getTestProjects() {
  return {
    main: 'e2e-reports-Main Project',
    minimal: 'e2e-reports-Minimal Project',
    archived: 'e2e-reports-Archived Project'
  };
}

/**
 * Get test department labels
 * @returns {Object} Department labels for testing
 */
export function getTestDepartments() {
  return {
    hr: 'Human Resources',
    sales: 'Sales',
    engineering: 'Engineering',
    finance: 'Finance',
    consultancy: 'Consultancy'
  };
}

/**
 * Verify report form is visible and properly initialized
 * @param {import('@playwright/test').Page} page
 */
export async function verifyReportFormVisible(page) {
  // Check that report type selection is visible
  await page.locator('input[type="radio"][value="user"]').waitFor({ state: 'visible' });
  
  // Check that format selection is visible
  await page.locator('select[name="format"]').waitFor({ state: 'visible' });
  
  // Check that submit button is visible
  await page.locator('button[type="submit"]:has-text("Generate Report")').waitFor({ state: 'visible' });
}

/**
 * Verify access denied (401 or 403 or redirect to login/dashboard)
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function verifyAccessDenied(page) {
  // Wait a bit for redirect or error
  await page.waitForTimeout(1000);
  
  // Check if redirected to login or dashboard (not reports)
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/dashboard')) {
    return true;
  }
  
  // Check if still on reports page (should NOT be)
  if (currentUrl.includes('/reports')) {
    return false;
  }
  
  // Check for error message
  const hasError = await page.locator('.error, [class*="error"]').isVisible().catch(() => false);
  if (hasError) {
    const errorText = await page.locator('.error, [class*="error"]').first().textContent();
    if (errorText.toLowerCase().includes('unauthorized') || 
        errorText.toLowerCase().includes('access denied') ||
        errorText.toLowerCase().includes('permission')) {
      return true;
    }
  }
  
  return false;
}
