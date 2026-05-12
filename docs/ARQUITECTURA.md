# Arquitectura — Facilito

## Visión general

Modular monolith client-side con Postgres gestionado (Lovable Cloud).
Sin servidor propio salvo edge functions puntuales.

```text
┌─────────────────────────────────────────────────────────────┐
│  React PWA (Vite + TS + Tailwind)                           │
│                                                             │
│  pages/  ──►  services/  ──►  validators/  ──►  errors      │
│                  │                                          │
│                  ├──►  lib/auditoria  (auditLog)            │
│                  ├──►  lib/fiscal     (cálculos puros)      │
│                  ├──►  lib/sanitize                         │
│                  └──►  lib/offlineQueue (localStorage)      │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (Lovable Cloud)                                   │
│  • Postgres + RLS                                           │
│  • Auth (email + Google opcional)                           │
│  • Storage (bucket "tickets", privado)                      │
│  • Edge Functions (asistente AI)                            │
│  • RPC: buscar_contador_por_correo, asignar_rol_inicial,    │
│         has_role, es_contador_de                            │
└─────────────────────────────────────────────────────────────┘
```

## Decisiones clave

- **Roles separados**: `user_roles` aparte de `profiles` para evitar privilege escalation.
- **RLS en TODO**: cada tabla del esquema `public` tiene políticas explícitas.
- **Cálculos fiscales puros**: `lib/fiscal.ts` no toca BD; testeable y reutilizable.
- **Servicios delgados**: orquestan validación + persistencia + auditoría.
- **Offline-first parcial**: solo ingresos/gastos para no complicar la UX.
- **PWA-lite**: manifest + meta tags, sin service worker (compatibilidad con preview).

## Flujo de creación de transacción

```text
Registrar.tsx
    │ submit
    ▼
services/transacciones.service.ts
    │
    ├─► validators/transaccion.schema.ts (Zod)
    ├─► lib/sanitize.ts
    ├─► navigator.onLine ? insert : enqueue local
    └─► lib/auditoria.ts (auditLog "TRANSACCION_CREADA")
```

## Manejo de errores

Toda excepción de servicio se atrapa en la página con `handleError(err)`:
- log técnico en consola
- toast amigable en español
- `<ErrorBoundary />` global captura crashes de render

## Próximos pasos sugeridos

1. Activar `tenants` reales y reglas multi-tenant.
2. OCR real (servicio externo como Google Vision o Tesseract WASM).
3. Edge function de generación de PDF de declaración.
4. Notificaciones push (Web Push API + edge cron).
