# QR Profiles Platform - ROADMAP

Backlog priorizado de tareas pendientes.

---

## P0 - En Progreso (Critico)

### Editor de Plantillas de Perfil (Admin)
- **Estado:** IN PROGRESS
- **Descripcion:** Verificar y completar el editor dinamico que permite al admin definir la estructura de cada tipo de perfil QR.
- **Criterios de aceptacion:**
  - Seleccionar un tipo de perfil y ver su estructura actual
  - Agregar/eliminar/reordenar campos
  - Agregar/eliminar secciones completas
  - Configurar iconos y titulos de secciones
  - Previsualizacion movil en tiempo real que se actualiza al editar
  - Guardar cambios de plantilla en base de datos
- **Archivos:** `AdminProfileEditorPage.js`, `ProfileTemplateEditor.js`, `TemplatePreview.js`
- **Testing:** Pendiente

---

## P1 - Proximas (Alta Prioridad)

### Conectar Plantillas Dinamicas al Dashboard del Cliente
- **Estado:** PENDIENTE
- **Descripcion:** Modificar `ProfileDataEditor.js` para que genere formularios dinamicamente a partir de las plantillas definidas por el admin en lugar de usar formularios hardcodeados.
- **Impacto:** Los clientes veran los campos exactos que el admin ha configurado para cada tipo de perfil.
- **Dependencia:** P0 - Editor de Plantillas debe estar completo

### Subir Logo Personalizado al QR
- **Estado:** PENDIENTE
- **Descripcion:** Permitir subir un logo (imagen) que se inserte en el centro del codigo QR generado.
- **Requiere:** Integracion con object storage para almacenar logos
- **Archivos a modificar:** Backend `server.py` (generacion QR), Frontend `QRCustomizePage.js`

---

## P2 - Futuras (Media Prioridad)

### Integracion de Notificaciones
- **Estado:** PENDIENTE
- **Descripcion:** Envio de notificaciones automaticas cuando un QR es escaneado.
- **Canales:** WhatsApp, correo electronico, Telegram
- **Requiere:** Integraciones de terceros (Twilio/WhatsApp API, SendGrid/Resend, Telegram Bot API)

### Integracion de Pagos (MercadoPago)
- **Estado:** PENDIENTE (estructura basica existe)
- **Descripcion:** Completar la integracion con MercadoPago para Chile.
- **Funcionalidades:** Compra de productos, suscripciones mensuales
- **Requiere:** Access token de MercadoPago (produccion)

### Logica de Suscripcion Completa
- **Estado:** PENDIENTE
- **Descripcion:** Implementar completamente los estados de los QRs en todo el sistema.
- **Estados:** Suscrito (activo con pago), Indefinido (gratuito), Pausado (desactivado), Eliminado (soft delete)
- **Impacto:** Afecta perfiles publicos, dashboard, admin, notificaciones

### Deteccion Automatica de Idioma
- **Estado:** PENDIENTE (i18n basico instalado)
- **Descripcion:** Los perfiles publicos se muestran en el idioma del navegador del visitante.
- **Tecnologia:** i18next + i18next-browser-languagedetector (ya instalados)
- **Idiomas iniciales:** Espanol, Ingles, Portugues

### Historial de Cambios (Auditoria)
- **Estado:** PENDIENTE
- **Descripcion:** Log de cambios en perfiles para que el admin pueda rastrear modificaciones.
- **Funcionalidades:** Quien hizo el cambio, cuando, que campo se modifico, valor anterior vs nuevo

---

## Refactoring (Deuda Tecnica)

### Dividir server.py en Modulos
- **Estado:** PENDIENTE
- **Descripcion:** El backend es un archivo monolitico de 1192 lineas.
- **Estructura objetivo:**
  ```
  backend/
    server.py          # App setup, middleware
    routers/
      auth.py          # Autenticacion
      qr_profiles.py   # CRUD de perfiles
      admin.py         # Endpoints admin
      public.py        # Perfiles publicos
      payments.py      # Pagos
    models/
      user.py
      qr_profile.py
      scan.py
    services/
      qr_generator.py
      notification.py
  ```

### Descomponer Componentes Grandes
- **Estado:** PENDIENTE
- **Archivos grandes:**
  - `ProfileDataEditor.js` (954 lineas)
  - `AdminPage.js` (579 lineas - obsoleto, puede eliminarse)
  - `PublicProfilePage.js` (510 lineas)
  - `DashboardPage.js` (457 lineas)

---

## Ideas Futuras (Backlog Abierto)

- Exportar perfil publico como PDF
- Compartir perfil por enlace corto / redes sociales
- Multiples idiomas en la interfaz de admin
- Plantillas visuales predefinidas para perfiles
- API publica para integraciones externas
- App movil nativa (React Native)
- Modo offline para perfiles de emergencia
- Estadisticas avanzadas con IA (patrones de escaneo)
