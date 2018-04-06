@echo off
rem To use this, install the 'pkg' package first:
rem
rem npm install -g pkg
rem

call build-webui.bat

mkdir dist
mkdir dist\win64
call pkg -t node8-win-x64 -o dist\win64\mms.exe .
copy ..\sqlitebinaries\node-v57-win32-x64\* dist\win64
copy ..\ffmpegbinaries\win64\* dist\win64

mkdir dist\win32
call pkg -t node8-win-x86 -o dist\win32\mms.exe .
copy ..\sqlitebinaries\node-v57-win32-ia32\* dist\win32
copy ..\ffmpegbinaries\win32\* dist\win32

mkdir dist\mac
call pkg -t node8-macos-x64 -o dist\mac\mms .
copy ..\sqlitebinaries\node-v57-darwin-x64\* dist\mac
copy ..\ffmpegbinaries\macOS\* dist\mac

mkdir dist\linux64
call pkg -t node8-linux-x64 -o dist\linux64\mms .
copy ..\sqlitebinaries\node-v57-linux-x64\* dist\linux64
copy ..\ffmpegbinaries\linux64\* dist\linux64

rem Alternatively through:
rem nexe --build --name server.js
rem but didn't get it to work well