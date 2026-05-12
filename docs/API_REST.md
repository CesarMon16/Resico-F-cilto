# Documentación de la API (Supabase REST)

Facilito utiliza **Supabase** como backend as a service, el cual expone automáticamente una API REST full-featured usando PostgREST sobre PostgreSQL.

Todas las peticiones a la API deben incluir los siguientes headers:
- `apikey`: Tu clave anónima pública de Supabase.
- `Authorization`: `Bearer <jwt_token>` (Token JWT del usuario autenticado).
- `Content-Type`: `application/json`

La URL base es: `https://<PROJECT_REF>.supabase.co/rest/v1/`

---

## 1. Transacciones (Ingresos y Gastos)

### Obtener transacciones del mes
```http
GET /transacciones?usuario_id=eq.{user_id}&fecha=gte.{inicio_mes}
```
**Respuesta:**
```json
[
  {
    "id": "uuid",
    "usuario_id": "uuid",
    "tipo": "INGRESO",
    "monto": 5000.00,
    "fecha": "2026-05-11",
    "descripcion": "Venta mostrador",
    "con_factura": false,
    "created_at": "2026-05-11T12:00:00Z"
  }
]
```

### Registrar nueva transacción
```http
POST /transacciones
```
**Body:**
```json
{
  "usuario_id": "uuid",
  "tipo": "GASTO",
  "monto": 1500.50,
  "fecha": "2026-05-11",
  "descripcion": "Compra de insumos",
  "con_factura": true
}
```

---

## 2. Perfiles (Usuarios)

### Obtener información del usuario logueado
```http
GET /profiles?id=eq.{auth.uid()}
```
**Respuesta:**
```json
[
  {
    "id": "uuid",
    "nombre": "Juan Pérez",
    "rfc": "PEPJ900101XYZ",
    "correo": "juan@example.com"
  }
]
```

---

## 3. Créditos

### Solicitar Crédito
```http
POST /creditos
```
**Body:**
```json
{
  "usuario_id": "uuid",
  "monto_solicitado": 25000,
  "estatus": "PENDIENTE"
}
```

---

## 4. Contadores y Clientes

### Vincular un cliente a un contador
Este proceso utiliza un **RPC (Remote Procedure Call)** en Supabase para validar si el correo del contador existe antes de crear la relación.

```http
POST /rpc/asignar_contador_por_correo
```
**Body:**
```json
{
  "p_cliente_id": "uuid_del_cliente",
  "p_correo_contador": "contador@despacho.com"
}
```
**Respuesta:** Retorna `true` si el vínculo fue exitoso.

### Obtener clientes asignados (Vista de Contador)
```http
GET /contador_clientes?contador_id=eq.{auth.uid()}&estatus=eq.ACTIVO
```

---

## 5. Subida de Archivos (Tickets)

Para subir comprobantes o tickets fotográficos, se utiliza la API de Storage de Supabase, apuntando al bucket `tickets`.

```http
POST /storage/v1/object/tickets/{usuario_id}/{uuid_archivo}.jpg
```
*Se debe enviar el archivo en formato binario (multipart/form-data o Blob).*

---

## Reglas de Seguridad (RLS)
Cualquier petición que no cumpla con las reglas de Row Level Security será rechazada con un `HTTP 401 Unauthorized` o devolverá un arreglo vacío `[]`. 
* Un usuario `USUARIO` solo puede consultar datos donde su `usuario_id` coincida con su token.
* Un usuario `CONTADOR` puede consultar datos de `transacciones` donde el `usuario_id` pertenezca a sus clientes en `contador_clientes`.
* Un usuario `ADMIN` puede consultar la tabla sin restricciones.
