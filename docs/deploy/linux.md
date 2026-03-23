# Despliegue En Linux (Ubuntu/Debian)

## Requisitos

- Ubuntu/Debian actualizado
- Git
- Node.js 18+ (recomendado: Node.js 20 LTS)
- npm 9+ (o Yarn 1.x)
- Python 3.11+
- MongoDB 7+ (o superior)

## 1) Instalar dependencias del sistema

```bash
sudo apt update
sudo apt install -y git python3.11 python3.11-venv python3-pip nodejs npm
```

MongoDB:

- Opcion A: MongoDB Community instalado en el host.
- Opcion B: MongoDB con Docker para desarrollo:

```bash
docker run -d --name qr-mongo -p 27017:27017 -v qr_mongo_data:/data/db mongo:8
```

## 2) Clonar repositorio

```bash
git clone https://github.com/jopoblete44-debug/qr_emergent.git
cd qr_emergent
```

## 3) Configurar backend (FastAPI)

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

## 4) Configurar frontend (React + CRACO)

```bash
cd frontend
npm install --legacy-peer-deps
npm install -D ajv@^8.17.1 ajv-keywords@^5.1.0 --legacy-peer-deps
cd ..
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

```bash
cd backend
../.venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 2 (frontend):

```bash
cd frontend
npm start
```

## 7) Verificacion

- Backend: `http://localhost:8001/api/`
- Frontend: `http://localhost:3000`

Pruebas rapidas:

```bash
curl http://localhost:8001/api/
curl -I http://localhost:3000
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

1. Error de dependencias en frontend:

```bash
cd frontend
npm install --legacy-peer-deps
npm install -D ajv@^8.17.1 ajv-keywords@^5.1.0 --legacy-peer-deps
```

2. Puerto en uso:

```bash
sudo lsof -i :8001
sudo kill -9 <PID>
```

3. MongoDB no responde:

- Verifica estado del servicio (si esta instalado en host):

```bash
sudo systemctl status mongod
```

- Si usas Docker:

```bash
docker ps | grep qr-mongo
```
