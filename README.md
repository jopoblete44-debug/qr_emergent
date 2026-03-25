# QR Profiles Platform

Plataforma SaaS de gestion de codigos QR inteligentes para personas y empresas.

## Requisitos Generales

- Git
- Node.js 18+ (recomendado: Node.js 20 LTS)
- npm 9+ o Yarn 1.x
- Python 3.11+
- MongoDB 7+

## Variables de Entorno

Backend (`backend/.env`):

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=qr_emergent
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-this-secret-in-production
MERCADOPAGO_ACCESS_TOKEN=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_USE_TLS=true
PASSWORD_RESET_CODE_TTL_MINUTES=20
PASSWORD_RESET_MAX_ATTEMPTS=5
ALLOW_DEV_PASSWORD_RESET_CODE=true
```

Frontend (`frontend/.env`):

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Despliegue

- Windows 11: [docs/deploy/windows.md](./docs/deploy/windows.md)
- Linux (Ubuntu/Debian): [docs/deploy/linux.md](./docs/deploy/linux.md)

## Documentacion Funcional

- Funciones nuevas y capacidades actualizadas: [docs/functions/new-features.md](./docs/functions/new-features.md)
- Guia de uso para personas: [docs/guides/persona.md](./docs/guides/persona.md)
- Guia de uso para empresas: [docs/guides/empresa.md](./docs/guides/empresa.md)
- Guia de uso para administradores: [docs/guides/admin.md](./docs/guides/admin.md)

## Arranque Rapido (Windows)

En la raiz del proyecto existe el ejecutable `start_project.bat`.

1. Doble click sobre `start_project.bat`, o ejecuta:

```powershell
.\start_project.bat
```

2. Se abriran 2 terminales:
- Backend FastAPI en `http://localhost:8001/api/`
- Frontend React/Vite en `http://localhost:5173`

Este launcher es util para levantar el entorno despues de cambios en codigo.
Antes de iniciar, limpia procesos en `8001` y `3000` para evitar duplicados.
El backend se inicia con `--reload` para aplicar cambios Python automaticamente.

## Arquitectura

```
React 19 + Vite (SPA) --> FastAPI (REST API) --> MongoDB
     |                    |
     |                    +-- qrcode + Pillow (generacion QR)
     |                    +-- ReportLab (generacion PDF)
     |                    +-- bcrypt + JWT (autenticacion)
     |
     +-- TailwindCSS + Shadcn/UI (estilos)
     +-- Recharts (graficos)
     +-- React-Leaflet (mapas)
     +-- Framer Motion (animaciones)
```

## Estructura del Proyecto

```
/app/
  backend/
    server.py            # API FastAPI (auth, CRUD, admin, QR gen)
    requirements.txt
    tests/
      test_qr_profiles_api.py
      test_admin_panel.py
    .env
  frontend/
    src/
      App.jsx            # Router principal
      components/        # 15 componentes
      pages/             # 20 paginas
      contexts/          # Auth + Theme + Cart
      utils/             # API helper + i18n
    .env
  memory/
    PRD.md               # Requisitos del producto
    CHANGELOG.md         # Historial de cambios
    ROADMAP.md           # Tareas pendientes
```

## Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@qrprofiles.com | admin123 |
| Empresa | TEST_business_user@test.com | testpass123 |
| Persona | demo2@example.com | password |

## Funcionalidades Principales

- Registro/Login (persona y empresa)
- Creacion y gestion de perfiles QR (catalogo dinamico ampliado con +30 subtipos entre persona/empresa)
- Generacion de codigos QR con motor configurable globalmente (SVG/PNG, complejidad, version, zona quieta, hash visible y posicionable)
- Perfiles publicos optimizados para movil
- Seguimiento de escaneos con geolocalizacion
- Panel de administracion completo con 6 secciones
- Editor de plantillas de perfil (admin)
- Plantillas de perfil persona y empresa con campos visuales (foto/logo/banner/avatar) editables
- Migracion automatica de plantillas antiguas para reflejar nuevos campos sin perder personalizaciones
- Estadisticas y analiticas
- Tema claro/oscuro
- Tienda admin con modulo de Productos/Servicios
- Suscripciones empresariales con cupos QR configurables por plan y vencimiento por bucket (mensual/anual)
- Politica de creacion de QR por configuracion admin (persona/empresa) con bloqueo real en backend
- Endpoint de politica de creacion (`/api/qr-profiles/creation-policy`) para controlar visibilidad en frontend
- Pagina de suscripciones para empresas (`/subscriptions`) con detalle de compras, estado y vencimiento
- Renovacion pagada de suscripciones por 1 mes o 1 ano desde la pagina de suscripciones (cuenta master)
- Cupones desde Admin Store y Configuracion (incluye `FREE`)
- Cupon `FREE`: 100% descuento + envio gratis (para pruebas)
- Checkout con total `0`: validacion interna sin pasarela de pago
- Generacion automatica de QR al confirmar compra (si el producto lo habilita)
- Compra de suscripcion empresarial que acredita cupos QR (`qr_quota_balance`) para crear nuevos perfiles
- Gestion admin de usuarios: crear, editar, pausar/reactivar, eliminar cuenta y gestionar suscripciones por cliente
- Gestion por lotes en admin (seleccion multiple + acciones masivas) para:
  - clientes
  - codigos QR
  - productos (activar/desactivar/eliminar)
- Admin QR mejorado: crear QR para cualquier cliente y reasignar QR a otro usuario
- Cuentas de empresa con rol `master` y subcuentas tipo sucursal
- Cuenta master con visibilidad agregada de QRs, ubicaciones y analiticas de subcuentas
- Gestion de permisos por subcuenta (QRs, ubicaciones, analiticas)
- Mapa de ubicaciones con seleccion desde historial (ultima ubicacion seleccionada por defecto)
- Correccion de z-index en movil para que menu/sidebar no quede oculto por el mapa
- CTAs de perfil publico configurables (Google Reviews y WhatsApp)
- Tracking de campanas UTM + variantes A/B en escaneos
- Programa de fidelizacion (puntos por escaneo + canje)
- Reporte ejecutivo descargable (PDF) desde estadisticas
- Captura de leads desde el perfil QR publico (formulario de contacto)
- Tracking de clics en CTAs publicos
- Exportacion CSV de leads (cliente/master y admin)
- Embudo de conversion con tasas (escaneo -> clic CTA -> lead)
- Anti-spam en leads: honeypot + rate limit por IP + captcha opcional (Cloudflare Turnstile)
- Notificaciones automáticas de lead nuevo (email SMTP y/o webhook)
- Icono de carrito global en navbar para vistas no-admin
- Login y registro con opcion de mostrar/ocultar contrasena (icono "ojito")
- Recuperacion de contrasena en login (`Olvide mi contrasena`) con codigo temporal y vencimiento
- Configuracion de envios por region/comuna de Chile con habilitacion y precios por cobertura
- Checkout conectado a envios por destino (region/comuna) para cotizacion y orden
- Editor de perfiles admin con visibilidad por plantilla:
  - mostrar/ocultar tipo de perfil
  - mostrar/ocultar botones flotantes
  - mostrar/ocultar banner negocio
  - mostrar/ocultar formulario de contacto
  - mostrar/ocultar boton manual de ubicacion (persona)
  - mostrar/ocultar bloque de mapa por plantilla
  - mostrar/ocultar highlights de cabecera
  - estilo visual de tarjeta por plantilla (elegante / atrevido / glass)
  - tipo de campo `map` + acceso rapido `Agregar Mapa` en cada seccion
  - render de `map` en perfil publico (embed + boton abrir mapa)
  - foto superior destacada opcional y forma configurable (circular/redondeada/cuadrada)
  - nuevos campos de ubicacion para negocios (direccion de mapa, latitud/longitud, link Google Maps, area de cobertura)

## Politica De Imagenes Y UX Frontend

- Las vistas frontend de landing/tienda no usan imagenes remotas hardcodeadas como fallback.
- Para campos visuales de imagen (foto, logo, portada, avatar, banner), la carga es **upload-only**: se prioriza subir desde dispositivo, no pegar URLs manuales.
- El backend guarda esos archivos bajo `/uploads/<scope>/<owner>/...` y valida scope/owner antes de aceptar la referencia.
- Las previews visuales del editor admin pueden usar placeholders locales/data URI para demostrar layout sin depender de terceros.

## Mejoras Funcionales Recientes

- Correccion de imagenes `/uploads` en productos y perfiles publicos, para que la resolucion de archivos respete el scope/owner esperado.
- Contrato `public_settings` por QR actualizado:
  - `request_location_automatically`
  - `floating_buttons` con maximo 3 acciones, limitadas por tipo.
- Los estilos visuales `elegant`, `bold` y `glass` ahora tienen diferencias marcadas (fondo, contraste, sombras y jerarquia visual).
- Dashboard de tipo `person` simplificado:
  - sin banner de creacion manual
  - con CTA directo para comprar productos cuando corresponde.
- Visibilidad de productos basada en `visible_to`:
  - define alcance en shop y checkout
  - evita exponer items fuera de su contexto permitido.
- Mejora de la experiencia publica de Services y del AdminStore:
  - catalogo mas consistente
  - mejor alineacion entre lo visible al cliente y lo administrable desde el panel.

## Rutas Publicas Y Navegacion

- Public pages disponibles: `/about`, `/contact` y `/faq`.
- El menu movil tambien expone el acceso publico, para navegar sin abrir el dashboard.

## Modulo Tienda (Admin)

- Seccion: `Admin > Productos y Servicios`
- CRUD de productos y servicios de suscripcion
- CRUD de cupones
- Activacion/desactivacion de cupones
- Creacion/edicion de item en popup (modal)
- Seleccion multiple para desactivar productos en lote
- Seleccion multiple para activar/desactivar/eliminar productos en lote
- Creacion rapida de cupon `FREE` desde:
  - `Admin > Configuracion`
  - `Admin > Productos y Servicios`

## Suscripciones Empresa

- `Cliente empresa > Suscripciones`:
  - ver historial de suscripciones compradas
  - revisar estado (activa, vencida, agotada)
  - ver fechas de compra y vencimiento
  - renovar por 1 mes o 1 ano (flujo pagado por checkout)
- Restriccion de compra:
  - por defecto, solo cuenta `master` puede comprar suscripciones
  - subcuentas pueden consumir cupos de la master, pero no comprar
- `Admin > Clientes > boton Suscripciones`:
  - ver buckets de suscripcion de la cuenta
  - otorgar suscripcion manual (cuota + periodo + etiqueta opcional)
  - revocar bucket de suscripcion
- Configuracion admin:
  - `enforce_master_only_subscription_purchase`
  - `allow_admin_manual_subscription_grants`
  - `shipping_regions` (envios por region/comuna)

## Growth y Fidelizacion

- `Admin > Configuracion > Growth`
  - Activar CTA Google Reviews (`google_review_link` o `google_review_place_id`)
  - Activar CTA WhatsApp (`whatsapp_number`, mensaje por defecto y opcion post-escaneo)
  - Activar tracking de campanas (`utm_source`, `utm_medium`, `utm_campaign`, etc.)
  - Activar tracking A/B (`variant`)
  - Activar fidelizacion (`loyalty_points_per_scan`, `loyalty_redeem_threshold`)
- `Cliente > Estadisticas`
  - Visualizacion de campanas capturadas
  - Estado de puntos y canje
  - Descarga de reporte ejecutivo PDF (ultimos 30 dias)
- `Cliente > Leads`
  - Listado y seguimiento de prospectos capturados desde QR publico
  - Exportacion CSV filtrada
- `Admin > Leads`
  - Vista global de leads con filtros y cambio de estado
  - Exportacion CSV global
- `Admin > Configuracion > Growth`
  - Configuracion del formulario publico de leads (activar/desactivar, titulo, mensaje exito y validacion de contacto)
  - Configuracion anti-spam (rate limit, honeypot, Turnstile)
  - Configuracion de notificaciones de leads (emails y webhook)

## Regla De Pago Interno (Total 0)

Si el total del carrito es `0`, la orden se marca como pagada internamente:

- No se crea preferencia en pasarela
- No se redirige a checkout externo
- Se procesa la compra y sus efectos (ej: QR automatico) en backend

## Gestion De Usuarios Y Subcuentas

- Admin (`/admin/users`):
  - Crear usuario
  - Editar usuario
  - Pausar/activar cuenta
  - Eliminar cuenta (soft delete + pausa de perfiles QR asociados)
  - Seleccion multiple y acciones por lote (activar, pausar, eliminar)
  - Gestionar suscripciones de clientes empresa
- Cuenta empresa `master`:
  - Crear subcuentas (sucursales)
  - Editar datos/permisos de subcuentas
  - Pausar/activar o eliminar subcuentas
  - Ver y gestionar datos de subcuentas (QRs, ubicaciones, analiticas)
- Control de acceso por permisos:
  - `manage_qr_profiles`
  - `view_locations`
  - `view_analytics`

## Testing

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend
npm test
```

## Auditoria De Dependencias (2026-03-23)

Resultado de auditoria npm sobre `frontend/package.json`:

- No se detectaron paquetes deprecados en dependencias directas ni transitivas.
- No fue necesario reemplazar dependencias ni ajustar scripts/imports/configuracion.

Validaciones ejecutadas:

- `npm ci --ignore-scripts --no-fund --no-audit` en frontend, sin warnings `npm warn deprecated`.
- Revisión de `package-lock.json` (`packages[*].deprecated`) con resultado `deprecated_count=0`.

## Documentacion

- [PRD (Requisitos)](./memory/PRD.md)
- [Changelog](./memory/CHANGELOG.md)
- [Roadmap](./memory/ROADMAP.md)
