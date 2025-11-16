# Sistema de Reservas de Usuario - Implementación Completa

## 📋 Resumen

Se ha implementado un **sistema de gestión de reservas personalizado** para cada usuario en su panel de Agenda, que funciona como un **espejo** de la información del administrador pero filtrada solo para sus propias reservas.

## 🎯 Objetivo

Permitir que cada usuario pueda:
1. **Ver sus reservas** (inscritas, confirmadas, pasadas y canceladas)
2. **Verificar el estado** de sus inscripciones
3. **Comprobar si una clase se confirmó** (pista asignada)
4. **Cancelar reservas** desde su propio panel
5. **Acceder a la misma información** que el administrador ve en el panel de base de datos

## 🔧 Componentes Implementados

### 1. API Endpoint: `/api/users/[userId]/bookings` (GET)

**Ubicación:** `src/app/api/users/[userId]/bookings/route.ts`

**Función:**
- Obtiene todas las reservas de un usuario específico
- Incluye información completa de:
  - Usuario (nombre, email, foto)
  - TimeSlot (fecha, hora, nivel, categoría, precio)
  - Instructor (nombre, foto)
  - Pista (número si está asignada)

**Respuesta:**
```json
[
  {
    "id": "booking-xxx",
    "userId": "alex-user-id",
    "groupSize": 1,
    "status": "CONFIRMED",
    "createdAt": "2025-11-04T...",
    "updatedAt": "2025-11-04T...",
    "user": {
      "name": "Alex García",
      "email": "alex@example.com",
      "profilePictureUrl": "..."
    },
    "timeSlot": {
      "id": "ts_xxx",
      "start": "2025-11-04T09:00:00.000Z",
      "end": "2025-11-04T10:00:00.000Z",
      "level": "ABIERTO",
      "category": "masculino",
      "totalPrice": 30,
      "maxPlayers": 4,
      "totalPlayers": 0,
      "instructor": {
        "name": "Carlos Martínez",
        "profilePictureUrl": null
      },
      "court": null
    }
  }
]
```

### 2. Componente React: `UserBookings`

**Ubicación:** `src/components/user/UserBookings.tsx`

**Características:**
- ✅ **Filtrado por estado** con tabs:
  - ⏳ **Pendientes**: Reservas inscritas esperando completar grupo
  - ✅ **Confirmadas**: Clases con pista asignada
  - 📜 **Pasadas**: Clases finalizadas o canceladas
  - 📋 **Todas**: Vista completa

- ✅ **Contadores en tiempo real**: Badges con número de reservas por categoría

- ✅ **Tarjetas de reserva**: Usa el mismo componente `AdminBookingCard` que el panel de administrador

- ✅ **Estados vacíos informativos**: Mensajes según el filtro activo

- ✅ **Leyenda informativa**: Explicación de cada estado de reserva

- ✅ **Auto-refresh**: Se sincroniza cuando se cancela una reserva

### 3. Integración en Dashboard

**Ubicación:** `src/app/(app)/dashboard/page.tsx`

**Cambios:**
- Importado componente `UserBookings`
- Agregado en la sección principal del dashboard
- Integrado con el sistema de callbacks para actualización

```tsx
<UserBookings 
    currentUser={user} 
    onBookingActionSuccess={handleDataChange} 
/>
```

## 🎨 Interfaz de Usuario

### Tabs de Filtrado
```
┌─────────────────────────────────────────────────────────────┐
│ ⏳ Pendientes [5] │ ✅ Confirmadas [7] │ 📜 Pasadas [3] │ 📋 Todas [13] │
└─────────────────────────────────────────────────────────────┘
```

### Tarjeta de Reserva
```
┌───────────────────────────────────────────────┐
│ [👨‍🏫 Instructor]     [✅ CONFIRMADO]         │
│ Carlos Martínez                               │
│ ⭐⭐⭐⭐⭐ (4.5)                                │
│                                               │
│ Nivel: 1.0-2.5 │ Cat: Mixta │ Pista: Pista 3 │
│                                               │
│ Lun 04                                        │
│ Nov      09:00                                │
│          🕐 60 min                            │
│          Padel Estrella                       │
│                                               │
│ [👤] [👤] [➕] [➕] → € 30.00                  │
│ [👤] [➕]           → € 55.00                  │
│                                               │
│ Pista asignada: Pista 3 [■]                  │
│                                               │
│ [❌ Cancelar]                                 │
└───────────────────────────────────────────────┘
```

## 🔄 Sincronización de Datos

### Admin Panel vs User Panel

| Característica | Admin Panel | User Panel |
|---------------|-------------|------------|
| **Acceso** | Solo administrador | Usuario individual |
| **Datos** | Todas las reservas | Solo sus reservas |
| **Filtros** | Por usuario + estado | Por estado |
| **Componente** | AdminBookingCard | AdminBookingCard (mismo) |
| **Funcionalidad** | Cancelar cualquier reserva | Cancelar sus reservas |
| **Actualización** | Manual (refresh) | Auto-refresh on action |

### Flujo de Sincronización

```
Usuario cancela reserva
         ↓
AdminBookingCard.handleCancelBooking()
         ↓
API: DELETE /api/admin/bookings/{bookingId}
         ↓
Database: UPDATE Booking SET status='CANCELLED'
         ↓
Database: UPDATE User SET points += X
         ↓
window.location.reload()
         ↓
UserBookings.loadBookings()
         ↓
API: GET /api/users/{userId}/bookings
         ↓
Component re-render con datos actualizados
```

## 📊 Lógica de Filtrado

### Estados de Reserva

1. **Pendientes** (`activeFilter='pending'`):
   - `status === 'PENDING'`
   - `timeSlot.start >= now` (futuras)

2. **Confirmadas** (`activeFilter='confirmed'`):
   - `status === 'CONFIRMED'`
   - `timeSlot.start >= now` (futuras)

3. **Pasadas** (`activeFilter='past'`):
   - `timeSlot.start < now` (pasadas) OR
   - `status === 'CANCELLED'` (canceladas)

4. **Todas** (`activeFilter='all'`):
   - Sin filtro, todas las reservas

## ✅ Validaciones

### En el Backend
- ✅ Usuario existe
- ✅ Reserva pertenece al usuario
- ✅ Datos completos (user, timeSlot, instructor)
- ✅ Conversión correcta de timestamps
- ✅ Manejo de casos null (court puede no estar asignada)

### En el Frontend
- ✅ Carga inicial con loading spinner
- ✅ Manejo de errores de red
- ✅ Estados vacíos con mensajes informativos
- ✅ Refresh automático después de cancelaciones
- ✅ Contadores actualizados dinámicamente

## 🎯 Casos de Uso

### Usuario ve sus reservas pendientes
1. Accede a "Mi Agenda"
2. Por defecto se muestra tab "Pendientes"
3. Ve tarjetas con reservas inscritas
4. Puede ver cuántos jugadores faltan
5. Espera confirmación de pista

### Usuario verifica clase confirmada
1. Accede a tab "Confirmadas"
2. Ve badge verde "CONFIRMADO"
3. Puede ver número de pista asignada
4. Conoce hora exacta y ubicación
5. Puede cancelar si es necesario

### Usuario revisa historial
1. Accede a tab "Pasadas"
2. Ve clases completadas
3. Ve cancelaciones previas (con reembolso de puntos)
4. Puede revisar su actividad histórica

### Usuario cancela una reserva
1. Hace clic en botón "Cancelar" en tarjeta
2. Confirma acción en diálogo
3. Sistema cancela reserva en BD
4. Usuario recibe puntos (1€ = 1 punto)
5. Página recarga automáticamente
6. Reserva aparece en tab "Pasadas"

## 🔐 Seguridad

### Aislamiento de Datos
- ✅ Endpoint filtra por `userId`
- ✅ Usuario solo ve SUS reservas
- ✅ No puede acceder a reservas de otros usuarios
- ✅ Admin tiene acceso completo en su panel separado

### Cancelación
- ✅ Usa endpoint de admin: `/api/admin/bookings/{bookingId}`
- ✅ Requiere confirmación del usuario
- ✅ Valida propiedad de la reserva
- ✅ Actualiza puntos correctamente

## 📈 Métricas de Ejemplo

**Usuario: Alex García (alex-user-id)**
- Total reservas: **13**
- Confirmadas: **10**
- Pendientes: **0**
- Canceladas: **3**

## 🚀 Ventajas del Sistema

1. **Experiencia de Usuario Mejorada**
   - Usuario no necesita acceder al panel de administrador
   - Información clara y organizada
   - Acciones directas (cancelar)

2. **Consistencia de Datos**
   - Mismos componentes = misma lógica
   - Mismo endpoint de cancelación
   - Sincronización automática

3. **Separación de Responsabilidades**
   - Admin: gestión global
   - Usuario: gestión personal
   - Datos aislados por seguridad

4. **Escalabilidad**
   - Fácil añadir más filtros
   - Fácil añadir más acciones
   - Reutilización de componentes

## 🔮 Próximos Pasos (Opcionales)

- [ ] Notificaciones push cuando clase se confirma
- [ ] Exportar reservas a calendario (iCal, Google Calendar)
- [ ] Compartir reserva con amigos
- [ ] Calificar clase después de completada
- [ ] Pagar reserva desde el panel
- [ ] Reprogramar reserva
- [ ] Ver compañeros de clase confirmada
- [ ] Chat con instructor de la clase

## 📝 Notas Técnicas

### Por qué reutilizar AdminBookingCard
- ✅ Evita duplicación de código
- ✅ Mantiene consistencia visual
- ✅ Misma lógica de visualización
- ✅ Mismo sistema de cancelación
- ✅ Fácil mantenimiento

### Por qué usar Prisma ORM en lugar de raw SQL
- ✅ Type-safety automático
- ✅ Relaciones incluidas fácilmente
- ✅ Menos propenso a errores SQL
- ✅ Compatible con TypeScript
- ✅ No necesita comentarios SQL (causaban errores)

## ✅ Estado Actual

**COMPLETAMENTE FUNCIONAL** ✨

- ✅ Endpoint API creado y probado
- ✅ Componente UserBookings implementado
- ✅ Integrado en dashboard
- ✅ Filtrado por estados funcionando
- ✅ Contadores dinámicos actualizados
- ✅ Cancelación funcionando
- ✅ Sincronización correcta
- ✅ Estados vacíos con mensajes
- ✅ Leyenda informativa incluida

**El usuario ahora puede gestionar todas sus reservas desde su propia agenda!** 🎉
