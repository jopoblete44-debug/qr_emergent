# Guia de Uso: Persona

Esta guia explica el flujo recomendado para usuarios tipo persona.

## 1) Registro e Inicio de Sesion

1. Registra una cuenta tipo persona.
2. Inicia sesion en el dashboard.

## 2) Crear un Perfil QR

1. En dashboard, usa `Crear Perfil QR`.
2. Selecciona tipo personal y subtipo (medico, mascota, vehiculo, etc.).
3. Completa los datos del perfil.
4. Si el subtipo lo permite, sube foto directamente desde movil (camara/galeria).
5. Guarda y descarga el QR.

Nota:
- Si el admin desactivo creacion para personas (`allow_person_create_qr = false`), no veras el boton de crear.

## 3) Editar y Gestionar Perfiles

Desde el dashboard puedes:
- editar datos
- editar foto del perfil (segun plantilla activa)
- pausar/reactivar
- eliminar
- abrir perfil publico para verificar como se visualiza.

Los cambios guardados en el perfil se reflejan en la vista publica del QR segun la plantilla configurada por admin.

## 4) Escaneos y Ubicaciones

- Cada escaneo del QR se registra en historial.
- Si el perfil usa envio de ubicacion, podras revisar puntos en el mapa e historial.

## 5) Tienda y Compras

- Puedes comprar productos/suscripciones visibles en tienda.
- Si aplica cupon `FREE` y total queda en `0`, el pago se procesa internamente sin pasarela.

## 6) Seguridad Recomendada

- Usa contrasena robusta.
- Si compartes QR en redes, revisa que no exponga datos sensibles innecesarios.
