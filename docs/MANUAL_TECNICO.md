# Manual Técnico - Plataforma de Asistencia Fiscal RESICO

Este manual proporciona una visión exhaustiva de la arquitectura, stack tecnológico y procedimientos operativos para desarrolladores.

## 1. Stack Tecnológico

La plataforma utiliza un stack moderno optimizado para rendimiento y despliegue rápido:

- **Frontend Core**: [React 18.3.1](https://react.dev/)
- **Build Tool**: [Vite 5.4.19](https://vitejs.dev/)
- **Lenguaje**: [TypeScript 5.8.3](https://www.typescriptlang.org/)
- **Estilizado**: [TailwindCSS 3.4.17](https://tailwindcss.com/) con [shadcn/ui](https://ui.shadcn.com/)
- **Base de Datos & Auth**: [Supabase 2.105.4](https://supabase.com/)
- **Gestión de Estado Asíncrono**: [TanStack Query v5](https://tanstack.com/query/latest)
- **IA Conversacional**: [AI SDK by Vercel v3.0.179](https://sdk.vercel.ai/docs)
- **Visualización de Datos**: [Recharts 2.15.4](https://recharts.org/)

## 2. Arquitectura del Sistema

El sistema sigue un patrón de **Monolito Modular** en el frontend, delegando la persistencia y lógica pesada al BaaS (Backend as a Service) de Supabase.

- **Frontend**: Aplicación SPA (Single Page Application) con capacidades de PWA (Progressive Web App).
- **Capa de Datos**: Integración directa con PostgREST (Supabase) mediante el cliente `supabase-js`.
- **Lógica de Negocio**: Distribuida entre Hooks personalizados (`src/hooks/`) y Funciones Puras (`src/lib/`).
- **Edge Computing**: Lógica de IA y procesamiento pesado alojado en Supabase Edge Functions.

## 3. Gestión de Estado y Persistencia

- **Estado Global**: Se gestiona mediante el contexto de autenticación (`AuthProvider`) y la caché de TanStack Query para datos del servidor.
- **Estado Local**: Uso intensivo de `useState` y `useReducer` para flujos complejos (ej. Asistente).
- **Persistencia**:
    - **Síncrona**: Base de datos relacional PostgreSQL (Supabase).
    - **Binaria**: Supabase Storage para expedientes y tickets.
    - **Efímera**: `sessionStorage` para alertas de sesión única.

## 4. Guía de Despliegue y Desarrollo

### Requisitos Previos
- Node.js (v18+)
- Supabase CLI (opcional para desarrollo local)

### Pasos de Instalación
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno en `.env`:
   ```env
   VITE_SUPABASE_URL=tu_url
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```
4. Ejecutar servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Producción
Generar el bundle optimizado:
```bash
npm run build
```

## 5. Contratos de API y Servicios

Los servicios se encuentran en `src/services/` y encapsulan la comunicación con Supabase:

- **`transacciones.service.ts`**: Gestión de ingresos y gastos. Soporta lógica de contingencia offline.
- **`contador.service.ts`**: Consultas para el rol de Contador, incluyendo agregaciones de clientes.
- **`fiscal.service.ts`**: Interfaz con el motor de cálculos fiscales en el cliente.
- **`creditos.service.ts`**: Gestión de solicitudes de apoyo gubernamental.

### Edge Functions
- **`asistente`**: Endpoint principal para el chatbot de IA. Utiliza modelos de lenguaje para "Slot Filling" y extracción de intención.

---
*Documentación generada automáticamente bajo el Protocolo de Documentación Automatizada v1.0.*
