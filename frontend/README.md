# Frontend (Vite + React)

Frontend principal de la plataforma QR, ahora ejecutado con Vite.

## Scripts

- `npm start`: levanta entorno de desarrollo (Vite) en `http://localhost:5173`.
- `npm run build`: genera build de produccion en `dist/`.
- `npm test`: ejecuta Vitest (`vitest --run`).

## Variables de Entorno

Archivo `.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Tambien se soporta `VITE_BACKEND_URL` para compatibilidad con Vite.

## Auditoria de Paquetes Deprecados

Auditoria realizada sobre `frontend/package.json`:

- No se detectaron paquetes `deprecated` en dependencias directas ni transitivas.
- No fue necesario reemplazar dependencias ni ajustar imports/scripts/configuracion.

Validacion realizada:

- `npm ci --ignore-scripts --no-fund --no-audit` sin warnings `npm warn deprecated`.
- Revisión programatica de `package-lock.json` (`packages[*].deprecated`) con resultado `deprecated_count=0`.
