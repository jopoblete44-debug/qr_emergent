# Funciones Nuevas (Actualizado)

Este documento resume las funciones nuevas y cambios funcionales implementados recientemente en la plataforma.

## 1) Tienda, Suscripciones y Cupones

- Catalogo de tienda con items tipo:
  - `product` (producto tradicional)
  - `subscription_service` (suscripcion)
- Cupones administrables por panel admin.
- Cupon `FREE` para pruebas (100% descuento + envio gratis).
- Checkout con total `0`:
  - no usa pasarela externa
  - se valida y procesa internamente
  - deja la orden en estado `paid`.

## 2) Suscripciones Empresariales con Cupos QR

- Las suscripciones empresariales ahora manejan `qr_quota_granted`.
- Cuando una orden pagada contiene suscripciones:
  - se acredita saldo de cupos QR al usuario/cuenta master (`qr_quota_balance`)
  - se incrementa acumulado historico (`qr_quota_lifetime`).
- El saldo se descuenta al crear QRs cuando aplica la politica de cupos.

### Mejoras recientes (ultima actualizacion)

- Nueva pagina cliente: `GET /subscriptions` consumida desde `Cliente > Suscripciones`.
- Renovacion desde cliente empresa:
  - boton `Renovar 1 mes`
  - boton `Renovar 1 ano`
  - ambos redirigen al flujo de checkout pagado con el plan correspondiente.
- Solo cuentas `master` pueden comprar suscripciones (subcuentas pueden consumir cupos pero no comprar).
- Los buckets de suscripcion:
  - se acumulan por compra
  - mantienen vigencia independiente (mensual/anual)
  - pueden coexistir con diferentes fechas de expiracion.
- Nuevas operaciones admin sobre suscripciones de cliente:
  - `GET /api/admin/users/{user_id}/subscriptions`
  - `POST /api/admin/users/{user_id}/subscriptions/grant`
  - `DELETE /api/admin/users/{user_id}/subscriptions/{bucket_id}`
- Nueva configuracion admin:
  - `enforce_master_only_subscription_purchase`
  - `allow_admin_manual_subscription_grants`

## 3) Politica de Creacion de QR (Enforced)

- Configuracion admin:
  - `allow_person_create_qr`
  - `allow_business_create_qr`
  - `max_qr_per_person`
  - `max_qr_per_business`
- En backend se aplica bloqueo real en `POST /api/qr-profiles`:
  - si la creacion manual esta habilitada, aplica limite maximo por tipo de cuenta.
  - si la creacion manual esta deshabilitada, solo permite crear si hay `qr_quota_balance`.
- Endpoint nuevo para frontend:
  - `GET /api/qr-profiles/creation-policy`
  - devuelve `can_create`, cupos, limites, y mensaje.

## 4) Dashboard Cliente Adaptado a Politica QR

- Si `can_create = false`:
  - se oculta boton "Crear Perfil QR"
  - se muestra CTA para comprar suscripcion
  - se muestra mensaje explicativo.
- Si `can_create = true`:
  - se mantiene flujo normal de creacion.

## 5) Leads y Growth

- Formulario publico de leads en perfiles business.
- Anti-spam:
  - honeypot
  - rate limit por IP
  - captcha opcional con Cloudflare Turnstile.
- Notificaciones automáticas de nuevo lead:
  - SMTP
  - webhook HTTP.
- Tracking de embudo:
  - escaneos
  - clics en CTAs
  - leads
  - conversiones y export CSV.

## 6) Gestion de Usuarios y Subcuentas

- Admin:
  - crear usuario
  - editar usuario
  - pausar/reactivar
  - eliminar (soft delete).
- Admin ahora incluye acciones por lotes:
  - usuarios: activar/pausar/eliminar seleccion multiple
  - codigos QR: activar/pausar/eliminar seleccion multiple
  - productos: activar/desactivar/eliminar seleccion multiple
- Empresa master:
  - crear subcuentas (sucursales)
  - permisos por subcuenta
  - visibilidad agregada de analiticas, ubicaciones y QR.

## 7) Navegacion y Carrito Global

- Se agrega `CartProvider` global para compartir carrito entre tienda y checkout.
- Se agrega icono de carrito en navbar superior para todas las vistas no-admin.
- El icono no se muestra en rutas `/admin`.

## 8) API/Configuracion Relevante

### Endpoints clave

- `GET /api/qr-profiles/creation-policy`
- `GET /api/subscriptions`
- `POST /api/qr-profiles`
- `POST /api/checkout/create-preference`
- `POST /api/public/profile/{hash}/lead`
- `GET /api/leads/export`
- `GET /api/admin/leads/export`
- `GET /api/admin/store/products`
- `POST /api/admin/store/products`
- `PUT /api/admin/store/products/{product_id}`
- `GET /api/admin/users/{user_id}/subscriptions`
- `POST /api/admin/users/{user_id}/subscriptions/grant`
- `DELETE /api/admin/users/{user_id}/subscriptions/{bucket_id}`

### Campos relevantes nuevos/actualizados

- Producto/suscripcion:
  - `item_type`
  - `subscription_period`
  - `qr_quota_granted`
- Usuario:
  - `qr_quota_balance`
  - `qr_quota_lifetime`
- Settings:
  - `allow_person_create_qr`
  - `allow_business_create_qr`
  - `max_qr_per_person`
  - `max_qr_per_business`
  - `enforce_master_only_subscription_purchase`
  - `allow_admin_manual_subscription_grants`

## 9) Editor de Perfiles y Render Publico (Empresa + Persona)

- Se mejoro el editor de plantillas (`Admin > Editor de Perfiles`) para:
  - editar descripcion de secciones
  - editar nombre interno de campos
  - usar campo tipo `image` con preview.
- Se actualizaron plantillas de empresa para perfiles mas visuales (logo/banner/foto) en:
  - restaurante
  - hotel
  - tarjeta
  - evento
  - catalogo
  - turismo.
- Se actualizaron plantillas de persona con soporte de foto en:
  - medico
  - mascota
  - vehiculo
  - nino/adulto mayor.
- Se agrego migracion de configuracion de `profile_types`:
  - completa campos y secciones faltantes en configuraciones antiguas
  - preserva personalizaciones existentes
  - garantiza que cliente persona/empresa vea y edite los nuevos campos.
- Se mejoro el perfil publico para tipos personales y empresariales:
  - tarjetas visuales por tipo
  - mejor jerarquia de contenido
  - soporte de imagenes desde campos dinamicos.

## 10) Configuracion de Envios por Region/Comuna (Chile)

- Nueva pestana: `Admin > Configuracion > Envios`.
- Se incorpora catalogo completo de regiones y comunas de Chile.
- Ahora se puede:
  - editar precio por region
  - editar precio por comuna
  - aplicar precio de region a todas sus comunas
  - habilitar/deshabilitar regiones completas
  - habilitar/deshabilitar comunas individuales.
- Nuevo endpoint: `GET /api/shipping/regions` para frontend checkout.
- Checkout vinculado:
  - seleccion de region/comuna en cliente
  - cotizacion de envio segun configuracion activa
  - persistencia de `shipping_region` y `shipping_commune` en la orden.

## 11) Admin QR: Crear y Reasignar

- Nuevo endpoint admin para crear QR en nombre de un cliente:
  - `POST /api/admin/qr-profiles`
- Nuevo endpoint admin para reasignar un QR a otro usuario:
  - `PATCH /api/admin/qr-profiles/{profile_id}/reassign`
- UI admin QR actualizada con:
  - boton `Crear QR`
  - accion `Reasignar` por fila.

## 12) Ideas de Perfil Nuevas (Internet-Inspired)

- Se agregan nuevas plantillas/ideas para empresas (20 adicionales) y personas (10 adicionales).
- El catalogo de subtipos ahora se consume desde configuracion dinamica de plantillas (`profile_types`), permitiendo ampliar sin tocar frontend.
- Las plantillas nuevas se inyectan automaticamente via migracion/merge de `PROFILE_TEMPLATE_MIGRATION_PATCHES`.

Fuentes de inspiracion (web):
- Uniqode / The QR Code Generator - casos de uso QR por industria y negocios:
  - https://www.the-qrcode-generator.com/blog/qr-code-examples
- Catalogo de regiones/comunas de Chile usado para envios:
  - https://gist.githubusercontent.com/juanbrujo/0fd2f4d126b3ce5a95a7dd1f28b3d8dd/raw/b8575eb82dce974fd2647f46819a7568278396bd/comunas-regiones.json

## 13) Correcciones y Ajustes Recientes

- Correccion de imagenes `/uploads` en productos y perfiles publicos para que las referencias de archivos queden consistentes en ambos flujos.
- Contrato `public_settings` por QR actualizado con:
  - `request_location_automatically`
  - `floating_buttons` con un maximo de 3 botones, validados por tipo.
- Dashboard `person` ajustado:
  - sin banner de creacion manual
  - con CTA de compra de productos como camino principal.
- Visibilidad de productos basada en `visible_to`:
  - la tienda y el checkout interpretan la semantica de exposicion del producto.
- Mejora de Services publica y AdminStore:
  - mejor presentacion del catalogo
  - mejor correspondencia entre lo que se publica y lo que se administra.

## 14) Recuperacion de Contrasena (Olvide mi contrasena)

- Nuevo flujo en autenticacion:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- El backend genera codigo temporal (6 digitos), con vencimiento y limite de intentos.
- El login ahora enlaza la pagina `/forgot-password`.
- Si SMTP esta configurado, el codigo se envia por correo.
- En desarrollo, puede devolverse `dev_reset_code` (controlado por `ALLOW_DEV_PASSWORD_RESET_CODE`).

## 15) Perfiles Mejorados para Persona/Empresa + Control Admin por Plantilla

- Mejoras visuales del perfil publico:
  - foto superior destacada opcional
  - forma configurable de foto (circular / redondeada / cuadrada)
  - header con highlights clave (rating, horario, contacto, datos criticos)
  - barra flotante de acciones mas limpia y consistente en movil.
- Se amplia la configuracion por plantilla en admin (`Editor de Perfiles`):
  - `display_options` para mostrar/ocultar bloques clave segun tipo.
- Nuevos campos sugeridos para plantillas base:
  - Restaurante: link de reservas, WhatsApp reservas, link de reseñas, rango de precio, tiempo de entrega.
  - Hotel: link de reserva, telefono recepcion, info de emergencia.
  - Medico: seguro de salud, instrucciones de emergencia.
  - Mascota: id de microchip, cuidados especiales.
  - Vehiculo: aseguradora, asistencia en ruta.
  - Nino/Adulto mayor: preferencias de comunicacion, punto seguro.

### Fuentes de referencia para benchmark UX/perfiles

- Popl (tarjetas digitales para equipos, lead capture y analitica):
  - https://support.popl.co/en/articles/12293864-popl-digital-business-cards-what-s-in-it-for-your-team
- PetHub (QR para mascotas, foco en privacidad y datos visibles):
  - https://www.pethub.com/articles/4070545/qr-pet-id-tags-privacy-what-you-need-to-know
- OWASP (buenas practicas de flujo forgot-password):
  - https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
