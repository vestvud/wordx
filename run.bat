@echo off

cd wordx-app
REM Запускаем node-приложение как фоновый процесс
start "" "test\nodep\node.exe" "test\wordx-app.js"
