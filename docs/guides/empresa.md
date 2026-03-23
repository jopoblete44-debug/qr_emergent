# Guia de Uso: Empresa

Esta guia cubre cuentas empresa, cuenta master y subcuentas.

## 1) Estructura de Cuenta

- Cuenta empresa principal: `master`
- Sucursales: `subaccount`
- La cuenta master puede ver/gestionar recursos de sus subcuentas.

## 2) Crear y Gestionar QRs

1. Inicia sesion como empresa.
2. Ve a dashboard y crea perfiles QR de negocio.
3. Configura acciones publicas (CTAs), datos de perfil, fotos/banners y estado.

Importante:
- Si `allow_business_create_qr = true`, la creacion es directa (con limite `max_qr_per_business`).
- Si `allow_business_create_qr = false`, solo puedes crear QR si tienes `qr_quota_balance` (cupos de suscripcion).

Perfiles de empresa mejorados:
- restaurante, hotel, tarjeta, evento, catalogo y turismo tienen diseño publico optimizado.
- los campos visuales (logo, portada, avatar, banner) son editables por el cliente segun plantilla admin.

## 3) Comprar Suscripciones con Cupos QR

1. Inicia sesion con cuenta empresa `master`.
2. Ve a tienda y elige suscripcion de empresa.
3. Cada suscripcion tiene `Cupos QR` y periodo (mensual/anual).
4. Al validar compra:
  - se acredita saldo en `qr_quota_balance`.
5. Cada nuevo QR consume 1 cupo cuando aplica politica por cupos.

Importante:
- Las subcuentas no pueden comprar suscripciones.
- Las subcuentas si pueden usar los cupos acreditados a la cuenta master.

## 4) Gestionar y Renovar Suscripciones

Ruta: `Cliente empresa > Suscripciones`

En esta pagina puedes:
- ver historial de suscripciones compradas
- revisar estado (`activa`, `vencida`, `agotada`)
- ver fecha de compra y fecha de vencimiento
- renovar por:
  - `1 mes`
  - `1 ano`

Renovacion:
- se ejecuta por checkout (flujo pagado)
- solo disponible para la cuenta master
- subcuentas ven el detalle pero no pueden renovar

## 5) Subcuentas (Sucursales)

Desde cuenta master:
1. Crea subcuenta por sucursal.
2. Define permisos:
  - `manage_qr_profiles`
  - `view_locations`
  - `view_analytics`
3. Pausa/reactiva o elimina subcuentas segun operacion.

## 6) Leads y Conversiones

Activa captura de leads en perfiles business:
- formulario publico
- anti-spam (honeypot/rate limit/Turnstile)
- notificaciones (email/webhook)

Monitorea:
- escaneos
- clics CTA
- leads
- tasas de conversion
- exportacion CSV.

## 7) Recomendaciones Operativas

- Define un plan de cupos QR por sucursal.
- Centraliza compras de suscripciones en cuenta master.
- Revisa analiticas semanalmente para optimizar CTAs y conversion.
