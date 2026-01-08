# Funcionalidad: Ocultar Reservas del Historial

## Descripción
Los usuarios pueden eliminar reservas pasadas de su historial sin eliminarlas de la base de datos. Esto mantiene la integridad de datos para auditoría mientras limpia la vista del usuario.

## Implementación Técnica

### 1. Base de Datos (Schema)
Se agregaron columnas `hiddenFromHistory` (boolean) en:
- **Booking**: Reservas de clases
- **MatchGameBooking**: Reservas de partidas

```prisma
model Booking {
  // ...otros campos
  hiddenFromHistory    Boolean       @default(false)
}

model MatchGameBooking {
  // ...otros campos
  hiddenFromHistory    Boolean       @default(false)
}
```

### 2. API Endpoints

#### Ocultar Reserva de Clase
```typescript
PATCH /api/bookings/[id]/hide
```
- Marca `hiddenFromHistory = true` en la tabla Booking
- No elimina la reserva de la DB
- Retorna el booking actualizado

#### Ocultar Reserva de Partida
```typescript
PATCH /api/matchgames/bookings/[id]/hide
```
- Marca `hiddenFromHistory = true` en MatchGameBooking
- No elimina la reserva de la DB
- Retorna el booking actualizado

### 3. Filtrado en Queries

#### GET /api/users/[userId]/bookings
Filtra bookings donde `hiddenFromHistory = false`:
```typescript
const bookings = await prisma.booking.findMany({
  where: {
    userId: userId,
    hiddenFromHistory: false // 🗑️ Excluir ocultos
  },
  // ...resto de la query
});
```

#### GET /api/users/[userId]/match-bookings
Similar filtrado para partidas:
```typescript
const matchBookings = await prisma.matchGameBooking.findMany({
  where: {
    userId: userId,
    hiddenFromHistory: false // 🗑️ Excluir ocultos
  },
  // ...resto de la query
});
```

### 4. UI Components

#### UserBookings.tsx
- Función `handleHideFromHistory(bookingId, bookingType)` 
- Llama al endpoint correspondiente según el tipo
- Recarga la lista de bookings tras ocultar
- Solo disponible en pestaña "Pasadas"

#### ClassCardReal.tsx
- Botón "Eliminar" cuando `isPastClass = true`
- AlertDialog de confirmación
- Callback `onHideFromHistory`

#### MatchGameCard.tsx
- Botón "Eliminar" cuando `isPastMatch = true`
- Callback `onHideFromHistory`

#### CourtReservationCard.tsx
- Botón "Eliminar del Historial" cuando `isPast = true`
- Para reservas de pista (sin instructor)

## Flujo de Usuario

1. Usuario navega a **"Mis Reservas"** → pestaña **"Pasadas"**
2. Ve lista de clases/partidas que ya ocurrieron
3. Click en botón **"Eliminar"** en una tarjeta
4. Aparece confirmación: "¿Eliminar del historial?"
5. Usuario confirma → La reserva desaparece del historial
6. La reserva sigue en la DB pero con `hiddenFromHistory = true`

## Ventajas del Enfoque

✅ **Soft Delete**: No se pierde información histórica  
✅ **Auditoría**: Datos completos para análisis  
✅ **UI Limpia**: Usuario solo ve lo relevante  
✅ **Reversible**: Se puede mostrar de nuevo cambiando el flag  
✅ **Performance**: Filtrado simple con índice en userId

## Casos de Uso

- **Clases canceladas antiguas**: Limpiar historial de cancelaciones
- **Clases completadas hace tiempo**: Reducir ruido visual
- **Partidas jugadas**: Mantener solo partidas recientes visibles
- **Gestión de historial**: Usuario controla qué conservar

## Testing

### Script de Verificación
```bash
node test-hide-from-history.js
```
Verifica:
- Existencia de campos en DB
- Reservas pasadas disponibles
- Estado actual de `hiddenFromHistory`

### Test de API
```bash
# 1. Iniciar servidor dev
npm run dev

# 2. Ejecutar tests
node test-hide-api.js
```
Prueba:
- Endpoint PATCH para ocultar
- Filtrado en GET de bookings
- Verificación en DB

### Test Manual (Navegador)
1. Login como usuario con reservas pasadas
2. Navegar a "Mis Reservas" > "Pasadas"
3. Click en "Eliminar" en una clase/partida
4. Confirmar eliminación
5. Verificar que desaparece de la lista
6. Recargar página → debe seguir oculta

## Archivos Modificados

### Schema y Migraciones
- `prisma/schema.prisma`: Agregar `hiddenFromHistory`
- `prisma/migrations/20260108161409_add_hidden_from_history/migration.sql`

### API Routes
- `src/app/api/bookings/[id]/hide/route.ts` (nuevo)
- `src/app/api/matchgames/bookings/[id]/hide/route.ts` (nuevo)
- `src/app/api/users/[userId]/bookings/route.ts` (filtro)
- `src/app/api/users/[userId]/match-bookings/route.ts` (filtro)

### Componentes UI
- `src/components/user/UserBookings.tsx` (lógica)
- `src/components/user/BookingCard.tsx` (prop)
- `src/components/class/ClassCardReal.tsx` (botón)
- `src/components/match/MatchGameCard.tsx` (botón)
- `src/components/user/CourtReservationCard.tsx` (botón)

### Scripts de Test
- `test-hide-from-history.js` (verificación DB)
- `test-hide-api.js` (test endpoints)

## Mejoras Futuras

1. **Deshacer**: Botón para mostrar reservas ocultas de nuevo
2. **Auto-limpieza**: Ocultar automáticamente reservas > 6 meses
3. **Filtro toggle**: Ver/ocultar elementos eliminados
4. **Estadísticas**: Contar reservas ocultas en dashboard
5. **Bulk delete**: Eliminar múltiples a la vez

## Commit
```
agregar botones de eliminar historial
```

Implementa soft delete para reservas pasadas con botón "Eliminar" en pestaña "Pasadas" del panel de usuario.
