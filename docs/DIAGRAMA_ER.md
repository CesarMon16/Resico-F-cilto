# Diagrama Entidad-Relación (ER) — Facilito

El siguiente diagrama ilustra la arquitectura de la base de datos PostgreSQL de la plataforma, diseñada bajo el modelo multi-tenant.

```mermaid
erDiagram
    %% Entities
    profiles {
        uuid id PK "auth.users"
        string nombre
        string rfc
        string correo
        string telefono
        string curp
        string despacho
        timestamp created_at
        timestamp updated_at
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        enum role "app_role: USUARIO, CONTADOR, ADMIN"
        timestamp created_at
    }

    negocios {
        uuid id PK
        uuid usuario_id FK
        string nombre_negocio
        string giro
        string ubicacion
        uuid tenant_id "Para segmentación corporativa"
        timestamp created_at
        timestamp updated_at
    }

    transacciones {
        uuid id PK
        uuid usuario_id FK
        enum tipo "movimiento_tipo: INGRESO, GASTO"
        numeric monto
        date fecha
        string descripcion
        boolean con_factura
        string comprobante_url
        uuid tenant_id
        timestamp created_at
    }

    calculos_fiscales {
        uuid id PK
        uuid usuario_id FK
        string periodo "YYYY-MM"
        numeric ingresos
        numeric gastos
        numeric isr
        numeric iva
        uuid tenant_id
        timestamp created_at
    }

    creditos {
        uuid id PK
        uuid usuario_id FK
        numeric monto_solicitado
        enum estatus "credito_estatus: PENDIENTE, APROBADO, RECHAZADO"
        timestamp fecha_solicitud
        timestamp updated_at
    }

    auditoria {
        uuid id PK
        uuid usuario_id FK "Nullable para eventos sistema"
        string accion
        jsonb metadata
        timestamp created_at
    }

    contador_clientes {
        uuid id PK
        uuid contador_id FK
        uuid cliente_id FK
        enum estatus "estado_relacion: ACTIVO, INACTIVO"
        timestamp created_at
        timestamp updated_at
    }

    %% Relationships
    profiles ||--o{ user_roles : "tiene roles"
    profiles ||--o{ negocios : "crea negocios"
    profiles ||--o{ transacciones : "registra movimientos"
    profiles ||--o{ calculos_fiscales : "calcula impuestos"
    profiles ||--o{ creditos : "solicita"
    profiles ||--o{ auditoria : "realiza acciones"
    
    profiles ||--o{ contador_clientes : "es contador de"
    profiles ||--o{ contador_clientes : "es cliente de"

    negocios ||--|{ transacciones : "opcionalmente agrupa"
```

## Notas Técnicas
1. **Multi-tenant:** Las tablas transaccionales cuentan con `tenant_id` para aislar datos a futuro si el software se despliega en esquemas B2B pesados.
2. **RLS (Row Level Security):** Todas las relaciones están protegidas a nivel de base de datos en Supabase. Un usuario solo puede acceder a las filas donde `usuario_id = auth.uid()` o si cuenta con el rol `ADMIN`.
3. **Auditoría:** La tabla `auditoria` no tiene foreign key estricta hacia `profiles` para permitir el registro de eventos de sistema o intentos de login fallidos donde el `auth.uid()` aún no existe.
