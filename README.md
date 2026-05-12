<<<<<<< HEAD
# Welcome to your Lovable project

TODO: Document your project here
=======
# Facilito — Plataforma de Asistencia Fiscal RESICO

Asistente fiscal simple para micro-comerciantes mexicanos en régimen RESICO.
Mobile-first, lenguaje no técnico, instalable como app.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase): Postgres + Auth + Storage + Edge Functions
- **Estado / data**: TanStack Query, hooks propios
- **Validación**: Zod
- **Routing**: React Router v6
- **Notificaciones**: Sonner

## Instalación local

```bash
bun install        # o npm install
bun run dev        # vite dev server en http://localhost:8080
bun run build
bun run test       # vitest
```

## Variables de entorno

Generadas automáticamente por Lovable Cloud, **no editar a mano**:

| Variable                         | Uso                                |
| -------------------------------- | ---------------------------------- |
| `VITE_SUPABASE_URL`              | URL del proyecto backend           |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Clave pública (anon)               |
| `VITE_SUPABASE_PROJECT_ID`       | ID del proyecto                    |

## Estructura

```
src/
  components/        # UI reutilizable + ErrorBoundary + RoleRoute
    perfil/          # Vistas de perfil por rol
    dashboard/       # Avisos, salud financiera
    ui/              # shadcn/ui
  hooks/             # useAuth, useUserRole, useNegocio, useResumenMes
  lib/               # fiscal.ts, auditoria.ts, errors.ts, sanitize.ts, offlineQueue.ts
  services/          # Capa de negocio (transacciones, créditos, contador, fiscal)
  validators/        # Esquemas Zod
  pages/             # Rutas
  integrations/
    supabase/        # client.ts y types.ts (auto-generados)
supabase/
  config.toml
  migrations/        # SQL versionado
  functions/         # Edge functions (asistente)
public/
  manifest.webmanifest  # PWA-lite (instalable)
```

## Capas (arquitectura ligera)

```
UI (pages)  ─►  services/  ─►  Supabase client / RPC
                  │
                  ├─►  validators/   (Zod, mensajes humanos)
                  ├─►  lib/sanitize  (texto seguro)
                  ├─►  lib/errors    (toast amigable)
                  ├─►  lib/auditoria (auditLog)
                  └─►  lib/fiscal    (cálculos puros RESICO)
```

Las páginas no contienen lógica de negocio: arman UI y delegan en `services/`.

## Tablas Supabase

| Tabla               | Para qué                                                 |
| ------------------- | -------------------------------------------------------- |
| `profiles`          | Datos del usuario y perfil fiscal                        |
| `user_roles`        | Roles `USUARIO` / `CONTADOR` / `ADMIN` (separado)        |
| `negocios`          | Negocio del comerciante (uno por usuario en MVP)         |
| `transacciones`     | Ingresos y gastos                                        |
| `calculos_fiscales` | Cálculos guardados de declaración                        |
| `contador_clientes` | Asignación contador ↔ cliente                            |
| `creditos`          | Solicitudes de crédito                                   |
| `documentos`        | Comprobantes adicionales                                 |
| `auditoria`         | Bitácora de acciones del usuario                         |

Todas con **RLS activo**. `tenant_id` (nullable) preparado en `negocios`,
`transacciones` y `calculos_fiscales` para multi-tenant futuro.

## Roles y seguridad

- Roles en tabla aparte (`user_roles`) — nunca en `profiles`.
- Función `has_role(user, role)` SECURITY DEFINER usada por RLS para evitar recursión.
- Función `es_contador_de(contador, cliente)` permite a los contadores ver datos de sus clientes.
- Componente `<RoleRoute allow={["CONTADOR","ADMIN"]} />` protege rutas de contador.
- `<ProtectedRoute />` exige sesión activa.
- `<OnboardingGate />` fuerza elegir rol y configurar negocio antes de entrar.

## Auditoría

Helper `auditLog(accion, metadata)` (alias `registrarAuditoria`) registra:
`LOGIN`, `LOGOUT`, `TRANSACCION_CREADA`, `TRANSACCION_ELIMINADA`,
`CALCULO_GUARDADO`, `CLIENTE_ASIGNADO`, `CLIENTE_REMOVIDO`,
`CREDITO_SOLICITADO`, `TICKET_SUBIDO`.

## Modo offline

`src/lib/offlineQueue.ts` encola registros de ingresos/gastos en `localStorage`
cuando no hay internet. Al volver `online` se sincroniza automáticamente.

## PWA-lite (instalable)

`public/manifest.webmanifest` + meta tags en `index.html` permiten "Agregar a
pantalla principal" en Android/iOS. Sin service worker para evitar problemas
de caché en el preview de Lovable.

## Multi-tenant futuro

Estrategia preparada (no activa):

1. Crear tabla `tenants` (id, nombre, dueño).
2. Llenar `tenant_id` en `negocios`/`transacciones`/`calculos_fiscales`.
3. Añadir políticas RLS adicionales: `tenant_id IS NULL OR es_miembro(auth.uid(), tenant_id)`.
4. Mover `contador_clientes` a relación tenant ↔ cliente.

## Edge Functions

- `asistente`: chat con AI Gateway (Lovable AI) — responde preguntas fiscales en lenguaje simple.

## Convenciones

- Tokens semánticos (`bg-card`, `text-primary`, `bg-success-light`) — nunca colores Tailwind crudos.
- Mensajes de error en español, sin jerga (`"Escribe cuánto vendiste"`).
- Mobile-first; tap targets ≥ 44px; `inputMode="decimal"` en montos.
>>>>>>> Facilito_alpha
