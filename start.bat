@echo off

if not exist "node_modules\" goto :install
for /d %%i in ("node_modules\*") do goto :start
goto :install

:install
echo Installing dependencies...
call npm install

:start
call npm start
