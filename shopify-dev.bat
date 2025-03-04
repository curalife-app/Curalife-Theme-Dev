@echo off
echo ======================================================================
echo CURALIFE SHOPIFY THEME DEVELOPMENT
echo ======================================================================
echo.

rem Use relative path to avoid spaces issues
set BUILD_DIR=Curalife-Theme-Build

rem Set environment variables for better networking
set NODE_OPTIONS=--max-http-header-size=16384
set NODE_NO_WARNINGS=1
set UV_THREADPOOL_SIZE=64
set FETCH_KEEPALIVE_TIMEOUT_MS=60000
set FETCH_MAX_RESPONSE_SIZE=100000000
set SHOPIFY_CLI_STACKTRACE=1

rem Set primary and fallback stores
set PRIMARY_STORE=curalife-commerce.myshopify.com
set FALLBACK_STORE_1=curalife-commerce-sia.myshopify.com
set FALLBACK_STORE_2=staging-curalife.myshopify.com

rem If a store parameter is provided, use that instead of the fallback sequence
if not "%1"=="" (
    set STORE=%1
    goto :build
)

rem Otherwise, we'll try the stores in sequence
set STORE=%PRIMARY_STORE%

:build
echo Building theme...
call npm run build

echo.
echo Trying to connect to store: %STORE%
echo.

rem First, attempt the primary store
echo Attempting to connect to: %STORE%
shopify theme dev --path %BUILD_DIR% -s %STORE%
if %ERRORLEVEL% EQU 0 goto :end

rem If we're here, the primary store failed and no custom store was specified
if not "%1"=="" goto :failed

rem Try first fallback store
echo.
echo Connection to %STORE% failed. Trying fallback store...
echo.
set STORE=%FALLBACK_STORE_1%
echo Attempting to connect to: %STORE%
shopify theme dev --path %BUILD_DIR% -s %STORE%
if %ERRORLEVEL% EQU 0 goto :end

rem Try second fallback store
echo.
echo Connection to %STORE% failed. Trying final fallback store...
echo.
set STORE=%FALLBACK_STORE_2%
echo Attempting to connect to: %STORE%
shopify theme dev --path %BUILD_DIR% -s %STORE%
if %ERRORLEVEL% EQU 0 goto :end

:failed
echo.
echo All connection attempts failed.
echo If you continue to have issues, try:
echo 1. Running 'shopify auth logout' followed by 'shopify auth'
echo 2. Updating Node.js and Shopify CLI
echo 3. Checking your network connection
echo 4. Verifying you have access to the store
goto :end

:end
exit /b %ERRORLEVEL%