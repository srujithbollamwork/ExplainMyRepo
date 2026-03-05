@echo off
echo =======================================
echo    Starting ExplainMyRepo Services
echo =======================================
echo.
echo NOTE: Ensure you have set your GEMINI_API_KEY in backend/.env
echo.

echo Starting FastAPI Backend on Port 8000...
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo Starting Vite+React Frontend on Port 6543...
start cmd /k "cd frontend && npx vite --port 6543 --strictPort"

echo Services have been launched in separate windows!
echo Once they start, you can access the UI at http://localhost:6543
pause
