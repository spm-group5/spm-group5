// Vitest configuration for CommonJS project
export default {
  test: {
    environment: 'node',
    globals: true, // Enable Vitest globals like describe, it, expect
    setupFiles: ['src/test/setup.js'], // Include our test setup file
    css: false, // Disable CSS handling
    testTimeout: 30000, // 30 second timeout for tests - allows integration tests to complete
    hookTimeout: 60000, // 60 second timeout for hooks (setup/teardown) - allows MongoMemoryServer startup
    pool: 'threads'
    },
    coverage: {
      provider: 'v8', // Use V8 for coverage
      reporter: ['text', 'json', 'html'], // Generate coverage reports in text, JSON, and HTML formats
      all: true,
      include: [ // Specify the files for which you want coverage
        'src/services/**/*.js',
        'src/controllers/**/*.js',
        'src/models/**/*.js',
        'src/routes/**/*.js',
        '!src/**/*.test.js',        // Exclude test files
        '!src/**/*.spec.js',
        '!src/**/*test*.js',
        '!src/**/*.backup.js',
        '!src/config/**',
        '!src/app.js'
      ],
      exclude: [ // Exclude files and directories that should not be part of coverage
        'node_modules/**',
        'tests/**',
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'src/**/*test*.js',         // Exclude test scripts like test-deadline-notifications.js
        'src/**/*.backup.js',       // Exclude backup files like report.router.test.backup.js
        'src/config/**',            // Exclude config files
        'coverage/**',
        'environments/**',          // Exclude env files
        'server.js',                // Exclude entry point
        'src/app.js'                // Exclude app setup file
      ],
      thresholds: { // Set coverage thresholds
        global: {
          branches: 80, // Minimum 80% branch coverage
          functions: 80, // Minimum 80% function coverage
          lines: 80,// Minimum 80% line coverage
          statements: 80 // Minimum 80% statement coverage
        }
      }
    },
};