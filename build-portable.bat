@echo off
rem To use this, install the 'pkg' package first:
rem
rem npm install -g pkg
rem

mkdir dist
mkdir dist\win64
call pkg -t node8-win -o dist\win64\mms.exe .
copy ..\sqlitebinaries\node-v57-win32-x64\* dist\win64

mkdir dist\win32
call pkg -t node8-win -o dist\win32\mms.exe .
copy ..\sqlitebinaries\node-v57-win32-ia32\* dist\win32

rem Alternatively through:
rem nexe --build --name server.js
rem but didn't get it to work well