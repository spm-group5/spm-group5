/**
 * Reports E2E Tests
 * 
 * Tests report generation functionality with proper access control,
 * validation, and data integrity checks.
 */

import { test, expect } from '@playwright/test';
import {
  setupE2EReportsData,
  cleanupE2EReportsData
} from '../utils/reports-db-helpers.js';
import {
  loginAsE2EAdminAndNavigateToReports,
  loginAsE2EManagerAndNavigateToReports,
  loginAsE2EStaffAndNavigateToReports,
  checkDownloadTriggered,
  getTestDateRanges,
  getTestUsers,
  getTestProjects,
  getTestDepartments,
  verifyReportFormVisible,
  verifyAccessDenied
} from '../utils/reports-helpers.js';

// Setup and teardown for all tests
test.beforeAll(async () => {
  await cleanupE2EReportsData();
  await setupE2EReportsData();
});

test.afterAll(async () => {
  await cleanupE2EReportsData();
});

/**
 * Access Control Tests
 * Verify only admins can access reports
 */
test.describe('Reports Access Control', () => {
  
  test('should allow admin to access reports page', async ({ page }) => {
    // Login as admin and navigate to reports
    await loginAsE2EAdminAndNavigateToReports(page);
    
    // Verify report form is visible
    await verifyReportFormVisible(page);
  });

  test('should deny manager access to reports page', async ({ page }) => {
    const reportsPage = await loginAsE2EManagerAndNavigateToReports(page);
    
    // Verify access denied
    const denied = await verifyAccessDenied(page);
    expect(denied).toBe(true);
  });

  test('should deny staff access to reports page', async ({ page }) => {
    const reportsPage = await loginAsE2EStaffAndNavigateToReports(page);
    
    // Verify access denied
    const denied = await verifyAccessDenied(page);
    expect(denied).toBe(true);
  });
});

/**
 * Validation Tests
 * Test form validation rules
 * 
 * NOTE: Skipping these for now as frontend may handle validation differently
 * or backend may return warnings instead of errors
 */
test.describe('Reports Form Validation', () => {

  let reportsPage;
  
  test.beforeEach(async ({ page }) => {
    reportsPage = await loginAsE2EAdminAndNavigateToReports(page);
  });

  test('should show error when user is not selected for user task completion report', async ({ page }) => {
    await reportsPage.selectReportType('user');
    await reportsPage.setStartDate('2024-01-01');
    await reportsPage.setEndDate('2024-01-31');
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about missing userId
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('should show error when project is not selected for project task completion report', async ({ page }) => {
    await reportsPage.selectReportType('project');
    await reportsPage.setStartDate('2024-01-01');
    await reportsPage.setEndDate('2024-01-31');
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about missing projectId
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('should show error when project is not selected for team summary report', async ({ page }) => {
    await reportsPage.selectReportType('team-summary');
    await reportsPage.setStartDate('2024-01-01');
    await reportsPage.selectTimeframe('week');
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about missing projectId
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('should show error when project is not selected for logged time report', async ({ page }) => {
    await reportsPage.selectReportType('logged-time');
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about missing projectId
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('should show error when department is not selected for department logged time report', async ({ page }) => {
    await reportsPage.selectReportType('logged-time-department');
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about missing department
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('should show error for invalid date range (end before start)', async ({ page }) => {
    const users = getTestUsers();
    
    await reportsPage.selectReportType('user');
    await reportsPage.selectUser(users.adminDisplay);
    await reportsPage.setStartDate('2024-01-31');
    await reportsPage.setEndDate('2024-01-01');
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about invalid date range
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('should show error when start date is missing for user task completion report', async ({ page }) => {
    const users = getTestUsers();
    
    await reportsPage.selectReportType('user');
    await reportsPage.selectUser(users.adminDisplay);
    // Don't set start date
    await reportsPage.setEndDate('2024-01-31');
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about missing/invalid start date
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });

  test('should show error when end date is missing for project task completion report', async ({ page }) => {
    const projects = getTestProjects();
    
    await reportsPage.selectReportType('project');
    await reportsPage.selectProject(projects.main);
    await reportsPage.setStartDate('2024-01-01');
    // Don't set end date
    await reportsPage.selectFormat('pdf');
    await reportsPage.submitForm();
    
    // Wait for backend validation error to appear
    await page.waitForTimeout(1500);
    
    // Backend should return error about missing/invalid end date
    const hasError = await reportsPage.hasError();
    expect(hasError).toBe(true);
  });
});

/**
 * Task Completion Reports - Happy Path Tests
 */
test.describe('Task Completion Reports - User', () => {
  
  let reportsPage;
  
  test.beforeEach(async ({ page }) => {
    reportsPage = await loginAsE2EAdminAndNavigateToReports(page);
  });

  test('should generate user task completion report PDF for January', async ({ page }) => {
    const users = getTestUsers();
    const dates = getTestDateRanges();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateUserTaskCompletionReport(
        users.managerDisplay,
        dates.january.start,
        dates.january.end,
        'pdf'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should generate user task completion report Excel for January', async ({ page }) => {
    const users = getTestUsers();
    const dates = getTestDateRanges();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateUserTaskCompletionReport(
        users.staffEngDisplay,
        dates.january.start,
        dates.january.end,
        'excel'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should handle no data for user with no tasks', async ({ page }) => {
    const users = getTestUsers();
    const dates = getTestDateRanges();
    
    // Use February date range where NO tasks exist
    await reportsPage.generateUserTaskCompletionReport(
      users.staffConsultancyDisplay,
      dates.february.start,
      dates.february.end,
      'pdf'
    );
    
    // Should show warning about no data
    await page.waitForTimeout(2000);
    const hasWarning = await reportsPage.hasWarning();
    expect(hasWarning).toBe(true);
  });
});

test.describe('Task Completion Reports - Project', () => {
  
  let reportsPage;
  
  test.beforeEach(async ({ page }) => {
    reportsPage = await loginAsE2EAdminAndNavigateToReports(page);
  });

  test('should generate project task completion report PDF for main project', async ({ page }) => {
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateProjectTaskCompletionReport(
        projects.main,
        dates.january.start,
        dates.january.end,
        'pdf'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should generate project task completion report Excel for main project', async ({ page }) => {
    
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateProjectTaskCompletionReport(
        projects.main,
        dates.january.start,
        dates.january.end,
        'excel'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should handle no data for project with minimal tasks', async ({ page }) => {
    
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    // Use January for minimal project (minimal project tasks are in February)
    await reportsPage.generateProjectTaskCompletionReport(
      projects.minimal,
      dates.january.start,
      dates.january.end,
      'pdf'
    );
    
    // Should show warning about no data
    await page.waitForTimeout(2000);
    const hasWarning = await reportsPage.hasWarning();
    expect(hasWarning).toBe(true);
  });
});

/**
 * Team Summary Reports
 */
test.describe('Team Summary Reports', () => {
  
  let reportsPage;
  
  test.beforeEach(async ({ page }) => {
    reportsPage = await loginAsE2EAdminAndNavigateToReports(page);
  });

  test('should generate team summary PDF for first week', async ({ page }) => {
    
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateTeamSummaryReport(
        projects.main,
        dates.firstWeek.start,
        'week',
        'pdf'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should generate team summary Excel for entire month', async ({ page }) => {
    
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateTeamSummaryReport(
        projects.main,
        dates.entireMonth.start,
        'month',
        'excel'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should handle team summary for second week', async ({ page }) => {
    
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateTeamSummaryReport(
        projects.main,
        dates.secondWeek.start,
        'week',
        'pdf'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should handle no data for minimal project team summary', async ({ page }) => {
    
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    await reportsPage.generateTeamSummaryReport(
      projects.minimal,
      dates.january.start,
      'week',
      'pdf'
    );
    
    // Should show warning about no data
    await page.waitForTimeout(2000);
    const hasWarning = await reportsPage.hasWarning();
    expect(hasWarning).toBe(true);
  });
});

/**
 * Logged Time Reports - Project
 */
test.describe('Logged Time Reports - Project', () => {
  
  let reportsPage;
  
  test.beforeEach(async ({ page }) => {
    reportsPage = await loginAsE2EAdminAndNavigateToReports(page);
  });

  test('should generate logged time PDF for main project', async ({ page }) => {
    
    const projects = getTestProjects();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateProjectLoggedTimeReport(
        projects.main,
        'pdf'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should generate logged time Excel for main project', async ({ page }) => {
    
    const projects = getTestProjects();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateProjectLoggedTimeReport(
        projects.main,
        'excel'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should exclude archived tasks from logged time report', async ({ page }) => {
    
    const projects = getTestProjects();
    
    // Generate report for archived project (should have no data since tasks are archived)
    await reportsPage.generateProjectLoggedTimeReport(
      projects.archived,
      'pdf'
    );
    
    // Should show warning about no data (archived tasks excluded)
    await page.waitForTimeout(2000);
    const hasWarning = await reportsPage.hasWarning();
    expect(hasWarning).toBe(true);
  });
});

/**
 * Logged Time Reports - Department
 */
test.describe('Logged Time Reports - Department', () => {
  
  let reportsPage;
  
  test.beforeEach(async ({ page }) => {
    reportsPage = await loginAsE2EAdminAndNavigateToReports(page);
  });

  test('should generate department logged time PDF for Engineering', async ({ page }) => {
    
    const departments = getTestDepartments();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateDepartmentLoggedTimeReport(
        departments.engineering,
        'pdf'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should generate department logged time Excel for Sales', async ({ page }) => {
    
    const departments = getTestDepartments();
    
    // Generate report and verify download triggered
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateDepartmentLoggedTimeReport(
        departments.sales,
        'excel'
      );
    });
    
    expect(downloadTriggered).toBe(true);
  });
});

/**
 * Edge Cases and Error Handling
 */
test.describe('Reports Edge Cases', () => {
  
  let reportsPage;
  
  test.beforeEach(async ({ page }) => {
    reportsPage = await loginAsE2EAdminAndNavigateToReports(page);
  });

  test('should handle future date range with no data', async ({ page }) => {
    
    const users = getTestUsers();
    const dates = getTestDateRanges();
    
    await reportsPage.generateUserTaskCompletionReport(
      users.managerDisplay,
      dates.future.start,
      dates.future.end,
      'pdf'
    );
    
    // Should show warning about no data
    await page.waitForTimeout(2000);
    const hasWarning = await reportsPage.hasWarning();
    expect(hasWarning).toBe(true);
  });

  test('should handle very narrow date range (single day)', async ({ page }) => {
    
    const projects = getTestProjects();
    
    // Generate report for single day
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateProjectTaskCompletionReport(
        projects.main,
        '2024-01-05',
        '2024-01-05',
        'pdf'
      );
    });
    
    // Should either succeed or show no data warning
    expect(downloadTriggered || await reportsPage.hasWarning()).toBe(true);
  });

  test('should switch between different report types seamlessly', async ({ page }) => {
    
    const users = getTestUsers();
    const projects = getTestProjects();
    const dates = getTestDateRanges();
    
    // Generate user report
    await reportsPage.selectReportType('user');
    await reportsPage.selectUser(users.managerDisplay);
    await reportsPage.setStartDate(dates.january.start);
    await reportsPage.setEndDate(dates.january.end);
    await reportsPage.selectFormat('pdf');
    
    // Switch to project report without submitting
    await reportsPage.selectReportType('project');
    await reportsPage.selectProject(projects.main);
    
    // Submit project report
    const downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.submitForm();
    });
    
    expect(downloadTriggered).toBe(true);
  });

  test('should handle multiple consecutive report generations', async ({ page }) => {
    
    const projects = getTestProjects();
    
    // Generate first report
    let downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateProjectLoggedTimeReport(projects.main, 'pdf');
    });
    expect(downloadTriggered).toBe(true);
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Navigate back to reports (in case of redirect)
    await reportsPage.goto();
    
    // Generate second report
    downloadTriggered = await checkDownloadTriggered(page, async () => {
      await reportsPage.generateProjectLoggedTimeReport(projects.main, 'excel');
    });
    expect(downloadTriggered).toBe(true);
  });
});
