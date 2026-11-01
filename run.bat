@echo off
cd /d "%~dp0"
where python >nul 2>&1
if errorlevel 1 (echo [X] Python ausente & pause & exit /b 1)
if not exist .venv (echo [^>] Criando venv... & python -m venv .venv)
call .venv\Scripts\activate.bat
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt
echo [^>] http://localhost:5000
python app.py
pause
