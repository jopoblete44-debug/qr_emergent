# Despliegue En Windows 11

## Requisitos

- Windows 11
- Git
- Node.js 18+ (recomendado: Node.js 20 LTS)
- npm 9+ (o Yarn 1.x)
- Python 3.11+
- MongoDB 7+ (o superior)

## 1) Clonar repositorio

```powershell
git clone https://github.com/jopoblete44-debug/qr_emergent.git
cd qr_emergent
```

## 2) Configurar backend (FastAPI)

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

Instalacion estandar:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

## 3) Configurar frontend (React + CRACO)

```powershell
cd frontend
npm install --legacy-peer-deps
npm install -D ajv@^8.17.1 ajv-keywords@^5.1.0 --legacy-peer-deps
cd ..
```

## 4) Instalar y activar MongoDB

Instalacion por `winget`:

```powershell
winget install --id MongoDB.Server -e --accept-package-agreements --accept-source-agreements
```

Levantar y verificar servicio:

```powershell
Start-Service MongoDB
Get-Service MongoDB
```

## 5) Variables de entorno

Crear `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=qr_emergent
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=change-this-secret-in-production
MERCADOPAGO_ACCESS_TOKEN=
```

Crear `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 6) Levantar aplicacion

Terminal 1 (backend):

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001
```

Alternativa equivalente en PowerShell:

```powershell
& "..\.venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8001
```

Terminal 2 (frontend):

```powershell
cd frontend
npm start
```

Atajo desde la raiz del repo:

```powershell
.\start_project.bat
```

Este archivo abre backend y frontend en terminales separadas.
Tambien limpia procesos activos en puertos `8001` y `3000` antes de iniciar,
y levanta backend con `--reload`.

## 7) Verificacion

- Backend: `http://localhost:8001/api/`
- Frontend: `http://localhost:3000`

Pruebas rapidas:

```powershell
Invoke-RestMethod -Uri "http://localhost:8001/api/"
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

## 8) Validacion de tienda/configuracion

1. Inicia sesion como admin:
- Email: `admin@qrprofiles.com`
- Password: `admin123`

2. Ve a `Admin > Configuracion` y valida:
- `Enable store` activado
- `Enable coupons` activado
- Boton para preparar cupon `FREE`

3. Ve a `Admin > Productos y Servicios` y valida:
- Listado de productos visible
- Creacion de producto/servicio funcional
- Creacion de cupon funcional

4. Prueba checkout con cupon `FREE`:
- Agrega un producto al carrito
- Aplica `FREE`
- Si total final es `0`, la compra debe finalizar sin pasarela externa

## 9) Validacion de usuarios y subcuentas

1. En `Admin > Clientes` valida:
- Crear usuario
- Pausar/reactivar usuario
- Eliminar usuario

2. Inicia sesion con una cuenta empresa `master` y valida en `Mi Cuenta`:
- Crear subcuenta (sucursal)
- Editar subcuenta y permisos
- Pausar/reactivar subcuenta
- Eliminar subcuenta

3. Valida herencia de visibilidad para cuenta master:
- En `Dashboard`, `Estadisticas`, `Ubicaciones` y gestion de QR, debe incluir datos de subcuentas

4. En `Ubicaciones` valida UX:
- La ultima ubicacion queda seleccionada por defecto
- Al hacer click en un item del historial, el mapa se centra en ese punto
- En movil, el menu/sidebar se muestra por sobre el mapa (sin solapamientos)

## Problemas comunes

1. `yarn` no reconocido:
- Usa `npm` con los comandos anteriores.

2. Error `Cannot find module 'ajv/dist/compile/codegen'`:
- Ejecuta:

```powershell
cd frontend
npm install -D ajv@^8.17.1 ajv-keywords@^5.1.0 --legacy-peer-deps
```

3. Puerto ocupado (`8001` o `3000`):
- Identifica y termina el proceso:

```powershell
netstat -ano | findstr :8001
taskkill /PID <PID> /F
```
