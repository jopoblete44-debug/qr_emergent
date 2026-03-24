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
El footer lee tambien estas variables opcionales:

```env
VITE_SOCIAL_FACEBOOK_URL=
VITE_SOCIAL_TWITTER_URL=
VITE_SOCIAL_INSTAGRAM_URL=
VITE_SOCIAL_LINKEDIN_URL=
```

## Notas Funcionales

- Las rutas publicas incluyen `/about`, `/contact` y `/faq`.
- La experiencia de imagenes prioriza carga desde dispositivo; no se documenta uso de URLs remotas como flujo principal.
- El backend publica archivos en `/uploads` con scope y owner validados.

## Mejoras Funcionales Recientes

- Correccion de resolucion de imagenes `/uploads` en productos y perfiles publicos.
- `public_settings` por QR:
  - `request_location_automatically`
  - `floating_buttons` con hasta 3 acciones por tipo.
- Dashboard `person`:
  - sin banner de creacion manual
  - CTA para comprar productos cuando la politica de uso lo requiere.
- Productos con `visible_to`:
  - la tienda y el checkout respetan la semantica de visibilidad definida por el backend.
- Mejora de Services publica y AdminStore:
  - menor friccion para consumo publico
  - mejor coherencia entre catalogo visible y administracion interna.

## Auditoria de Paquetes Deprecados

Auditoria realizada sobre `frontend/package.json`:

- No se detectaron paquetes `deprecated` en dependencias directas ni transitivas.
- No fue necesario reemplazar dependencias ni ajustar imports/scripts/configuracion.

Validacion realizada:

- `npm ci --ignore-scripts --no-fund --no-audit` sin warnings `npm warn deprecated`.
- Revisión programatica de `package-lock.json` (`packages[*].deprecated`) con resultado `deprecated_count=0`.
