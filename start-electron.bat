@echo off
REM Clear ELECTRON_RUN_AS_NODE to run as Electron (not Node.js)
set ELECTRON_RUN_AS_NODE=
REM Run electron with the main script
"%~dp0node_modules\electron\dist\electron.exe" .
