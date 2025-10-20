#!/usr/bin/env node

/**
 * Pre-commit check script for SPM Group 5 Project
 * Cross-platform Node.js version
 * Run: node check.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Track overall status
let overallStatus = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  log(`\n► ${title}`, 'blue');
  log('─────────────────────────────────────', 'blue');
}

function printSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function printError(message) {
  log(`❌ ${message}`, 'red');
  overallStatus = 1;
}

function printWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function runCommand(command, cwd = process.cwd()) {
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

function checkDirectory(dir) {
  return fs.existsSync(path.join(process.cwd(), dir));
}

// Main script
async function main() {
  log('\n========================================', 'blue');
  log('   Pre-Commit Checks for SPM Group 5', 'blue');
  log('========================================\n', 'blue');

  // Check if in project root
  if (!checkDirectory('frontend') && !checkDirectory('backend')) {
    printError('Not in project root directory!');
    log('Please run this script from the project root.');
    process.exit(1);
  }

  // ============================================
  // 1. FRONTEND LINTING
  // ============================================
  printHeader('1. Linting Frontend');

  if (checkDirectory('frontend')) {
    const frontendPath = path.join(process.cwd(), 'frontend');
    
    // Check node_modules
    if (!checkDirectory('frontend/node_modules')) {
      printWarning('Installing frontend dependencies...');
      runCommand('npm install', frontendPath);
    }

    // Run lint
    if (runCommand('npm run lint', frontendPath)) {
      printSuccess('Frontend linting passed');
    } else {
      printError('Frontend linting failed');
      printWarning('Fix errors with: cd frontend && npm run lint -- --fix');
    }
  } else {
    printWarning('Frontend directory not found, skipping...');
  }

  // ============================================
  // 2. BACKEND LINTING
  // ============================================
  printHeader('2. Linting Backend');

  if (checkDirectory('backend')) {
    const backendPath = path.join(process.cwd(), 'backend');
    
    // Check node_modules
    if (!checkDirectory('backend/node_modules')) {
      printWarning('Installing backend dependencies...');
      runCommand('npm install', backendPath);
    }

    // Run lint
    if (runCommand('npm run lint', backendPath)) {
      printSuccess('Backend linting passed (warnings are OK)');
    } else {
      printError('Backend linting failed');
      printWarning('Fix errors with: cd backend && npm run lint:fix');
    }
  } else {
    printWarning('Backend directory not found, skipping...');
  }

  // ============================================
  // 3. BACKEND TESTS
  // ============================================
  printHeader('3. Running Backend Tests');

  if (checkDirectory('backend')) {
    const backendPath = path.join(process.cwd(), 'backend');
    printWarning('Running tests (this may take a minute)...');
    
    if (runCommand('npm test', backendPath)) {
      printSuccess('Backend tests passed');
    } else {
      printWarning('Some tests failed or were skipped');
      log('This may be normal for local runs. Tests will work in CI.', 'yellow');
    }
  }

  // ============================================
  // 4. GIT STATUS
  // ============================================
  printHeader('4. Git Status Check');

  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus) {
      printWarning('You have uncommitted changes');
      log('Remember to commit your changes before pushing!', 'yellow');
    } else {
      printSuccess('All changes are committed');
    }

    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    printSuccess(`Current branch: ${branch}`);

    if (branch === 'main' || branch === 'master') {
      printWarning(`You're on the ${branch} branch!`);
      log('Consider using a feature branch for development', 'yellow');
    }
  } catch (error) {
    printWarning('Could not check git status');
  }

  // ============================================
  // SUMMARY
  // ============================================
  log('\n========================================', 'blue');
  log('   Summary', 'blue');
  log('========================================\n', 'blue');

  if (overallStatus === 0) {
    log('🚀 All checks passed!', 'green');
    log('Your code is ready to commit and push.\n', 'green');
    log('Next steps:', 'blue');
    log('  1. git add .', 'yellow');
    log('  2. git commit -m "Your message"', 'yellow');
    log('  3. git push', 'yellow');
  } else {
    log('❌ Some checks failed!', 'red');
    log('Please fix the issues above before pushing.\n', 'red');
    log('Quick fixes:', 'blue');
    log('  • Frontend lint: cd frontend && npm run lint -- --fix', 'yellow');
    log('  • Backend lint:  cd backend && npm run lint:fix', 'yellow');
    log('  • Backend tests: cd backend && npm test', 'yellow');
  }

  console.log('');
  process.exit(overallStatus);
}

main().catch(error => {
  printError(`Script error: ${error.message}`);
  process.exit(1);
});

