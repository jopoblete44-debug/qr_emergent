# QR Profiles Platform - CHANGELOG

Registro de todos los cambios implementados, ordenados cronologicamente.

---

## Iteracion 1 - MVP Base
**Fecha:** Marzo 2026

### Funcionalidades
- Registro/Login de usuarios (tipo persona y empresa)
- Pagina de inicio con servicios y productos
- Tienda online con productos de accesorios QR
- Dashboard de cliente con creacion, edicion y eliminacion de perfiles QR
- Panel de administracion basico con gestion de usuarios y QRs
- Perfiles publicos accesibles mediante hash unico
- Tema claro/oscuro con toggle
- Generacion de codigos QR con libreria `qrcode` + `Pillow`
- Autenticacion JWT con expiracion de 30 dias

### Archivos Principales
- `backend/server.py` - API FastAPI completa
- `frontend/src/pages/HomePage.js` - Landing page
- `frontend/src/pages/DashboardPage.js` - Dashboard cliente
- `frontend/src/pages/LoginPage.js`, `RegisterPage.js` - Auth
- `frontend/src/pages/PublicProfilePage.js` - Perfil publico

---

## Iteracion 2 - Dashboard Expandido
**Fecha:** Marzo 2026

### Funcionalidades
- Nuevas paginas: Estadisticas, Ubicaciones, Mi Cuenta, Configuraciones
- Sidebar de navegacion en dashboard (`DashboardSidebar.js`)
- Graficos con `recharts` (escaneos por dia, distribucion por tipo)
- Mapas con `react-leaflet` (ubicaciones de escaneo)

### Archivos Nuevos
- `frontend/src/pages/StatisticsPage.js`
- `frontend/src/pages/LocationsPage.js`
- `frontend/src/pages/AccountPage.js`
- `frontend/src/pages/SettingsPage.js`

---

## Iteracion 3 - Admin Mejorado
**Fecha:** Marzo 2026

### Funcionalidades
- Tabla de QRs con filtros (busqueda, estado, tipo)
- Edicion de QRs desde popup modal
- Dashboard de analytics para admin

---

## Iteracion 4 - Edicion Avanzada de Perfiles
**Fecha:** 20 Marzo 2026

### Funcionalidades
- `ProfileDataEditor` con campos especificos para TODOS los subtipos:
  - **Personal:** medico, mascota, vehiculo, nino, adulto mayor
  - **Empresa:** restaurante, hotel, WiFi, tarjeta, catalogo, turismo, check-in, encuesta, redes sociales, evento
- Validacion de fecha de expiracion en perfiles publicos

### Archivos Clave
- `frontend/src/components/ProfileDataEditor.js` (954 lineas)

---

## Iteracion 5 - Historial de Escaneos + Ver QR
**Fecha:** 20 Marzo 2026

### Funcionalidades
- Pagina de Historial de Escaneos (`/scan-history`) con filtros y paginacion
- Backend endpoint `/api/scan-history` con filtros por perfil y fecha
- Boton "Ver QR" en tarjetas del dashboard (abre perfil publico)
- Boton "Ver" en tabla del panel de administracion
- Tarjetas QR mejoradas: badges de color por subtipo, conteo de escaneos, fecha, hash
- Sidebar actualizado con enlace a "Historial"

### Archivos Nuevos
- `frontend/src/pages/ScanHistoryPage.js`

---

## Iteracion 6 - Detalles QR + Personalizacion QR
**Fecha:** 20 Marzo 2026

### Funcionalidades
- Pagina de Detalles del QR (`/qr/:profileId`): nombre, alias, badges, stats cards, grafico 30 dias, preview QR, hash, acciones
- Pagina de Personalizacion de QR (`/qr/:profileId/customize`): 8 temas predefinidos, color pickers, sliders tamano/borde, vista previa en tiempo real
- Backend endpoints: `/api/qr-profiles/{id}/details`, `/generate-qr-custom` con parametros de color
- Fix bug PIL Image paste (`.convert('RGB')`)

### Testing
- 16/16 backend tests pasaron (100%)
- 5/5 frontend tests pasaron (100%)

### Archivos Nuevos
- `frontend/src/pages/QRDetailPage.js`
- `frontend/src/pages/QRCustomizePage.js`

---

## Iteracion 7 - Panel Admin Reestructurado + Perfiles Publicos Completos
**Fecha:** 20 Marzo 2026

### Funcionalidades

#### Panel de Administracion
- Layout y sidebar dedicado (`AdminLayout` + `AdminSidebar`)
- 6 paginas separadas:
  - **Dashboard Admin:** Stats (usuarios, perfiles, escaneos, ingresos), clientes/QRs recientes, acciones rapidas
  - **Gestion QRs:** Tabla con filtros, acciones CRUD, descarga QR
  - **Gestion Clientes:** Tabla con busqueda, editar datos + contrasena
  - **Editor de Perfiles:** Configurar campos de cada tipo, habilitar/deshabilitar, agregar campos
  - **Analitica:** Stats, grafico escaneos 30 dias, distribucion por tipo/estado (pie charts)
  - **Configuracion:** 5 pestanas (General, QR, Notificaciones, Pagos, Avanzado)
- Login redirige admin a `/admin`, usuario a `/dashboard`
- Navbar oculta "Dashboard" para admin, muestra solo "Admin"

#### Perfiles Publicos
- Renderers dedicados para TODOS los 14 subtipos
- Perfiles pausados muestran mensaje "Perfil Pausado"

#### Backend
- `/api/admin/settings` - Configuracion general
- `/api/admin/profile-types-config` - Tipos de perfil
- `/api/admin/analytics/daily-scans` - Escaneos diarios
- `/api/admin/qr-profiles/{id}/download-qr` - Descarga de QR

### Testing
- 25/25 backend tests pasaron (100%)
- Frontend testing agent confirmo 100%

### Archivos Nuevos
- `frontend/src/components/AdminLayout.js`
- `frontend/src/components/AdminSidebar.js`
- `frontend/src/pages/AdminDashboardPage.js`
- `frontend/src/pages/AdminQRProfilesPage.js`
- `frontend/src/pages/AdminUsersPage.js`
- `frontend/src/pages/AdminAnalyticsPage.js`
- `frontend/src/pages/AdminSettingsPage.js`

---

## Iteracion 8 - Editor de Plantillas con Preview Movil
**Fecha:** 20 Marzo 2026

### Funcionalidades
- Editor reescrito: muestra TODOS los perfiles de clientes (personas y empresas) en lista con busqueda/filtros
- Al seleccionar un perfil, carga sus datos existentes en el formulario (`ProfileDataEditor`)
- Vista previa movil en tiempo real (frame de telefono) que se actualiza al escribir
- Componente `ProfilePreview` reutilizable con renderers para los 14 subtipos
- Info del cliente visible (nombre, tipo) junto al perfil seleccionado
- Boton "Guardar Cambios" para persistir ediciones del admin
- Editor de plantillas de perfil (Admin): interfaz para definir estructura dinamica de cada tipo de perfil
  - Componente `ProfileTemplateEditor` para editar campos, secciones, iconos
  - Componente `TemplatePreview` para previsualizacion movil en tiempo real

### Estado
- **IN PROGRESS** - Creado pero pendiente de verificacion visual completa

### Archivos Nuevos/Modificados
- `frontend/src/pages/AdminProfileEditorPage.js` (452 lineas)
- `frontend/src/components/ProfileTemplateEditor.js` (433 lineas)
- `frontend/src/components/TemplatePreview.js` (126 lineas)
- `frontend/src/components/ProfilePreview.js` (302 lineas)
