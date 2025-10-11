// Vitest configuration for CommonJS project
export default {
  test: {
    environment: 'node',
    globals: true, // Enable Vitest globals like describe, it, expect
    setupFiles: ['src/test/setup.js'], // Include our test setup file
    css: false, // Disable CSS handling
    testTimeout: 20000, // 20 second timeout for tests
    hookTimeout: 30000, // 30 second timeout for hooks (setup/teardown)
    pool: 'forks', // Run tests in separate processes to avoid connection conflicts
    poolOptions: {
      forks: {
        singleFork: true // Run all tests in a single fork to share the connection
      }
    },
    coverage: {
      provider: 'v8', // Use V8 for coverage
      reporter: ['text', 'json', 'html'], // Generate coverage reports in text, JSON, and HTML formats
      all: true,
      include: [ // Specify the files for which you want coverage
        'src/services/**/*.js',     
        'src/controllers/**/*.js',  
        'src/models/**/*.js',       
        'src/routes/**/*.js'      
      ],
      exclude: [ // Exclude files and directories that should not be part of coverage
        'node_modules/**',
        'tests/**',
        'src/**/*.test.js',        
        'src/**/*.spec.js',         
        'coverage/**',
        'config/**',
        'environments/**'           // Exclude your env files
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
  },
};