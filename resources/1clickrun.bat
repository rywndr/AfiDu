REM bat file optimized for windows, 1 click to start project
@echo off
set PROJECT_DIR="C:\path\to\project"
set ERROR_FLAG=0

echo Changing directory to %PROJECT_DIR%
cd /D %PROJECT_DIR%
if %ERRORLEVEL% neq 0 (
    echo Failed to change directory to %PROJECT_DIR%. Ensure PROJECT_DIR is correct.
    set ERROR_FLAG=1
    goto end_script
)

REM Activate virtual environment
echo Activating Python virtual environment...
call .\.venv\Scripts\activate
if %ERRORLEVEL% neq 0 (
    echo Failed to activate virtual environment. Ensure it exists in %PROJECT_DIR% and is set up correctly.
    set ERROR_FLAG=1
    goto end_script
)

REM Pull latest changes from Git
echo Pulling latest changes from Git in %PROJECT_DIR%...
git pull
if %ERRORLEVEL% neq 0 (
    echo Git pull failed. Check for conflicts or network issues.
    set ERROR_FLAG=1
    goto end_script
)

REM Install/update Python deps
echo Installing Python dependencies from requirements.txt in %PROJECT_DIR%...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo Failed to install Python dependencies. Check requirements.txt and your internet connection.
    set ERROR_FLAG=1
    goto end_script
)

REM Change dir to the 'src' folder
echo Changing directory to %PROJECT_DIR%\src
cd src
if %ERRORLEVEL% neq 0 (
    echo Failed to change directory to 'src'. Ensure the 'src' folder exists in %PROJECT_DIR%.
    set ERROR_FLAG=1
    goto end_script
)

REM Run database migrations
echo Running database migrations from 'src' directory...
python manage.py migrate
if %ERRORLEVEL% neq 0 (
    echo Database migration failed. Check database connection and migration files.
    set ERROR_FLAG=1
    goto end_script
)

REM Install node deps
echo Installing Node.js dependencies from 'src' directory...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Failed to install Node.js dependencies. Check package.json in 'src', your internet connection, or if 'npm' is correctly in your PATH.
    set ERROR_FLAG=1
    goto end_script
)

REM Start Tailwind CSS compiler in a new window
echo Starting Tailwind CSS compiler...
start "TailwindCSS" npx tailwindcss -i ./static/src/input.css -o ./static/src/output.css --watch

REM Give Tailwind a moment to start
timeout /t 5 /nobreak >nul

REM Start Django dev server
echo Starting Django development server...
start "Django Server" /B python manage.py runserver

REM Give server a moment to start
timeout /t 5 /nobreak >nul

REM Open app in default browser
echo Opening application in browser...
start http://127.0.0.1:8000

:end_script
if %ERROR_FLAG% equ 1 (
    echo.
    echo **************************************************
    echo *  An error occurred. Please check the messages above. *
    echo **************************************************
) else (
    echo.
    echo AfiDu development environment should be up and running.
    echo Django server and Tailwind CSS watcher are running in separate windows.
)

echo.
echo This window will close in 30 seconds if no key is pressed, or press any key to close it now.
timeout /t 30