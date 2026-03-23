# QR Profiles Platform - PRD (Product Requirements Document)

## Descripcion del Proyecto

**QR Profiles Platform** es una plataforma SaaS de gestion de codigos QR inteligentes. Permite a personas y empresas crear perfiles digitales vinculados a codigos QR fisicos, con funcionalidades como seguimiento de escaneos, geolocalizacion, notificaciones automaticas y personalizacion visual completa.

### Vision del Producto
Crear la plataforma lider en gestion de perfiles QR en Latinoamerica, comenzando por Chile, con soporte para casos de uso criticos (salud, seguridad) y comerciales (restaurantes, hoteles, eventos).

### URL de Produccion
- **App:** https://qr-template-lab.preview.emergentagent.com
- **API:** https://qr-template-lab.preview.emergentagent.com/api

---

## Secciones Principales

| Seccion | Descripcion | Estado |
|---------|-------------|--------|
| Pagina Principal | Landing page con servicios y productos | Implementada |
| Tienda Online | Compra de accesorios con QR | Implementada |
| Dashboard de Cliente | Gestion de compras y perfiles QR | Implementada |
| Panel de Administracion | Gestion de clientes, perfiles QR, plantillas | Implementada |
| Perfiles Publicos | Paginas publicas optimizadas para movil | Implementada |

---

## Tipos de Cliente

### Persona
Perfiles QR para:
- Condiciones medicas (alergias, medicamentos, contacto de emergencia)
- Mascotas (datos del animal, vacunas, contacto del dueno)
- Vehiculos (datos del auto, seguro, contacto)
- Ninos (datos del menor, contacto de padres, alergias)
- Adultos mayores (datos medicos, contacto de familiares)

### Empresa
Perfiles QR para:
- Menus de restaurante (con descarga PDF)
- Informacion para huespedes de hotel
- Acceso a WiFi
- Tarjetas de presentacion digitales
- Catalogos de productos
- Informacion turistica
- Check-in de eventos
- Encuestas y feedback
- Redes sociales
- Eventos y promociones

---

## Arquitectura Tecnica

### Stack
| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19 + TailwindCSS + Shadcn/UI |
| Backend | FastAPI + Python |
| Base de Datos | MongoDB (motor async) |
| Autenticacion | JWT tokens (30 dias) |
| QR Generation | qrcode + Pillow (backend) |
| Graficos | Recharts |
| Mapas | React-Leaflet + OpenStreetMap |
| PDF | ReportLab (backend), jsPDF (frontend) |
| Animaciones | Framer Motion |

### Estructura del Proyecto
```
/app/
  backend/
    server.py          # API monolitica FastAPI (1192 lineas)
    requirements.txt   # Dependencias Python
    tests/             # Tests pytest
    .env               # MONGO_URL, DB_NAME
  frontend/
    src/
      App.js           # Router principal
      components/      # Componentes reutilizables
        AdminLayout.js, AdminSidebar.js
        DashboardLayout.js, DashboardSidebar.js
        ProfileDataEditor.js (954 lineas - editor de datos QR)
        ProfileTemplateEditor.js (433 lineas - editor plantillas admin)
        ProfilePreview.js, TemplatePreview.js
        QRProfileCard.js, Navbar.js, Footer.js
        ui/            # Shadcn/UI components
      pages/           # 20 paginas
      contexts/        # AuthContext, ThemeContext
      utils/           # api.js, i18n.js
    .env               # REACT_APP_BACKEND_URL
```

---

## Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@qrprofiles.com | admin123 |
| Empresa | TEST_business_user@test.com | testpass123 |
| Persona | demo2@example.com | password |

---

## Esquema de Base de Datos

### Coleccion: `users`
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "password_hash": "bcrypt",
  "user_type": "person | business",
  "is_admin": "boolean",
  "phone": "string?",
  "address": "string?",
  "business_name": "string?",
  "created_at": "datetime"
}
```

### Coleccion: `qr_profiles`
```json
{
  "id": "uuid",
  "user_id": "string",
  "name": "string",
  "alias": "string?",
  "profile_type": "personal | business",
  "sub_type": "medico | mascota | vehiculo | nino | restaurante | hotel | wifi | ...",
  "status": "subscription | indefinite | paused",
  "hash": "string (unique)",
  "data": "dict (campos dinamicos del perfil)",
  "notification_config": "dict",
  "expiration_date": "string?",
  "scan_count": "int",
  "created_at": "datetime",
  "updated_at": "datetime",
  "deleted_at": "datetime?"
}
```

### Coleccion: `scans`
```json
{
  "id": "uuid",
  "qr_profile_id": "string",
  "lat": "float?",
  "lng": "float?",
  "timestamp": "datetime",
  "user_agent": "string?"
}
```

### Coleccion: `settings`
```json
{
  "key": "string",
  "value": "dict (configuracion dinamica)"
}
```

---

## Rutas del Frontend

| Ruta | Pagina | Acceso |
|------|--------|--------|
| `/` | HomePage | Publico |
| `/login` | LoginPage | Publico |
| `/register` | RegisterPage | Publico |
| `/shop` | ShopPage | Publico |
| `/checkout` | CheckoutPage | Publico |
| `/services` | ServicesPage | Publico |
| `/profile/:hash` | PublicProfilePage | Publico |
| `/dashboard` | DashboardPage | Usuario |
| `/statistics` | StatisticsPage | Usuario |
| `/locations` | LocationsPage | Usuario |
| `/account` | AccountPage | Usuario |
| `/settings` | SettingsPage | Usuario |
| `/scan-history` | ScanHistoryPage | Usuario |
| `/qr/:profileId` | QRDetailPage | Usuario |
| `/qr/:profileId/customize` | QRCustomizePage | Usuario |
| `/admin` | AdminDashboardPage | Admin |
| `/admin/qr-profiles` | AdminQRProfilesPage | Admin |
| `/admin/users` | AdminUsersPage | Admin |
| `/admin/profile-editor` | AdminProfileEditorPage | Admin |
| `/admin/analytics` | AdminAnalyticsPage | Admin |
| `/admin/settings` | AdminSettingsPage | Admin |

---

## Endpoints API

### Autenticacion
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/auth/me` | Datos del usuario actual |

### Productos y Pagos
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/products` | Listar productos |
| GET | `/api/products/{id}` | Detalle de producto |
| POST | `/api/checkout/create-preference` | Crear preferencia MercadoPago |
| POST | `/api/webhook/payment` | Webhook de pagos |
| GET | `/api/orders` | Ordenes del usuario |

### Perfiles QR (Usuario)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/qr-profiles` | Crear perfil QR |
| GET | `/api/qr-profiles` | Listar perfiles del usuario |
| GET | `/api/qr-profiles/{id}` | Obtener perfil |
| PUT | `/api/qr-profiles/{id}` | Actualizar perfil |
| PATCH | `/api/qr-profiles/{id}/status` | Cambiar estado |
| DELETE | `/api/qr-profiles/{id}` | Eliminar (soft delete) |
| GET | `/api/qr-profiles/{id}/generate-qr` | Generar imagen QR |
| GET | `/api/qr-profiles/{id}/generate-qr-custom` | QR personalizado (colores, tamano) |
| GET | `/api/qr-profiles/{id}/details` | Detalles + estadisticas |

### Perfiles Publicos
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/public/profile/{hash}` | Ver perfil publico |
| POST | `/api/public/profile/{hash}/scan` | Registrar escaneo |

### Ubicaciones y Escaneos
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/locations/{profile_id}` | Ubicaciones de escaneo |
| GET | `/api/scan-history` | Historial de escaneos |
| GET | `/api/statistics/overview` | Estadisticas del usuario |

### Admin
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/admin/users` | Listar usuarios |
| GET | `/api/admin/users/{id}` | Detalle de usuario |
| PUT | `/api/admin/users/{id}` | Editar usuario |
| GET | `/api/admin/qr-profiles` | Todos los perfiles QR |
| PUT | `/api/admin/qr-profiles/{id}` | Editar perfil |
| DELETE | `/api/admin/qr-profiles/{id}` | Eliminar perfil |
| PATCH | `/api/admin/qr-profiles/{id}/status` | Cambiar estado |
| GET | `/api/admin/qr-profiles/{id}/download-qr` | Descargar QR |
| GET | `/api/admin/scans` | Todos los escaneos |
| GET | `/api/admin/config` | Configuracion admin |
| PUT | `/api/admin/config` | Actualizar configuracion |
| GET | `/api/admin/analytics` | Analiticas generales |
| GET | `/api/admin/analytics/daily-scans` | Escaneos diarios |
| GET | `/api/admin/profile-types-config` | Configuracion tipos de perfil |
| PUT | `/api/admin/profile-types-config` | Actualizar tipos de perfil |
| GET | `/api/admin/settings` | Configuracion general |
| PUT | `/api/admin/settings` | Actualizar configuracion |

---

## Requisitos Funcionales Pendientes

### P0 - En Progreso
- **Editor de Plantillas de Perfil (Admin):** Verificar funcionamiento completo del editor dinamico que permite agregar/eliminar campos, secciones, iconos, titulos. Con previsualizacion movil en tiempo real.

### P1 - Proximas
- **Conectar Plantillas Dinamicas al Dashboard del Cliente:** Que el `ProfileDataEditor` genere formularios basados en las plantillas definidas por el admin.
- **Subir Logo Personalizado al QR:** Permitir insertar un logo en el centro del codigo QR.

### P2 - Futuras
- **Integracion de Notificaciones:** WhatsApp, correo electronico, Telegram.
- **Integracion de Pagos:** MercadoPago (Chile).
- **Logica de Suscripcion:** Implementar estados completos (Suscrito, Indefinido, Pausado, Eliminado) en todo el sistema.
- **Deteccion Automatica de Idioma:** Perfiles publicos en el idioma del navegador del visitante.
- **Historial de Cambios (Auditoria):** Log de cambios en perfiles para trazabilidad.

### Refactoring Pendiente
- Dividir `server.py` (1192 lineas) en modulos: `routers/`, `models/`, `services/`
- Descomponer componentes grandes (ProfileDataEditor 954 lineas)
