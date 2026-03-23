@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"
set "PYTHON_EXE=.venv\Scripts\python.exe"
set "BACKEND_PORT=8001"
set "FRONTEND_PORT=5173"

if not exist "frontend\package.json" (
  echo [ERROR] No se encontro frontend\package.json
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm no esta disponible en PATH. Instala Node.js.
  exit /b 1
)

if not exist "%PYTHON_EXE%" (
  echo [INFO] No existe .venv. Creando entorno virtual...
  where py >nul 2>&1
  if not errorlevel 1 (
    py -3.11 -m venv .venv >nul 2>&1
  ) else (
    python -m venv .venv >nul 2>&1
  )
)

if not exist "%PYTHON_EXE%" (
  echo [ERROR] No se pudo crear/usar .venv\Scripts\python.exe
  exit /b 1
)

echo [INFO] Validando dependencias del backend...
"%PYTHON_EXE%" -c "import fastapi,uvicorn,motor,bcrypt,dotenv" >nul 2>&1
if errorlevel 1 (
  echo [INFO] Instalando dependencias backend...
  "%PYTHON_EXE%" -m pip install --disable-pip-version-check -r backend\requirements.txt
  if errorlevel 1 (
    echo [ERROR] Fallo instalacion de dependencias backend.
    exit /b 1
  )
)

if not exist "frontend\node_modules" (
  echo [INFO] Instalando dependencias frontend...
  pushd frontend
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] Fallo instalacion de dependencias frontend.
    exit /b 1
  )
  popd
)

call :ensure_mongodb
if errorlevel 1 (
  echo [ERROR] MongoDB no pudo iniciarse. Revisa permisos/logs.
  exit /b 1
)

echo Reiniciando servicios en puertos %BACKEND_PORT%, %FRONTEND_PORT% y 3000...
call :stop_port %BACKEND_PORT%
call :stop_port %FRONTEND_PORT%
call :stop_port 3000

echo Iniciando backend y frontend...
start "QR Backend" cmd /k "cd /d ""%ROOT%backend"" && ..\.venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
start "QR Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm start"

echo.
echo Backend:  http://localhost:8001/api/
echo Frontend: http://localhost:5173
echo.
echo Si modificas codigo, puedes relanzar todo con este mismo archivo.

endlocal
exit /b 0

:ensure_mongodb
call :port_listening 27017
if not errorlevel 1 (
  echo [INFO] MongoDB ya esta activo en 27017.
  exit /b 0
)

echo [INFO] MongoDB no esta activo. Intentando iniciar servicio MongoDB...
sc query MongoDB >nul 2>&1
if not errorlevel 1 (
  net start MongoDB >nul 2>&1
  timeout /t 2 /nobreak >nul
  call :port_listening 27017
  if not errorlevel 1 (
    echo [INFO] MongoDB iniciado como servicio.
    exit /b 0
  )
)

echo [INFO] Intentando iniciar mongod local...
set "MONGOD_EXE="
for %%F in ("C:\Program Files\MongoDB\Server\*\bin\mongod.exe") do (
  set "MONGOD_EXE=%%~fF"
)

if not defined MONGOD_EXE (
  echo [ERROR] No se encontro mongod.exe en C:\Program Files\MongoDB\Server\*
  exit /b 1
)

if not exist "%MONGOD_EXE%" (
  echo [ERROR] No se encontro mongod.exe en C:\Program Files\MongoDB\Server\*
  exit /b 1
)

if not exist "backend\mongo-data" mkdir "backend\mongo-data"
if not exist "backend\mongo-log" mkdir "backend\mongo-log"

start "MongoDB Local" /min cmd /c ""%MONGOD_EXE%" --dbpath "%ROOT%backend\mongo-data" --bind_ip 127.0.0.1 --port 27017 --logpath "%ROOT%backend\mongo-log\mongod.log" --logappend"
timeout /t 2 /nobreak >nul
call :port_listening 27017
if not errorlevel 1 (
  echo [INFO] MongoDB iniciado con mongod local.
  exit /b 0
)

echo [ERROR] No fue posible iniciar MongoDB automaticamente.
exit /b 1

:port_listening
setlocal
set "TARGET_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%TARGET_PORT% .*LISTENING"') do (
  endlocal & exit /b 0
)
endlocal & exit /b 1

:stop_port
set "TARGET_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%TARGET_PORT% .*LISTENING"') do (
  if not "%%P"=="0" (
    echo [INFO] Terminando PID %%P en puerto %TARGET_PORT%
    taskkill /F /PID %%P >nul 2>&1
  )
)
exit /b 0
