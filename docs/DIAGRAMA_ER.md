# Diagrama Entidad-Relación (ER) - RESICO

Este documento describe la estructura de datos de la plataforma, extraída de las migraciones de base de datos y definiciones de tipos de Supabase.

## Arquitectura de Datos (Mermaid)

```mermaid
erDiagram
    profiles ||--o{ negocios : "usuario_id"
    negocios ||--o{ transacciones : "negocio_id"
    negocios ||--o{ documentos : "negocio_id"
    negocios ||--o{ calculos_fiscales : "negocio_id"
    profiles ||--o{ user_roles : "user_id"
    profiles ||--o{ creditos : "usuario_id"
    profiles ||--o{ auditoria : "usuario_id"

    profiles {
        uuid id PK "Referencia auth.users"
        string nombre
        string rfc
        string correo
        string curp
        string domicilio_fiscal
        string ciudad
        string regimen_fiscal
        string actividad_economica
        date fecha_inicio_operaciones
        boolean onboarding_completo
        timestamp created_at
    }

    negocios {
        uuid id PK
        uuid usuario_id FK "Relación con profiles"
        string nombre_negocio
        string giro
        string ubicacion
        uuid tenant_id
        timestamp created_at
    }

    transacciones {
        uuid id PK
        uuid negocio_id FK "Relación con negocios"
        uuid usuario_id FK "Relación con profiles"
        numeric monto
        string tipo "INGRESO | GASTO"
        date fecha
        string descripcion
        boolean con_factura
        string categoria
        string metodo_pago
        string contraparte
        timestamp created_at
    }

    documentos {
        uuid id PK
        uuid negocio_id FK "Relación con negocios"
        uuid usuario_id FK "Relación con profiles"
        string tipo "Ej: Constancia, Opinión"
        string url "Ruta en Storage"
        timestamp fecha_subida
    }

    calculos_fiscales {
        uuid id PK
        uuid negocio_id FK "Relación con negocios"
        uuid usuario_id FK "Relación con profiles"
        string periodo "YYYY-MM"
        numeric ingresos
        numeric gastos
        numeric isr_estimado
        numeric iva_estimado
        timestamp fecha_calculo
    }

    user_roles {
        uuid id PK
        uuid user_id FK "Relación con profiles"
        string role "USUARIO | CONTADOR | ADMIN"
    }

    creditos {
        uuid id PK
        uuid usuario_id FK "Relación con profiles"
        numeric monto_solicitado
        string estatus "SOLICITADO | EN_REVISION | APROBADO | ..."
        timestamp fecha_solicitud
    }
```

## Resumen de Tablas Detectadas

| Tabla | Propósito | Relación Principal |
|-------|-----------|-------------------|
| `profiles` | Almacena el perfil fiscal y personal del usuario. | Extensión de `auth.users`. |
| `negocios` | Entidad central del comercio o actividad profesional. | Pertenece a un `profile`. |
| `transacciones` | Registro de flujos monetarios (Ingresos/Gastos). | Asociado a un `negocio`. |
| `documentos` | Repositorio de archivos PDF/JPG del expediente. | Vinculado a un `negocio`. |
| `calculos_fiscales` | Historial de proyecciones de impuestos. | Resultado de análisis sobre `negocios`. |
| `user_roles` | Gestión de permisos (RBAC). | Determina el acceso (Admin/Contador/Usuario). |
| `creditos` | Gestión de solicitudes de apoyo gubernamental. | Solicitado por un `usuario`. |

---
*Documentación generada automáticamente bajo el Protocolo de Documentación Automatizada v1.0.*
