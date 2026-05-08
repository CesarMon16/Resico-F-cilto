## Plan: Pre-Beta — Roles, Onboarding y Modo Contador completo

Trabajaré sobre el proyecto existente sin romper nada. Divido la evolución en **5 fases cortas** que iremos confirmando una por una. Esta primera respuesta plantea el plan completo y empezaríamos por la Fase 1 (la más crítica que pediste).

---

### Fase 1 — Onboarding por rol (PRIORIDAD)
Objetivo: que un usuario nuevo elija si es **Comerciante** o **Contador** y caiga en el flujo correcto.

- Nueva pantalla `src/pages/ElegirRol.tsx`: dos tarjetas grandes ("Soy comerciante 🛒" / "Soy contador 🧮"), lenguaje simple.
- Nueva pantalla `src/pages/OnboardingContador.tsx`: nombre, despacho (opcional), teléfono, ciudad, experiencia (opcional). Guarda en `profiles` y campos extra del despacho.
- Lógica de redirección post-login en `App.tsx`:
  - Sin rol asignado o sin negocio/onboarding → `/elegir-rol`
  - Comerciante sin negocio → `/preparar-negocio`
  - Contador sin onboarding → `/onboarding-contador`
  - Contador listo → `/contador`
  - Comerciante listo → `/`
- Migración:
  - Agregar columnas opcionales a `profiles`: `despacho`, `ciudad`, `experiencia_anios`, `onboarding_completo BOOLEAN DEFAULT false`.
  - El trigger `handle_new_user` ya inserta rol `USUARIO`; lo cambiamos para **no** asignar rol por defecto: el rol se asigna desde `ElegirRol` mediante una función `security definer` `asignar_rol_inicial(_role)` que sólo permite `USUARIO` o `CONTADOR` y sólo si el usuario aún no tiene rol.

### Fase 2 — RBAC real y rutas protegidas
- Componente `RoleRoute` que envuelve rutas y exige rol(es).
- `/contador/*` exige `CONTADOR|ADMIN`.
- `/admin/*` exige `ADMIN`.
- `BottomNav` se adapta al rol (contador no ve "Hoy vendí", ve "Mis clientes").
- Hook `useUserRole` ya existe; añadimos `requireRole()` helper.

### Fase 3 — Modo Contador completo
- `/contador`: listado de clientes con búsqueda, indicadores rápidos (ingresos/gastos/ISR del mes por cliente), botón "Agregar cliente por correo" (ya existe la función `buscar_contador_por_correo`; añadimos la inversa `buscar_cliente_por_correo` o reutilizamos invitación desde el cliente).
- `/contador/cliente/:id`: detalle del cliente — resumen fiscal, historial de movimientos, expediente (solo lectura, ya cubierto por RLS).

### Fase 4 — Panel Admin básico + Auditoría
- Tabla `auditoria` ya existe; añadimos inserciones desde puntos clave (login, registro, crear transacción, asignar cliente) vía función `registrar_evento(_accion, _metadata)` `security definer` que inserta con `auth.uid()`.
- `/admin`: métricas (totales de usuarios, contadores, transacciones), actividad reciente, listado de contadores con estado "aprobado" (campo nuevo `contador_aprobado BOOLEAN` en profiles, default true para no bloquear MVP — la UI lo deja preparado).
- `RoleRoute` protege `/admin`.

### Fase 5 — IA documental simulada + pulido UX
- En `Expediente`, al subir foto: simulación con `setTimeout` que "detecta" monto/fecha/tipo (valores plausibles) y pre-llena un formulario de transacción asociada al ticket.
- Mensajes amigables, loaders, toasts consistentes.
- README actualizado con arquitectura, roles y módulos.

---

### Detalles técnicos clave

- **Seguridad de roles**: el rol NO se elige desde el cliente directamente sobre `user_roles` (RLS lo bloquea — sólo admins). Se hace vía RPC `asignar_rol_inicial` `security definer` que valida: usuario autenticado, sin rol previo, rol ∈ {USUARIO, CONTADOR}. Esto previene escalado de privilegios.
- **Trigger `handle_new_user`**: dejar de insertar rol automáticamente; sólo crea `profiles`. El rol se asigna en `ElegirRol`.
- **Compat hacia atrás**: usuarios actuales sin rol caerán en `/elegir-rol` la próxima vez; los que ya tienen rol siguen igual.
- **No se rompe nada existente**: Dashboard, Asistente, Expediente, Declaración, Historial, Créditos, Perfil, PerfilFiscal se conservan tal cual.

---

### Esta iteración (Fase 1)

Si apruebas, en este turno hago **sólo Fase 1**:
1. Migración: columnas extra en `profiles`, función `asignar_rol_inicial`, ajuste del trigger.
2. `src/pages/ElegirRol.tsx` y `src/pages/OnboardingContador.tsx`.
3. Router en `App.tsx` con redirección por estado de rol/onboarding.
4. Pequeño ajuste en `BottomNav` para ocultar pestañas de comerciante cuando el usuario es contador.

Confirma para proceder con Fase 1, o dime si prefieres reordenar.