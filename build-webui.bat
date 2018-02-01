rmdir /s /q build-webui
cd webui
call npm update
call npm run build
xcopy /s build ..\build-webui\
cd ..