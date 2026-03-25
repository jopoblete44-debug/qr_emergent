# Guia de Uso: Admin

Esta guia resume operaciones clave de administracion.

## 1) Configuracion General

Ruta: `Admin > Configuracion`

Secciones principales:
- General
- Codigos QR
- Notificaciones
- Pagos
- Suscripciones
- Tienda
- Envios
- Growth

Tambien incluye nuevas opciones de marca/SEO:
- logo y favicon
- metadata SEO (title/description/keywords/og)
- habilitar/deshabilitar indexacion.

## 2) Configuracion de Codigos QR

Campos clave:
- `max_qr_per_person`
- `max_qr_per_business`
- `allow_person_create_qr`
- `allow_business_create_qr`
- `qr_generation.output_format` (`svg` recomendado)
- `qr_generation.complexity_mode`
- `qr_generation.error_correction`
- `qr_generation.hash_visible` / `hash_position` / `hash_prefix`

Comportamiento:
- Si desactivas `allow_*_create_qr`, ese tipo de usuario no puede crear QR manualmente.
- Para empresas, podran crear solo con cupos de suscripcion (`qr_quota_balance`).
- La configuracion `qr_generation` afecta todas las descargas QR (cliente y admin).

## 3) Tienda y Suscripciones

Ruta: `Admin > Tienda y Suscripciones`

Acciones:
1. Crear/editar items (popup/modal).
2. Para categoria empresa, definir:
  - tipo suscripcion
  - periodo (mensual/anual)
  - `Cupos QR`
3. Activar/desactivar items.
4. Seleccion multiple para activar/desactivar/eliminar items por lote.

Objetivo:
- Comercializar cupos QR de forma controlada para cuentas empresa.

Opciones adicionales de tienda:
- colores/tema visual
- banner principal
- email/whatsapp de soporte
- flags tecnicos (guest checkout, waitlist sin stock).

## 4) Envios por Region y Comuna

Ruta: `Admin > Configuracion > Envios`

Acciones:
1. Ajustar costo de envio por defecto.
2. Ajustar precio por region.
3. Aplicar precio de region a todas sus comunas (1 click).
4. Ajustar precio por comuna.
5. Habilitar/deshabilitar regiones o comunas.

Resultado:
- Checkout usa este catalogo para calcular envio segun destino del cliente.

## 5) Suscripciones por Cliente (Admin > Clientes)

En la tabla de clientes empresa existe boton de suscripciones por fila.

Permite:
- ver buckets comprados, vencimiento y cupos restantes
- otorgar suscripcion manual (cuota + periodo + etiqueta)
- revocar bucket de suscripcion

Control adicional:
- el otorgamiento manual puede habilitarse/deshabilitarse en `Admin > Configuracion > Suscripciones`.

## 6) Cupones y Pruebas

Puedes:
- crear cupones manuales
- activar/desactivar
- usar `FREE` para pruebas end-to-end.

Regla de pago:
- Si total de carrito es `0`, la compra se marca pagada internamente (sin pasarela).

## 7) Usuarios y Cuentas

Ruta: `Admin > Usuarios`

Acciones:
- crear cuenta
- editar datos
- pausar/reactivar
- eliminar.
- acciones por lote con seleccion multiple:
  - activar
  - pausar
  - eliminar

Notas:
- Al eliminar usuario se aplica soft delete.
- Las cuentas empresa pueden operar con modelo master/subcuentas.

## 8) Codigos QR (Admin)

- La tabla de codigos QR soporta seleccion multiple.
- Acciones por lote disponibles:
  - activar
  - pausar
  - eliminar
- crear QR para cualquier cliente (admin)
- reasignar QR existente a otro cliente

## 9) Leads, Growth y Analiticas

Configura y monitorea:
- formulario de leads
- anti-spam (honeypot/rate limit/Turnstile)
- notificaciones por email/webhook
- tracking UTM + A/B
- embudo (scan -> CTA -> lead)
- export CSV para seguimiento comercial.

## 10) Editor de Perfiles (Persona y Empresa)

Ruta: `Admin > Editor de Perfiles`

Capacidades clave:
- editar secciones, campos, iconos, colores y descripciones.
- usar tipo de campo `image` para fotos, logos, avatar y banners.
- usar tipo de campo `map` (con boton rapido `Agregar Mapa` por seccion).
- vista previa movil en tiempo real.
- configurar `display_options` por plantilla:
  - estilo visual (`elegant`, `bold`, `glass`)
  - mostrar/ocultar bloque de mapa
  - mostrar/ocultar highlights de cabecera
  - controles ya existentes (banner, lead form, botones flotantes, etc.)

Plantillas destacadas:
- Persona: medico, mascota, vehiculo, nino/adulto mayor (con soporte de foto).
- Empresa: restaurante, hotel, tarjeta, evento, catalogo, turismo (con enfoque visual y comercial).
- Nuevas ideas agregadas:
  - Empresa: 20 subtipos adicionales (ej: inmobiliaria, gimnasio, farmacia, cowork, legal, etc.)
  - Persona: 10 subtipos adicionales (ej: contacto de emergencia, CV, portafolio, viajero, donante, etc.)

Sincronizacion:
- al iniciar backend se aplica migracion de `profile_types` para completar campos nuevos faltantes en configuraciones antiguas.
- se mantienen personalizaciones existentes y los campos quedan disponibles para edicion de clientes.

Notas de uso de mapa:
- El campo `map` acepta direccion, coordenadas `lat,lng` o URL de Google Maps.
- En la tarjeta publica se renderiza embed + boton `Abrir mapa`.

## 11) Checklist de Produccion

1. Configurar `JWT_SECRET`.
2. Definir `CORS_ORIGINS` correctos.
3. Completar SMTP si usaras notificaciones por email.
4. Revisar parametros de tienda y reglas de suscripciones:
  - `enforce_master_only_subscription_purchase`
  - `allow_admin_manual_subscription_grants`
5. Verificar rol y permisos de cuentas master/subcuentas.
