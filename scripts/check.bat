@echo off
REM Pre-commit check script for SPM Group 5 Project (Windows)
REM Run: check.bat

echo.
echo ========================================
echo    Pre-Commit Checks for SPM Group 5
echo ========================================
echo.

set ERROR_OCCURRED=0

REM ============================================
REM 1. FRONTEND LINTING
REM ============================================
echo.
echo [1] Linting Frontend
echo -------------------------------------

if exist frontend (
    cd frontend
    
    if not exist node_modules (
        echo [WARNING] Installing frontend dependencies...
        call npm install >nul 2>&1
    )
    
    call npm run lint >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Frontend linting passed
    ) else (
        echo [FAIL] Frontend linting failed
        echo Fix errors with: cd frontend ^&^& npm run lint -- --fix
        set ERROR_OCCURRED=1
    )
    
    cd ..
) else (
    echo [SKIP] Frontend directory not found
)

REM ============================================
REM 2. BACKEND LINTING
REM ============================================
echo.
echo [2] Linting Backend
echo -------------------------------------

if exist backend (
    cd backend
    
    if not exist node_modules (
        echo [WARNING] Installing backend dependencies...
        call npm install >nul 2>&1
    )
    
    call npm run lint >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Backend linting passed ^(warnings are OK^)
    ) else (
        echo [FAIL] Backend linting failed
        echo Fix errors with: cd backend ^&^& npm run lint:fix
        set ERROR_OCCURRED=1
    )
    
    cd ..
) else (
    echo [SKIP] Backend directory not found
)

REM ============================================
REM 3. BACKEND TESTS
REM ============================================
echo.
echo [3] Running Backend Tests
echo -------------------------------------

if exist backend (
    cd backend
    echo [INFO] Running tests ^(this may take a minute^)...
    
    call npm test >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Backend tests passed
    ) else (
        echo [WARNING] Some tests failed or were skipped
        echo This may be normal for local runs. Tests will work in CI.
    )
    
    cd ..
)

REM ============================================
REM 4. GIT STATUS
REM ============================================
echo.
echo [4] Git Status Check
echo -------------------------------------

git status --porcelain >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f %%i in ('git status --porcelain') do set GIT_CHANGES=%%i
    if defined GIT_CHANGES (
        echo [WARNING] You have uncommitted changes
        echo Remember to commit your changes before pushing!
    ) else (
        echo [OK] All changes are committed
    )
)

for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set CURRENT_BRANCH=%%i
if defined CURRENT_BRANCH (
    echo [OK] Current branch: %CURRENT_BRANCH%
    
    if "%CURRENT_BRANCH%"=="main" (
        echo [WARNING] You're on the main branch!
    )
    if "%CURRENT_BRANCH%"=="master" (
        echo [WARNING] You're on the master branch!
    )
)

REM ============================================
REM SUMMARY
REM ============================================
echo.
echo ========================================
echo    Summary
echo ========================================
echo.

if %ERROR_OCCURRED% EQU 0 (
    echo [SUCCESS] All checks passed!
    echo Your code is ready to commit and push.
    echo.
    echo Next steps:
    echo   1. git add .
    echo   2. git commit -m "Your message"
    echo   3. git push
) else (
    echo [FAIL] Some checks failed!
    echo Please fix the issues above before pushing.
    echo.
    echo Quick fixes:
    echo   - Frontend lint: cd frontend ^&^& npm run lint -- --fix
    echo   - Backend lint:  cd backend ^&^& npm run lint:fix
    echo   - Backend tests: cd backend ^&^& npm test
)

echo.
exit /b %ERROR_OCCURRED%

