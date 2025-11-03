/**
 * Authentication E2E Tests
 * 
 * Tests login, logout, and access control functionality.
 * 
 * Test Data Lifecycle:
 * - beforeAll: Create test users ONCE for entire file
 * - tests: Run authentication tests
 * - afterAll: Clean up test users ONCE at the end
 */

import { test, expect } from '@playwright/test';
import { createE2EUsers, cleanupE2EData } from '../utils/db-helpers.js';
import { LoginPage } from '../fixtures/pages/login-page.js';
import { loginAsAdmin, loginAsManager, loginAsStaff } from '../fixtures/auth-helpers.js';

// Setup: Create test users ONCE before all tests in this file
test.beforeAll(async () => {
  console.log('Setting up test users for authentication tests...');
  await cleanupE2EData(); // Clean first in case of previous failures
  await createE2EUsers();
});

// Cleanup: Delete test users ONCE after all tests in this file
test.afterAll(async () => {
  console.log('Cleaning up test users...');
  await cleanupE2EData();
});

test.describe('Authentication', () => {

  test.describe('Login Functionality', () => {
    
    test('Admin can login with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.loginAsAdmin();
      
      // Verify redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify welcome heading is visible
      await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    });

    test('Manager can login with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.loginAsManager();
      
      // Verify redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify welcome heading is visible
      await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    });

    test('Staff can login with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.loginAsStaff();
      
      // Verify redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify welcome heading is visible
      await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
    });

    test('Cannot login with invalid username', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      // Attempt login with invalid username
      await loginPage.attemptLogin('invalid@test.com', 'Test@123');
      
      // Wait a moment for error to appear
      await page.waitForTimeout(1000);
      
      // Should stay on login page
      await expect(page).toHaveURL(/.*login/);
      
      // Error message should appear
      const hasError = await loginPage.hasError();
      expect(hasError).toBeTruthy();
    });

    test('Cannot login with invalid password', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      // Attempt login with wrong password
      await loginPage.attemptLogin('e2e-admin@test.com', 'WrongPassword123');
      
      // Wait a moment for error
      await page.waitForTimeout(1000);
      
      // Should stay on login page
      await expect(page).toHaveURL(/.*login/);
      
      // Error should be visible
      const hasError = await loginPage.hasError();
      expect(hasError).toBeTruthy();
    });

    test('Cannot login with empty fields', async ({ page }) => {
      await page.goto('/login');
      
      // Click submit without filling fields
      await page.click('button[type="submit"]');
      
      // Should stay on login page
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Access Control', () => {
    
    test('Unauthenticated user redirected to login', async ({ page }) => {
      // Try to access protected route without logging in
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('Admin can access reports page', async ({ page }) => {
      // Login as admin (HR user with admin role)
      await loginAsAdmin(page);
      
      // Navigate to reports
      await page.goto('/reports');
      
      // Should access reports page successfully
      await expect(page).toHaveURL(/.*reports/);
      await expect(page.getByRole('heading', { name: 'Report Generation', level: 1 })).toBeVisible({ timeout: 5000 });
    });

    test('Staff cannot access reports page', async ({ page }) => {
      // Login as staff
      await loginAsStaff(page);
      
      // Try to access reports
      await page.goto('/reports');
      
      // Wait a moment for redirect
      await page.waitForTimeout(1000);
      
      // Should NOT be on reports page (redirected away)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/reports');
    });

    test('Manager without admin role cannot access reports', async ({ page }) => {
      // Login as manager (no admin role)
      await loginAsManager(page);
      
      // Try to access reports
      await page.goto('/reports');
      
      // Wait a moment
      await page.waitForTimeout(1000);
      
      // Should be redirected away from reports
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/reports');
    });
  });

  test.describe('Session Persistence', () => {
    
    test('Session persists across page navigation', async ({ page }) => {
      // Login
      await loginAsAdmin(page);
      
      // Navigate to different pages
      await page.goto('/tasks');
      await expect(page).toHaveURL(/.*tasks/);
      
      await page.goto('/projects');
      await expect(page).toHaveURL(/.*projects/);
      
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Should still be authenticated (not redirected to login)
    });

    test('Session persists on page reload', async ({ page }) => {
      // Login
      await loginAsAdmin(page);
      
      // Reload page
      await page.reload();
      
      // Should still be on dashboard (session maintained)
      await expect(page).toHaveURL(/.*dashboard/);
    });
  });
});
