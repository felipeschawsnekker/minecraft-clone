@echo off
cd /d "%~dp0"

where python >nul 2>nul
if not errorlevel 1 (
    python -m http.server 8000
    exit /b
)

set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if exist "%PYEXE%" (
    "%PYEXE%" -m http.server 8000
    exit /b
)

echo Python nao foi encontrado.
echo Instale o Python 3.12 e marque "Add Python to PATH".
echo https://www.python.org/downloads/windows/
pause
