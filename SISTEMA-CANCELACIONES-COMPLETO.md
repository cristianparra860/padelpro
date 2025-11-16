# ✅ SISTEMA DE CANCELACIONES - ESTADO ACTUAL

## Flujo Implementado (src/app/api/classes/cancel/route.ts)

### 🔵 CANCELACIÓN DE RESERVA PENDIENTE (sin pista asignada)
Cuando el usuario cancela una reserva ANTES de que la clase se confirme:

1. ✅ **Marca el booking como CANCELLED**
2. ✅ **Desbloquea el saldo** (vuelve a créditos disponibles)
3. ✅ **NO otorga puntos** (solo desbloquea)
4. ✅ **Registra transacción** de desbloqueo
5. ✅ **Resultado**: El usuario recupera sus créditos inmediatamente

### 🟢 CANCELACIÓN DE RESERVA CONFIRMADA (con pista asignada)
Cuando el usuario cancela una reserva DESPUÉS de que la clase se confirme:

1. ✅ **Marca el booking como CANCELLED**
2. ✅ **Otorga puntos** (1€ = 1 punto de compensación)
3. ✅ **Registra transacción** de puntos otorgados
4. ✅ **Verifica bookings restantes**:
   
   **Si NO quedan reservas activas:**
   - ✅ Libera la clase (courtNumber = null, courtId = null)
   - ✅ Elimina CourtSchedule asociado
   - ✅ Elimina InstructorSchedule asociado
   - ✅ La clase vuelve a PROPUESTA (naranja)
   
   **Si SÍ quedan reservas activas:**
   - ✅ Mantiene la clase confirmada
   - ✅ Marca plaza como reciclada (hasRecycledSlots = true)
   - ✅ La plaza quedará reservable con puntos

5. ✅ **Resultado**: Usuario recibe puntos y la clase se libera o marca reciclada

---

## Coordinación con otros componentes

### 📅 Calendario del Club (src/app/api/admin/calendar/route.ts)
- ✅ **Excluye bookings canceladas** (status IN ('PENDING', 'CONFIRMED'))
- ✅ **Muestra clases liberadas** como propuestas (courtNumber = null)
- ✅ **Cuenta correctamente** jugadores activos por clase

### 🎯 Tarjetas de Clases (src/components/class/ClassCardReal.tsx)
- ✅ Filtra bookings canceladas al mostrar plazas ocupadas
- ✅ Muestra plazas disponibles correctamente
- ✅ Permite reservar plazas recicladas con puntos

### 📋 Mi Agenda (src/app/(app)/dashboard/page.tsx)
- ✅ Filtra bookings canceladas en PersonalSchedule
- ✅ Solo muestra reservas activas (PENDING o CONFIRMED)
- ✅ Actualiza en tiempo real tras cancelaciones

---

## Verificación del sistema

### ✅ Lo que funciona CORRECTAMENTE:
1. Cancelación pendiente → Desbloquea saldo
2. Cancelación confirmada → Otorga puntos
3. Liberación de clases sin reservas → Vuelve a propuesta
4. Marcado de plazas recicladas → Para reservar con puntos
5. Eliminación de schedules → Libera pista e instructor
6. Registro de transacciones → Auditoría completa
7. Calendario excluye canceladas → Vista limpia
8. Agenda excluye canceladas → Solo activas

### ⚠️ Comportamiento actual:
- **Cancelación pendiente**: Devuelve CRÉDITOS (€)
- **Cancelación confirmada**: Devuelve PUNTOS (1€ = 1 punto)

### 🎯 Política de cancelación:
```
PENDIENTE → Devuelve 100% en CRÉDITOS (€)
CONFIRMADA → Devuelve 100% en PUNTOS (para futuras reservas)
```

---

## API de Cancelación

**Endpoint**: `POST /api/classes/cancel`

**Body**:
```json
{
  "userId": "user-id",
  "timeSlotId": "timeslot-id",
  "bookingId": "booking-id" (opcional)
}
```

**Respuesta Exitosa (Pendiente)**:
```json
{
  "success": true,
  "message": "Reserva pendiente cancelada. Saldo desbloqueado",
  "cancelledBookingId": "booking-id",
  "amountUnblocked": 10.00,
  "pointsGranted": 0,
  "slotMarkedAsRecycled": false
}
```

**Respuesta Exitosa (Confirmada - Sin reservas restantes)**:
```json
{
  "success": true,
  "message": "Reserva cancelada. Has recibido 10 puntos. La clase ha sido liberada.",
  "cancelledBookingId": "booking-id",
  "amountUnblocked": 0,
  "pointsGranted": 10,
  "slotMarkedAsRecycled": false,
  "classFreed": true
}
```

**Respuesta Exitosa (Confirmada - Con reservas restantes)**:
```json
{
  "success": true,
  "message": "Reserva cancelada. Has recibido 10 puntos. Plaza disponible para reservar con puntos.",
  "cancelledBookingId": "booking-id",
  "amountUnblocked": 0,
  "pointsGranted": 10,
  "slotMarkedAsRecycled": true,
  "classFreed": false
}
```

---

## ✅ CONCLUSIÓN

El sistema de cancelación está **completamente implementado y coordinado** entre:
- API de cancelación
- Calendario del club
- Tarjetas de clases
- Mi agenda

**Todos los componentes filtran correctamente las bookings canceladas y el sistema:**
- ✅ Devuelve el dinero en puntos (clases confirmadas)
- ✅ Devuelve el dinero en créditos (clases pendientes)
- ✅ Elimina las reservas del calendario
- ✅ Libera las clases cuando no quedan reservas
- ✅ Marca plazas recicladas cuando quedan reservas
- ✅ Elimina los schedules de pistas e instructores
- ✅ Registra todas las transacciones

**El sistema está listo para producción.** 🎉
