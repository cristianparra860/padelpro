# Sistema de Impersonation - PadelPro

## ✅ Sistema Completo Implementado

Se ha implementado un **sistema completo de impersonation** (suplantación de identidad) que permite a los super administradores acceder al sistema como cualquier usuario para resolver problemas.

## 🎭 Funcionalidades Implementadas

### 1. **Base de Datos - Log de Auditoría**

**Modelo `ImpersonationLog`** en Prisma Schema:
```prisma
model ImpersonationLog {
  id                String   @id @default(cuid())
  superAdminId      String   // ID del super admin
  superAdminEmail   String   // Email del super admin
  targetUserId      String   // ID del usuario suplantado
  targetUserEmail   String   // Email del usuario suplantado
  targetUserRole    String   // Rol del usuario suplantado
  startedAt         DateTime @default(now())
  endedAt           DateTime?
  durationMinutes   Int?     // Duración calculada
  ipAddress         String?  // IP del impersonation
  userAgent         String?  // Navegador usado
  reason            String?  // Razón del impersonation
}
```

**Características**:
- ✅ Registra cada impersonation automáticamente
- ✅ Guarda quién, cuándo y por cuánto tiempo
- ✅ Captura IP y user agent para seguridad
- ✅ Razón opcional del acceso

### 2. **API de Impersonation**

**Endpoint**: `/api/superadmin/impersonate`

#### **POST** - Iniciar Impersonation
```json
{
  "superAdminId": "abc123",
  "targetUserId": "user456",
  "reason": "Ayudar con problema de reservas"
}
```

**Response**:
```json
{
  "success": true,
  "impersonationLogId": "log789",
  "originalUser": { /* datos super admin */ },
  "targetUser": { /* datos usuario target */ }
}
```

#### **DELETE** - Terminar Impersonation
Query params: `?logId=xxx&superAdminId=yyy`

**Response**:
```json
{
  "success": true,
  "duration": "15 minutos",
  "restoredUser": { /* datos super admin restaurado */ }
}
```

#### **GET** - Obtener Logs de Auditoría
Query params opcionales:
- `superAdminId`: Filtrar por super admin
- `targetUserId`: Filtrar por usuario target
- `limit`: Límite de resultados (default: 50)

**Response**:
```json
{
  "logs": [ /* array de logs */ ],
  "stats": {
    "total": 150,
    "active": 2,
    "avgDurationMinutes": 12
  }
}
```

### 3. **Banner de Advertencia**

**Componente**: `ImpersonationBanner.tsx`

**Características**:
- ✅ Aparece en la parte superior de TODA la aplicación
- ✅ Color amarillo para máxima visibilidad
- ✅ Muestra:
  - Nombre del super admin original
  - Usuario siendo suplantado
  - Rol del usuario target
  - Duración en tiempo real (contador)
- ✅ Botón "Salir de Impersonation" siempre visible
- ✅ Responsive (versión móvil y desktop)
- ✅ Animación de entrada

### 4. **Hook Personalizado**

**Hook**: `useImpersonation()`

```typescript
const {
  isImpersonating,      // Boolean: ¿está activo?
  impersonationData,    // Datos del impersonation actual
  isLoading,            // Estado de carga
  startImpersonation,   // Función para iniciar
  endImpersonation      // Función para terminar
} = useImpersonation();
```

**Funciones**:
- `startImpersonation(superAdminId, targetUserId, reason?)`
- `endImpersonation()`

**Auto-redirección**:
- CLUB_ADMIN → `/admin`
- INSTRUCTOR → `/instructor`
- PLAYER → `/activities`

### 5. **Diálogo de Confirmación**

**Componente**: `LoginAsDialog.tsx`

**Características**:
- ✅ Modal de confirmación antes de impersonar
- ✅ Muestra información del usuario target
- ✅ Advertencias de seguridad
- ✅ Campo opcional para razón del acceso
- ✅ Botón de confirmación destacado

### 6. **Botones "Login As"**

**Ubicaciones**:
1. **Panel de Administradores** (`/superadmin` → tab Admins)
   - Cada tarjeta de admin tiene botón "Login As"
   
2. **Panel de Usuarios** (`/superadmin` → tab Usuarios)
   - Cada usuario en la lista tiene botón "Login As"

**Comportamiento**:
1. Click en "Login As"
2. Abre diálogo de confirmación
3. Muestra datos del usuario
4. Pide razón opcional
5. Confirma → Inicia impersonation
6. Redirige a la vista apropiada del usuario

### 7. **Sistema de Sesión Dual**

**localStorage**:
```javascript
// Datos del impersonation activo
localStorage.setItem('impersonation', JSON.stringify({
  logId: 'xxx',
  originalUser: { /* super admin */ },
  targetUser: { /* usuario target */ },
  startedAt: '2025-12-22T...'
}));

// Usuario actual (temporal)
localStorage.setItem('currentUser', JSON.stringify(targetUser));
```

**Al salir**:
```javascript
// Limpiar impersonation
localStorage.removeItem('impersonation');

// Restaurar super admin
localStorage.setItem('currentUser', JSON.stringify(originalUser));
```

## 🔐 Seguridad Implementada

### Auditoría Completa
- ✅ Cada impersonation queda registrado en BD
- ✅ No se puede borrar el log
- ✅ Incluye timestamp de inicio y fin
- ✅ Captura IP y user agent
- ✅ Guarda razón del acceso

### Verificaciones
- ✅ Solo `SUPER_ADMIN` puede iniciar impersonation
- ✅ Validación de permisos en API
- ✅ Verificación de existencia de usuarios
- ✅ Confirmación visual antes de impersonar

### Visibilidad
- ✅ Banner siempre visible en modo impersonation
- ✅ No se puede ocultar el banner
- ✅ Color amarillo de advertencia
- ✅ Botón de salida siempre accesible

### Restricciones Opcionales (futuras)
- [ ] No permitir cambiar contraseñas en modo impersonation
- [ ] No permitir eliminar cuentas
- [ ] Timeout automático después de X minutos
- [ ] Notificar al usuario que fue suplantado

## 📋 Cómo Usar el Sistema

### Como Super Administrador

1. **Acceder al panel**: `/superadmin`

2. **Encontrar el usuario**:
   - Ir a tab "Usuarios" o "Administradores"
   - Usar filtros de búsqueda
   - Localizar el usuario con problema

3. **Iniciar impersonation**:
   - Click en botón "Login As"
   - Leer advertencias en el diálogo
   - Escribir razón (opcional pero recomendado)
   - Click en "Confirmar Impersonation"

4. **Trabajar como el usuario**:
   - Serás redirigido a su vista apropiada
   - Verás exactamente lo que ve el usuario
   - Podrás hacer las mismas acciones
   - Banner amarillo siempre visible arriba

5. **Terminar impersonation**:
   - Click en "Salir de Impersonation" en el banner
   - Confirmar
   - Volverás a tu sesión de super admin
   - Redirigido a `/superadmin`

### Escenarios de Uso

**Ejemplo 1: Admin de Club con problema de reservas**
```
1. Super Admin ve reporte de problema
2. Click "Login As" en el admin del club
3. Razón: "Verificar problema con reservas canceladas"
4. Ve el panel del admin exactamente como él lo ve
5. Reproduce el problema
6. Hace correcciones necesarias
7. Sale del impersonation
8. Duración: 8 minutos (registrado en log)
```

**Ejemplo 2: Usuario no puede hacer una reserva**
```
1. Usuario reporta error al reservar
2. Super Admin encuentra al usuario en el panel
3. Click "Login As"
4. Razón: "Depurar error en sistema de reservas"
5. Intenta hacer la reserva como el usuario
6. Identifica el problema (créditos insuficientes)
7. Sale y documenta el problema
```

## 📊 Monitoreo y Análisis

### Ver Logs de Impersonation

**API Endpoint**: `GET /api/superadmin/impersonate`

```javascript
// Ver todos los impersonations de un super admin
GET /api/superadmin/impersonate?superAdminId=xxx

// Ver quién ha accedido a un usuario específico
GET /api/superadmin/impersonate?targetUserId=yyy

// Limitar resultados
GET /api/superadmin/impersonate?limit=100
```

**Response incluye estadísticas**:
- Total de impersonations
- Impersonations activos ahora
- Duración promedio

### Datos Registrados por Impersonation
- ID del super admin
- Email del super admin
- ID del usuario target
- Email del usuario target
- Rol del usuario target
- Timestamp de inicio (exacto)
- Timestamp de fin (cuando termina)
- Duración en minutos
- IP address
- User agent (navegador/dispositivo)
- Razón del acceso

## 🎯 Archivos Creados/Modificados

### Nuevos Archivos

1. **Schema**:
   - `prisma/schema.prisma` - Modelo ImpersonationLog

2. **API**:
   - `src/app/api/superadmin/impersonate/route.ts` - API completa

3. **Componentes**:
   - `src/components/admin/ImpersonationBanner.tsx` - Banner
   - `src/components/admin/LoginAsDialog.tsx` - Diálogo

4. **Hooks**:
   - `src/hooks/useImpersonation.ts` - Hook personalizado

### Archivos Modificados

1. **Layout**:
   - `src/app/layout.tsx` - Añadido ImpersonationBanner

2. **Panel Super Admin**:
   - `src/app/superadmin/page.tsx` - Botones Login As

## ⚙️ Configuración

### Migración de Base de Datos

Para aplicar los cambios al esquema:

```bash
# Opción 1: Migración con nombre
npx prisma migrate dev --name add_impersonation_log

# Opción 2: Push directo (desarrollo)
npx prisma db push

# Regenerar cliente
npx prisma generate
```

### Variables de Entorno

No requiere variables adicionales, usa la misma `DATABASE_URL` existente.

## 🔮 Mejoras Futuras

### Funcionalidades Pendientes
- [ ] Panel de auditoría en super admin para ver todos los logs
- [ ] Exportar logs a CSV
- [ ] Notificaciones al usuario cuando es suplantado
- [ ] Restricciones en acciones sensibles (cambio de contraseña)
- [ ] Timeout automático (15-30 minutos)
- [ ] Requerir 2FA para impersonation
- [ ] Logs en tiempo real (WebSocket)

### Mejoras de Seguridad
- [ ] Requerir justificación obligatoria
- [ ] Aprobación de otro super admin
- [ ] Límite de tiempo máximo
- [ ] Alerta a administradores cuando super admin accede
- [ ] Bloquear acciones críticas (eliminar cuenta, cambiar email)

### Analytics
- [ ] Dashboard de impersonation (frecuencia, duración)
- [ ] Reportes mensuales
- [ ] Alertas de uso sospechoso

## 🎉 Resumen

El sistema de impersonation está **100% funcional** y listo para usar. Incluye:

✅ Base de datos con log de auditoría  
✅ API completa (POST, DELETE, GET)  
✅ Banner visual siempre visible  
✅ Diálogo de confirmación  
✅ Botones "Login As" integrados  
✅ Sistema de sesión dual  
✅ Hook personalizado  
✅ Seguridad y auditoría  
✅ Auto-redirección según rol  
✅ Documentación completa  

**El super administrador ahora puede "convertirse" en cualquier usuario del sistema para resolver problemas de forma efectiva y segura, con total trazabilidad de todas las acciones.**
