import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Testing
 * 
 * This configuration is set up for local development and manual testing.
 * No CI/CD integration - run tests whenever you want!
 */
export default defineConfig({
  // Test directory
  testDir: './e2e/tests',
  
  // Test match pattern - only .js files in tests directory
  testMatch: '**/*.spec.js',
  
  // Run tests serially to avoid database race conditions
  fullyParallel: false,
  
  // Number of workers (1 = serial execution, prevents duplicate key errors)
  workers: 1,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on failure (0 for local dev - see failures immediately)
  retries: 0,
  
  // Timeout for each test (30 seconds)
  timeout: 30 * 1000,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'e2e/test-results/html-report' }],
    ['list'],
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for your frontend
    baseURL: 'http://localhost:5173',
    
    // Collect trace on first retry (for debugging)
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors (for local testing)
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test in Firefox and WebKit
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration
  // Automatically start dev servers before running tests
  webServer: [
    {
      command: 'cd backend && node server.js',
      url: 'http://localhost:3000',
      reuseExistingServer: true, // Reuse if already running
      timeout: 120 * 1000, // 2 minutes to start
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true, // Reuse if already running
      timeout: 120 * 1000, // 2 minutes to start
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});

