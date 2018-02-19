rmdir /s /q build-webui
cd webui
rem call npm update
call yarn
call npm run build
xcopy /s build ..\build-webui\
cd ..