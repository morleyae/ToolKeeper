@echo off
setlocal
title ToolKeeper Installer
set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\ToolKeeper"

echo.
echo ToolKeeper Installer for Windows
echo ================================
echo.
if not exist "%SOURCE_DIR%CSXS\manifest.xml" (
  echo INSTALLATION STOPPED
  echo Extract the release ZIP and run this installer from its ToolKeeper folder.
  exit /b 1
)
for %%A in ("%SOURCE_DIR%.") do set "SOURCE_FULL=%%~fA"
for %%A in ("%TARGET_DIR%") do set "TARGET_FULL=%%~fA"
if /I "%SOURCE_FULL%"=="%TARGET_FULL%" (
  echo INSTALLATION STOPPED
  echo Run this installer from a freshly extracted release ZIP.
  exit /b 1
)
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
if errorlevel 1 goto :install_failed
xcopy "%SOURCE_DIR%*" "%TARGET_DIR%\" /E /Y /I /H /R >nul
if errorlevel 1 goto :install_failed
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
if errorlevel 1 goto :cep_failed
echo.
echo INSTALLATION COMPLETE
echo Open Window ^> Extensions (Legacy) ^> ToolKeeper in After Effects.
exit /b 0

:install_failed
echo INSTALLATION STOPPED
echo ToolKeeper files could not be copied to:
echo %TARGET_DIR%
exit /b 1

:cep_failed
echo ToolKeeper files were copied, but CEP could not be enabled automatically.
exit /b 1
