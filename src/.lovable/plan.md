## Fase: Asistente Fiscal Inteligente

Evolución incremental sobre lo existente. **No** se reescribe arquitectura. Se priorizan los módulos de mayor impacto UX para llegar a Pre-Beta. Lo demás (multi-tenant, créditos bancarios reales, IA OCR real) queda preparado pero no integrado.

### Alcance de esta iteración (lo que sí entrego ahora)

1. **Declaración Asistida Conversacional** (`/declaracion`)
   - Reemplazo del cálculo plano por un wizard de 4 pasos tipo chat:
     1. "¿Qué mes quieres revisar?"
     2. Resumen de ventas detectadas + confirmar
     3. Resumen de gastos detectados + confirmar
     4. Resultado: "Esto es lo que probablemente tendrás que pagar" (ISR + IVA estimado, lenguaje humano, sin tecnicismos)
   - Botón "Guardar este cálculo" → persiste en `calculos_fiscales`.
   - Mantengo el cálculo actual de `lib/fiscal.ts` como motor.

2. **Dashboard más humano** (`/`)
   - Saludo contextual ("Buenos días, Juan 👋").
   - Frase motivadora según balance ("Vas bien este mes 💪" / "Aún no registras ventas hoy").
   - Card de "Salud financiera" (semáforo simple verde/amarillo/rojo).
   - Acceso directo a "Revisar mi declaración".

3. **Expediente Digital / Mi historial fiscal** (`/historial-fiscal`)
   - Vista cronológica unificada por mes:
     - tickets subidos (storage)
     - cálculos fiscales guardados
     - totales del mes
   - Reusa `Expediente` existente, agrega timeline visual.
   - Entrada desde Perfil y desde Dashboard.

4. **Notificaciones in-app simples**
   - Hook `useAvisos` que genera avisos derivados (sin tabla nueva):
     - "Aún no registras ventas hoy"
     - "Tu resumen mensual ya está listo" (si estamos en los primeros 5 días del mes)
     - "Te faltan tickets de este mes" (si hay gastos sin foto)
   - Campana en header del Dashboard con badge.

5. **Dashboard Contador profesional** (`/contador`)
   - Cards: total clientes, clientes con movimientos esta semana, clientes sin actividad 30 días.
   - Lista de clientes con: nombre, último movimiento, balance del mes, botón "Ver expediente".
   - Click → vista de detalle del cliente (read-only) usando RLS existente (`es_contador_de`).

6. **Auditoría básica**
   - Helper `registrarAuditoria()` y trigger en cliente para: login, creación de transacción, asignación contador-cliente, guardado de cálculo.
   - Feed reciente en panel admin.

7. **Empty states + skeletons + mensajes humanos**
   - Componentes `EmptyState` y `SkeletonCard` reutilizables.
   - Aplicados en Dashboard, Historial, Contador.
   - Reemplazo de errores técnicos por mensajes amables vía `toast`.

### Fuera de alcance esta iteración (próxima fase)

- IA documental real con OCR (queda mock que rellena formulario).
- Simulador de créditos avanzado e integración bancaria.
- Multi-tenant / organizaciones.
- Panel admin completo (solo dejo estructura + métricas básicas).
- Notificaciones push reales.

### Detalles técnicos

**Archivos nuevos**
- `src/pages/Declaracion.tsx` (rewrite a wizard)
- `src/pages/HistorialFiscal.tsx`
- `src/components/wizard/WizardStep.tsx`
- `src/components/EmptyState.tsx`, `src/components/SkeletonCard.tsx`
- `src/components/dashboard/SaludFinanciera.tsx`, `src/components/dashboard/Avisos.tsx`
- `src/components/contador/ClienteRow.tsx`, `src/pages/ContadorCliente.tsx`
- `src/hooks/useAvisos.ts`, `src/hooks/useResumenMes.ts`
- `src/lib/auditoria.ts`

**Archivos modificados**
- `src/pages/Dashboard.tsx` — saludo, salud, avisos, CTA declaración
- `src/pages/Contador.tsx` — métricas y lista mejorada
- `src/App.tsx` — rutas `/historial-fiscal`, `/contador/:clienteId`
- `src/components/perfil/UserProfileView.tsx` — link a historial fiscal
- `src/lib/fiscal.ts` — añadir `explicarISR()` y `explicarIVA()` en lenguaje humano

**Backend**
- Sin cambios de schema. Uso `auditoria`, `calculos_fiscales`, `transacciones`, `contador_clientes` ya existentes.
- Política de auditoría: insert con service no necesario, basta `INSERT` desde cliente con `usuario_id = auth.uid()` → necesito policy de INSERT en `auditoria` (actualmente solo SELECT). **Migración mínima**: agregar policy de INSERT propio.

### Diagrama de flujo declaración

```text
[Inicio] → [Elegir mes] → [Confirmar ventas] → [Confirmar gastos] → [Resultado humano] → [Guardar]
                                ↑                       ↑
                         (datos de transacciones del periodo)
```

¿Apruebo y procedo?
