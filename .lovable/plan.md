# Pre-Beta Hardening Plan

Evolución incremental del MVP actual. Sin refactor masivo, sin cambios visuales, reutilizando todo lo existente.

## Alcance por fases (entregables concretos)

### Fase 1 — Arquitectura ligera + validaciones + errores (núcleo)
Base para todo lo demás. Bajo costo, alto impacto.

- `src/services/` — lógica de negocio extraída de páginas:
  - `transacciones.service.ts` (crear/listar/eliminar, audita automáticamente)
  - `creditos.service.ts` (solicitar crédito + auditoría)
  - `contador.service.ts` (asignar/desasignar cliente, listar clientes)
  - `fiscal.service.ts` (wrap de `lib/fiscal.ts` + persistir cálculo + auditar)
- `src/validators/` con Zod:
  - `transaccion.schema.ts` (monto > 0, ≤ 10M, descripción ≤ 200)
  - `credito.schema.ts`, `negocio.schema.ts`, `perfil.schema.ts`
  - Mensajes humanos en español ("Escribe cuánto vendiste")
- `src/lib/errors.ts` — `handleError(e, fallback)` → toast amigable + log mínimo
- `src/components/ErrorBoundary.tsx` — fallback UI ("Algo salió mal, intenta de nuevo")
- Actualizar páginas existentes (`Registrar`, `Creditos`, `Declaracion`) para usar services + validators. **Sin cambiar UI.**

### Fase 2 — Seguridad MVP + Auditoría completa
- `src/components/RoleRoute.tsx` — wrapper que exige rol(es); redirige a `/` si no cumple
- Aplicar a `/contador`, `/contador/:id` (CONTADOR/ADMIN)
- Sanitización: helper `sanitizeText()` (trim + strip control chars) usado en services
- Expandir `auditoria.ts`: añadir acciones `LOGOUT`, `TRANSACCION_ELIMINADA`, `CREDITO_SOLICITADO`, `CLIENTE_ASIGNADO`, `CLIENTE_REMOVIDO`
- Renombrar export a `auditLog()` (alias, mantener compatibilidad)
- Disparar `LOGIN`/`LOGOUT` desde `useAuth`

### Fase 3 — UX móvil + Manejo de errores visible
- Asegurar `inputMode="decimal"` y `inputMode="numeric"` en todos los montos (revisar formularios existentes)
- Verificar tap targets ≥ 44px (ya en su mayoría)
- `EmptyState` y `SkeletonCard` ya existen — extender uso donde falte
- ErrorBoundary global en `App.tsx`

### Fase 4 — Dashboard contador mejorado
- En `Contador.tsx`: añadir campo de búsqueda (nombre/correo), filtro estatus (todos/activos/inactivos), badges de alerta por cliente:
  - "Sin movimientos 30d"
  - "Gastos > Ingresos este mes"
- Reutiliza componentes/estilos actuales

### Fase 5 — OCR ticket simulado
- En `Expediente.tsx` (o nuevo botón en `/registrar/gasto`): tras subir foto, "Detectar datos" → simulación local (regex sobre nombre del archivo + valores plausibles aleatorios) que prellena monto/fecha en un formulario
- Sin librerías nuevas, sin IA. Marcado como "Sugerencia, revisa antes de guardar"

### Fase 6 — PWA + Offline básico para registrar
- `vite-plugin-pwa` con guard anti-iframe (per `<pwa>` rules), `devOptions.enabled: false`, `NetworkFirst` HTML, denylist `/~oauth`
- `manifest.webmanifest` con icons (reutilizar `public/placeholder.svg` + generar 192/512)
- `src/lib/offlineQueue.ts` — cola en `localStorage` para `INGRESO`/`GASTO` cuando `!navigator.onLine`; flush en evento `online`
- `transacciones.service.create()` detecta offline → encola + toast "Guardado, se enviará al recuperar internet"

### Fase 7 — Multi-tenant prep + docs
- Migración: añadir columna `tenant_id uuid` nullable a `negocios`, `transacciones`, `calculos_fiscales` (default null, sin políticas nuevas todavía). Sin romper RLS actuales.
- `README.md` con: stack, estructura, env vars, instalación, tablas Supabase, estrategia multi-tenant futura
- `docs/ARQUITECTURA.md` corto con diagrama ASCII

## Lo que NO se hace
- Sin nuevas librerías de IA/OCR pesadas
- Sin cambiar diseño, rutas, ni Supabase schema (excepto `tenant_id` nullable)
- Sin tests E2E nuevos (fuera de scope)
- Sin sistema de notificaciones push
- Sin migración de framework

## Orden de ejecución recomendado
Fases 1 → 2 → 3 → 4 → 5 → 6 → 7. Cada fase es independiente y desplegable.

## Pregunta para confirmar

¿Ejecuto **las 7 fases en una sola corrida** (cambios extensos, ~20–25 archivos nuevos/editados, una migración trivial), o prefieres que avance **fase por fase** confirmando entre cada una para mejor control y menos consumo si quieres ajustar?
