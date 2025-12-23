# Panel de Super Administrador - PadelPro

## Descripción General

Se ha creado un panel completo de **Super Administrador** que permite gestionar todo el sistema PadelPro a nivel global. Este panel está disponible exclusivamente para usuarios con rol `SUPER_ADMIN`.

## Acceso

- **URL**: `/superadmin`
- **Rol Requerido**: `SUPER_ADMIN`
- **Login**: `/auth/login-superadmin`

## Características Principales

### 1. Dashboard Principal
Vista general con estadísticas del sistema:
- **Total de Clubs**: Activos e inactivos
- **Total de Pistas**: En todos los clubs
- **Instructores**: Total activos
- **Usuarios**: Total registrados por rol
- **Créditos**: Total en el sistema (activos y bloqueados)
- **Reservas**: Total, confirmadas y canceladas

### 2. Gestión de Clubs
**Ruta API**: `/api/superadmin/clubs`

Funcionalidades:
- ✅ Ver todos los clubs con información detallada
- ✅ Crear nuevos clubs de padel
- ✅ Eliminar clubs existentes
- ✅ Ver estadísticas por club (pistas, usuarios, instructores)
- ✅ Asignar administradores a clubs
- ✅ Crear pistas automáticamente al crear un club

**Formulario de Creación de Club**:
- Nombre del club *
- Dirección *
- Email
- Teléfono
- Sitio web
- Descripción
- Precio por hora de alquiler
- Número de pistas (se crean automáticamente)
- Email del administrador (se crea/busca automáticamente)

### 3. Gestión de Administradores
**Ruta API**: `/api/superadmin/admins`

Funcionalidades:
- ✅ Ver todos los administradores (Super Admin y Club Admin)
- ✅ Crear nuevos administradores
- ✅ Ver clubs asignados a cada admin
- ✅ Ver estado activo/inactivo

**Tipos de Administradores**:
- `SUPER_ADMIN`: Acceso completo al sistema
- `CLUB_ADMIN`: Acceso solo a su club asignado

### 4. Gestión de Instructores
**Ruta API**: `/api/superadmin/instructors`

Funcionalidades:
- ✅ Ver todos los instructores del sistema
- ✅ Filtrar por club
- ✅ Ver especialidades y biografía
- ✅ Ver tarifa por hora
- ✅ Ver número de clases asignadas
- ✅ Ver valoración
- ✅ Ver disponibilidad

### 5. Gestión de Usuarios
**Ruta API**: `/api/superadmin/users`

Funcionalidades:
- ✅ Ver todos los usuarios del sistema
- ✅ Filtrar por rol (PLAYER, INSTRUCTOR, CLUB_ADMIN, SUPER_ADMIN)
- ✅ Filtrar por club
- ✅ Búsqueda por nombre o email
- ✅ Ver créditos disponibles
- ✅ Ver número de reservas
- ✅ Ver nivel de juego

## Estructura de Archivos

### Frontend
```
src/app/superadmin/
├── page.tsx              # Panel principal completo con todos los tabs
├── layout.tsx            # Layout del panel
└── clubs/
    └── page.tsx          # Vista detallada de clubs (futuro)
```

### API Endpoints
```
src/app/api/superadmin/
├── clubs/route.ts        # GET, POST, DELETE clubs
├── users/route.ts        # GET users con filtros
├── admins/route.ts       # GET, POST admins
├── instructors/route.ts  # GET instructors
└── stats/route.ts        # GET estadísticas globales
```

### Navegación
```
src/components/layout/
├── DesktopSidebar.tsx       # Sidebar con enlace a Super Admin
└── LeftNavigationBar.tsx    # Barra izquierda con ícono Super Admin
```

## APIs Implementadas

### 1. `/api/superadmin/clubs`

**GET** - Obtener todos los clubs con información detallada
- Incluye: admin, courts, users, instructors
- Formato: `{ clubs: Club[] }`

**POST** - Crear nuevo club
```json
{
  "name": "Padel Estrella",
  "address": "Calle Principal 123",
  "phone": "+34 600 000 000",
  "email": "info@club.com",
  "website": "https://www.club.com",
  "description": "Descripción del club",
  "courtRentalPrice": 10.0,
  "adminEmail": "admin@club.com",
  "courtsCount": 4
}
```

**DELETE** - Eliminar club
- Query param: `clubId`

### 2. `/api/superadmin/users`

**GET** - Obtener usuarios con filtros
- Query params opcionales:
  - `role`: PLAYER | INSTRUCTOR | CLUB_ADMIN | SUPER_ADMIN
  - `clubId`: ID del club
  - `search`: Buscar por nombre o email

### 3. `/api/superadmin/admins`

**GET** - Obtener todos los administradores
- Incluye clubs asignados

**POST** - Crear nuevo administrador
```json
{
  "name": "Juan Pérez",
  "email": "admin@example.com",
  "phone": "+34 600 000 000",
  "role": "CLUB_ADMIN"
}
```

### 4. `/api/superadmin/instructors`

**GET** - Obtener instructores
- Query param opcional: `clubId`

### 5. `/api/superadmin/stats`

**GET** - Obtener estadísticas globales
```json
{
  "stats": {
    "clubs": { "total": 5, "active": 4 },
    "courts": { "total": 20 },
    "users": { "total": 150, "byRole": {...} },
    "instructors": { "total": 12 },
    "admins": { "total": 6 },
    "bookings": { "total": 500, "byStatus": {...} },
    "credits": { "total": 50000, "blocked": 5000 }
  }
}
```

## Navegación

El panel de Super Administrador está integrado en la navegación principal:

### Sidebar (Desktop)
- Ícono dorado con corona
- Texto: "Super Admin"
- Solo visible para rol `SUPER_ADMIN`

### Barra Izquierda (Mobile/Desktop)
- Ícono: Target (diana)
- Orden: Entre Calendario y Config Instructor
- Solo visible para rol `SUPER_ADMIN`

## Seguridad

### Validación de Acceso
Todos los endpoints y páginas validan que el usuario tenga rol `SUPER_ADMIN`:

```typescript
const data = await response.json();
const userRole = data.user?.role;

if (userRole !== 'SUPER_ADMIN') {
  // Acceso denegado
  return redirect('/');
}
```

### Protección en API
Las APIs del super admin deben validar el rol del usuario autenticado (implementar según sistema de auth).

## Próximas Mejoras

### Features Pendientes
- [ ] Editar información de clubs existentes
- [ ] Desactivar/activar administradores
- [ ] Ver y gestionar transacciones globales
- [ ] Reportes y análisis avanzados
- [ ] Logs de actividad del sistema
- [ ] Gestión de permisos granulares
- [ ] Notificaciones push a usuarios/admins
- [ ] Exportar datos a CSV/Excel
- [ ] Vista detallada de cada usuario (modal o página)
- [ ] Gestión de precios y tarifas globales

### Mejoras Técnicas
- [ ] Implementar paginación en listados largos
- [ ] Cache de estadísticas para mejor rendimiento
- [ ] Websockets para actualizaciones en tiempo real
- [ ] Tests unitarios e integración
- [ ] Documentación API con Swagger

## Uso del Sistema

### Crear un Nuevo Club

1. Ir a `/superadmin`
2. Seleccionar tab "Clubs"
3. Click en "Crear Nuevo Club"
4. Completar formulario
5. El sistema automáticamente:
   - Crea el club
   - Crea las pistas especificadas
   - Busca o crea el administrador por email

### Gestionar Usuarios

1. Ir a `/superadmin`
2. Seleccionar tab "Usuarios"
3. Usar filtros:
   - Buscar por nombre/email
   - Filtrar por rol
   - Filtrar por club
4. Ver información detallada de cada usuario

### Ver Estadísticas

1. Ir a `/superadmin`
2. El Dashboard muestra automáticamente:
   - Métricas clave
   - Clubs recientes
   - Distribución por roles
   - Estado del sistema

## Notas Técnicas

### Prisma Queries
Se usa el singleton de Prisma (`@/lib/prisma`) para todas las consultas.

### Performance
- Las estadísticas usan `Promise.all()` para consultas paralelas
- Includes optimizados para reducir N+1 queries
- Uso de `select` para limitar datos cargados

### TypeScript
- Interfaces completas para todos los tipos
- Validaciones estrictas en formularios
- Type-safe API responses

## Troubleshooting

### "Acceso Denegado"
- Verificar que el usuario tenga rol `SUPER_ADMIN` en la BD
- Limpiar localStorage y cookies
- Re-login con credenciales de super admin

### No se cargan los datos
- Verificar que las APIs respondan correctamente
- Check console del navegador para errores
- Verificar conexión a la base de datos

### Error al crear club
- Verificar que el nombre no esté duplicado
- Comprobar que los campos obligatorios estén completos
- Revisar logs del servidor

## Conclusión

El panel de Super Administrador proporciona control completo sobre el sistema PadelPro, permitiendo:
- Gestión centralizada de todos los clubs
- Administración de usuarios a nivel global
- Monitoreo de métricas del sistema
- Creación y configuración simplificada

Es la herramienta principal para operadores del sistema que necesitan visibilidad y control total sobre la plataforma.
