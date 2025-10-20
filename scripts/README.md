# Pre-Commit Check Scripts

## ⚡ Quick Start

**Run before every commit:**

```bash
# macOS/Linux
./scripts/check.sh

# Windows
scripts\check.bat

# Cross-platform (Node.js)
node scripts/check.js
```

### ✅ Success Output

```
🚀 All checks passed!
Your code is ready to commit and push.
```

### ❌ Fix Errors Quickly

```bash
# Auto-fix frontend
cd frontend && npm run lint -- --fix

# Auto-fix backend
cd backend && npm run lint:fix

# Run tests
cd backend && npm test
```

---

## 📋 What Does It Check?

The script performs 4 automated checks:

1. **✅ Frontend Linting** - Checks for code style and syntax errors
2. **✅ Backend Linting** - Checks for code style and syntax errors
3. **✅ Backend Tests** - Runs all unit tests
4. **✅ Git Status** - Shows uncommitted changes and current branch

---

## 🎯 Recommended Workflow

```bash
# 1. Make your changes
(edit files)

# 2. Run pre-commit checks
./scripts/check.sh

# 3. Fix any issues (if checks fail)
cd frontend && npm run lint -- --fix
cd backend && npm run lint:fix

# 4. Commit and push
git add .
git commit -m "feat: add new feature"
git push
```

---

## 🛠️ Manual Checks (Alternative)

If you prefer to run checks manually:

### Frontend Lint

```bash
cd frontend
npm run lint              # Check for errors
npm run lint -- --fix     # Auto-fix issues
```

### Backend Lint

```bash
cd backend
npm run lint              # Check for errors
npm run lint:fix          # Auto-fix issues
```

### Backend Tests

```bash
cd backend
npm test                  # Run all tests
npm run test:watch        # Watch mode (during development)
npm run test:coverage     # Generate coverage report
```

---

## ❌ Common Errors & Solutions

### Frontend Linting Failed

**Problem:** ESLint found errors in your React/JavaScript code.

**Solution:**

```bash
cd frontend
npm run lint -- --fix  # Auto-fix most issues
npm run lint           # Check remaining issues
```

**Common Issues:**

- **Unused variables** → Remove them or prefix with `_`
- **Missing dependencies in useEffect** → Add to dependency array
- **Incorrect prop types** → Fix the prop types
- **Missing key prop** → Add unique key to list items

---

### Backend Linting Failed

**Problem:** ESLint found errors in your Node.js code.

**Solution:**

```bash
cd backend
npm run lint:fix  # Auto-fix most issues
npm run lint      # Check remaining issues
```

**Common Issues:**

- **Unused variables** → Remove or prefix with `_`
- **Unnecessary try/catch** → Remove if just re-throwing
- **Duplicate keys in objects** → Use correct MongoDB operators
- **console.log statements** → These are allowed (warnings only)

---

### Backend Tests Failed

**Problem:** Unit tests are not passing.

**Solution:**

1. Check the test output for specific failures
2. Fix the failing tests or code
3. Re-run: `npm test`

**Note:** Some tests may fail locally due to MongoDB Memory Server issues (AVX instruction support). These will pass in CI.

**Common Issues:**

- **Timeout errors** → Normal for local MongoDB setup, will pass in CI
- **Lock file errors** → Race condition with parallel tests, will pass in CI
- **Test data conflicts** → Check beforeEach/afterEach cleanup

---

### Uncommitted Changes Warning

**Problem:** You have uncommitted changes.

**What to do:**

```bash
# Check what's changed
git status

# Stage and commit your changes
git add .
git commit -m "Your commit message"
```

---

### On Main/Master Branch Warning

**Problem:** You're committing directly to main/master branch.

**Best practice:**

```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make your changes and commit
git add .
git commit -m "feat: add my feature"

# Push to remote
git push origin feature/my-feature

# Then create a Pull Request on GitHub
```

---

## 📊 Understanding Check Results

### ✅ All Checks Passed

```
🚀 All checks passed!
Your code is ready to commit and push.

Next steps:
  1. git add .
  2. git commit -m "Your message"
  3. git push
```

**Action:** Proceed with commit and push! ✨

---

### ❌ Some Checks Failed

```
❌ Some checks failed!
Please fix the issues above before pushing.

Quick fixes:
  • Frontend lint: cd frontend && npm run lint -- --fix
  • Backend lint:  cd backend && npm run lint:fix
  • Backend tests: cd backend && npm test
```

**Action:** Review errors, fix them, and run checks again.

---

### ⚠️ Warnings Only

```
⚠️  Backend linting passed (warnings are OK)
```

**Action:** Warnings won't block CI, but consider fixing them for better code quality.

---

## 🔧 Troubleshooting

### "Command not found: npm"

**Solution:** Install Node.js from https://nodejs.org/

### "Permission denied: ./scripts/check.sh"

**Solution:** Make it executable:

```bash
chmod +x scripts/check.sh
```

### "node_modules not found"

**Solution:** Install dependencies:

```bash
cd frontend && npm install
cd ../backend && npm install
```

### "Git not recognized"

**Solution:** Install Git from https://git-scm.com/

### Script hangs or takes too long

**Solution:**

- Tests may take 30-60 seconds (normal)
- Check if MongoDB is downloading (first run)
- Press Ctrl+C and try again

---

## 🎯 Best Practices

### ✅ DO:

- ✅ Run checks before every commit
- ✅ Fix linting errors immediately
- ✅ Keep tests passing
- ✅ Use feature branches for development
- ✅ Write meaningful commit messages
- ✅ Review warnings and fix when possible

### ❌ DON'T:

- ❌ Skip checks to "save time" (CI will fail anyway)
- ❌ Commit broken code
- ❌ Push directly to main/master
- ❌ Ignore warnings (they indicate code quality issues)
- ❌ Comment out tests to make them pass
- ❌ Use `--no-verify` to bypass checks

---

## 💡 Pro Tips

### Tip 1: Create a Shell Alias (macOS/Linux)

```bash
# Add to ~/.zshrc or ~/.bashrc
alias precheck="./scripts/check.sh"

# Then just run:
precheck
```

### Tip 2: Add npm Script (Project Root)

Create a `package.json` in the root:

```json
{
  "scripts": {
    "check": "node scripts/check.js"
  }
}
```

Then run: `npm run check`

### Tip 3: Use Git Hooks with Husky (Automatic Checks)

```bash
npm install --save-dev husky
npx husky init
echo "node scripts/check.js" > .husky/pre-commit
```

This automatically runs checks before every commit!

### Tip 4: IDE Integration

- Install ESLint extension in VS Code
- Enable "Format on Save"
- See errors in real-time as you code
- Fix issues before running the script

### Tip 5: Speed Up Checks

- Keep `node_modules` installed
- Use `npm run lint -- --fix` to auto-fix issues
- Run tests in watch mode during development: `npm run test:watch`

---

## 🔍 What Each Tool Checks

### ESLint (Frontend & Backend)

```javascript
// ✅ Catches syntax errors
const y = ;  // Error: unexpected token

// ✅ Catches unused variables
const x = 5;  // Warning: 'x' is never used

// ✅ Catches code style issues
if(x==5){}  // Warning: use === instead of ==

// ✅ Catches potential bugs
if (x = 5) {}  // Error: assignment in condition
```

### Vitest (Backend Tests)

```javascript
// ✅ Validates business logic
describe('Task Service', () => {
  it('should create a task', () => {
    // Tests your code works correctly
  });
});

// ✅ Catches regressions
// Ensures new changes don't break existing features

// ✅ Validates API responses
// Ensures endpoints return correct data
```

---

## 📚 Additional Resources

- **ESLint Documentation:** https://eslint.org/docs/rules/
- **React ESLint Plugin:** https://github.com/jsx-eslint/eslint-plugin-react
- **Vitest Documentation:** https://vitest.dev/
- **Git Best Practices:** https://git-scm.com/book/en/v2

---

## 🚀 Next Steps: Add SonarQube (Optional)

Want more advanced code quality checks? Consider adding SonarQube:

### Benefits:

- 🔒 Security vulnerability scanning
- 📊 Code complexity metrics
- 📈 Technical debt tracking
- 🎯 Quality gates enforcement
- 📉 Test coverage analysis

### Setup:

1. Sign up at https://sonarcloud.io/ (free for public repos)
2. Add your repository
3. Get your `SONAR_TOKEN`
4. Add to `.github/workflows/ci.yml`:

```yaml
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@master
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

**ESLint + SonarQube = Industry Standard!** 🎯

---

## 📁 Project Structure

```
project-root/
├── scripts/
│   ├── README.md           # This file
│   ├── check.sh            # Bash script (macOS/Linux)
│   ├── check.bat           # Batch script (Windows)
│   └── check.js            # Node.js script (cross-platform)
├── frontend/
│   ├── package.json
│   ├── eslint.config.js    # Frontend linting rules
│   └── src/
├── backend/
│   ├── package.json
│   ├── eslint.config.js    # Backend linting rules
│   └── src/
└── .github/
    └── workflows/
        └── ci.yml          # CI configuration
```

---

## ❓ FAQs

### Q: Do I need to run this every time?

**A:** Yes! It takes ~10-30 seconds and saves hours of CI debugging.

### Q: What if tests fail locally but I know they'll pass in CI?

**A:** That's okay! MongoDB issues are common locally. The script will warn but still pass.

### Q: Can I skip checks in an emergency?

**A:** Not recommended! But if absolutely necessary: `git commit --no-verify`

### Q: Why are there warnings after the script passes?

**A:** Warnings won't block CI. They're code quality suggestions you can fix later.

### Q: How do I update the scripts?

**A:** Pull the latest changes from the repo. The scripts are version-controlled.

### Q: Can I customize the checks?

**A:** Yes! Edit the script files in `scripts/` or the ESLint configs.

---

## 🆘 Need Help?

1. **Check this guide** - Most issues are covered above
2. **Ask your team lead** - They can help with project-specific issues
3. **Check CI logs** - Compare local vs CI results
4. **Read ESLint errors** - They usually explain the fix
5. **Review test output** - Look for specific failure messages

---

## 📝 Quick Command Reference

```bash
# Run all checks
./scripts/check.sh                        # macOS/Linux
scripts\check.bat                         # Windows
node scripts/check.js                     # Any platform

# Fix frontend issues
cd frontend && npm run lint -- --fix

# Fix backend issues
cd backend && npm run lint:fix

# Run tests
cd backend && npm test

# Check git status
git status

# Create feature branch
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "feat: my changes"
git push
```

---

**Happy coding! 🎉** Remember: **Run checks → Fix issues → Commit → Push** ✨
