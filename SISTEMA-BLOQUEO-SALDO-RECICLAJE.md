# Sistema de Bloqueo Inteligente de Saldo y Reciclaje de Plazas

## 📋 Visión General

Sistema avanzado de gestión de reservas que optimiza el uso del saldo mediante:
1. **Bloqueo Inteligente**: Solo se bloquea el valor de la inscripción más alta
2. **Reciclaje de Plazas**: Plazas canceladas de clases confirmadas solo reservables con puntos
3. **Sistema Dual de Pago**: Pago con dinero o con puntos

## 🗄️ Cambios en Base de Datos

### Modelo `User`
```prisma
model User {
  credits        Int @default(0)  // Saldo total en céntimos
  blockedCredits Int @default(0)  // Saldo bloqueado por inscripciones
  points         Int @default(0)  // Puntos de fidelidad
}
```

**Campos añadidos:**
- `blockedCredits`: Saldo temporalmente bloqueado por inscripciones pendientes

**Fórmula:**
```
Saldo Disponible = credits - blockedCredits
```

### Modelo `Booking`
```prisma
model Booking {
  paidWithPoints Boolean @default(false) // Pagado con puntos
  pointsUsed     Int     @default(0)     // Puntos utilizados
  amountBlocked  Int     @default(0)     // Cantidad bloqueada (céntimos)
  isRecycled     Boolean @default(false) // Plaza reciclada
}
```

**Campos añadidos:**
- `paidWithPoints`: Indica si la reserva se pagó con puntos
- `pointsUsed`: Cantidad de puntos utilizados (0 si pagó con dinero)
- `amountBlocked`: Monto bloqueado en el saldo del usuario
- `isRecycled`: Marca si la reserva ocupa una plaza reciclada

### Modelo `TimeSlot`
```prisma
model TimeSlot {
  hasRecycledSlots Boolean @default(false) // Tiene plazas recicladas
}
```

**Campo añadido:**
- `hasRecycledSlots`: Indica si la clase tiene plazas que solo pueden reservarse con puntos

## 🔄 Flujos del Sistema

### 1. Usuario Hace Múltiples Inscripciones

**Escenario**: Usuario se inscribe en 3 clases
- Clase A: €10 (1 jugador de 4)
- Clase B: €5 (1 jugador de 2)
- Clase C: €3 (1 jugador de 1)

**Proceso:**

```typescript
// 1. Calcular el precio de cada inscripción
const priceA = 40 / 4 = 10€ (1000 céntimos)
const priceB = 10 / 2 = 5€  (500 céntimos)
const priceC = 3 / 1 = 3€   (300 céntimos)

// 2. Solo bloquear el monto más alto
const maxBlocked = Math.max(1000, 500, 300) = 1000 céntimos (10€)

// 3. Verificar saldo disponible
if (user.credits - user.blockedCredits >= 1000) {
  // Actualizar blockedCredits
  user.blockedCredits = 1000
  
  // Crear las 3 bookings
  bookings.forEach(booking => {
    booking.amountBlocked = booking === bookingA ? 1000 : 0
  })
}
```

**Estado del Usuario:**
```
Saldo Total: €20.00
Saldo Bloqueado: €10.00
Saldo Disponible: €10.00
```

### 2. Una Inscripción se Confirma (Clase Completa)

**Trigger**: Clase B completa su grupo de 2 jugadores

**Proceso:**

```typescript
// 1. Cobrar al usuario
user.credits -= 500 // Restar €5
user.blockedCredits -= 500 // Liberar bloqueo proporcional

// 2. Actualizar booking
booking.status = 'CONFIRMED'
booking.amountBlocked = 0 // Ya no está bloqueado, fue cobrado

// 3. Recalcular bloqueo restante
// Ahora solo quedan Clase A (€10) y Clase C (€3)
const remainingMax = Math.max(1000, 300) = 1000
user.blockedCredits = 1000
```

**Estado del Usuario:**
```
Saldo Total: €15.00 (cobrados €5)
Saldo Bloqueado: €10.00 (máximo de las pendientes)
Saldo Disponible: €5.00
```

### 3. Cancelación ANTES de Confirmación

**Escenario**: Usuario cancela Clase A (pendiente)

**Proceso:**

```typescript
// 1. Liberar saldo bloqueado
user.blockedCredits -= 1000

// 2. Cancelar booking
booking.status = 'CANCELLED'
booking.amountBlocked = 0

// 3. Recalcular bloqueo con inscripciones restantes
// Solo queda Clase C (€3)
user.blockedCredits = 300

// 4. NO se devuelven puntos (no había sido cobrada)
```

**Estado del Usuario:**
```
Saldo Total: €15.00 (sin cambios)
Saldo Bloqueado: €0.30 (solo Clase C)
Saldo Disponible: €14.70
Puntos: 0 (sin cambios)
```

### 4. Cancelación DESPUÉS de Confirmación

**Escenario**: Usuario cancela Clase B (ya confirmada y cobrada)

**Proceso:**

```typescript
// 1. NO devolver dinero
// user.credits NO cambia

// 2. Calcular puntos a devolver (1€ = 1 punto)
const pricePerPerson = 10 / 2 = 5€
const pointsToReturn = Math.floor(5) = 5 puntos
user.points += 5

// 3. Cancelar booking
booking.status = 'CANCELLED'

// 4. Marcar la plaza como reciclada
timeSlot.hasRecycledSlots = true

// 5. La plaza liberada solo puede reservarse con puntos
```

**Estado del Usuario:**
```
Saldo Total: €15.00 (NO se devuelve dinero)
Saldo Bloqueado: €0.30
Saldo Disponible: €14.70
Puntos: 5 pts (ganados por cancelación)
```

**Estado de la Clase:**
```
TimeSlot B:
- hasRecycledSlots: true
- Plazas totales: 2
- Plazas ocupadas: 1 (la otra cancelada)
- Plaza reciclada: 1 (solo reservable con puntos)
```

### 5. Reservar Plaza Reciclada con Puntos

**Escenario**: Otro usuario quiere reservar la plaza liberada de Clase B

**Requisitos:**
- Usuario debe tener suficientes puntos
- La clase debe tener `hasRecycledSlots = true`
- Precio en puntos: 1€ = 1 punto

**Proceso:**

```typescript
// 1. Verificar si es plaza reciclada
if (timeSlot.hasRecycledSlots) {
  // Solo aceptar pago con puntos
  const priceInPoints = Math.floor(pricePerPerson) // 5 puntos
  
  // 2. Verificar puntos disponibles
  if (user.points >= priceInPoints) {
    // 3. Descontar puntos
    user.points -= priceInPoints
    
    // 4. Crear booking
    const booking = {
      userId: user.id,
      timeSlotId: timeSlot.id,
      paidWithPoints: true,
      pointsUsed: priceInPoints,
      amountBlocked: 0,
      isRecycled: true
    }
    
    // 5. Si la clase se completa nuevamente, ya no tiene plazas recicladas
    if (allSlotsFilledAgain) {
      timeSlot.hasRecycledSlots = false
    }
  }
}
```

**Estado del Usuario (que reservó):**
```
Saldo Total: €X (sin cambios)
Puntos: 0 pts (gastó 5 puntos)
```

## 🎯 Reglas del Sistema

### Bloqueo de Saldo

1. **Solo se bloquea el máximo**: De todas las inscripciones pendientes, solo se bloquea la de mayor valor
2. **Verificación pre-reserva**: Antes de permitir una inscripción, se verifica: `saldoDisponible >= precioInscripcion`
3. **Recálculo automático**: Cada vez que una inscripción se confirma o cancela, se recalcula el bloqueo

### Plazas Recicladas

1. **Trigger**: Cancelación de clase confirmada
2. **Marcador**: `timeSlot.hasRecycledSlots = true`
3. **Restricción**: Solo reservables con puntos
4. **Reset**: Si la clase se llena nuevamente, `hasRecycledSlots = false`

### Sistema de Puntos

1. **Ganancia**: Solo al cancelar clases confirmadas (1€ = 1 punto)
2. **Uso**: Reservar plazas recicladas exclusivamente
3. **No reembolsables**: Los puntos no se convierten de vuelta a dinero
4. **Visibles**: Usuario ve sus puntos disponibles en todo momento

### Cancelaciones

| Estado | Devuelve Dinero | Devuelve Puntos | Plaza se Recicla |
|--------|----------------|-----------------|------------------|
| Pendiente | ✅ Sí (desbloquea) | ❌ No | ❌ No |
| Confirmada | ❌ No | ✅ Sí (1€=1pt) | ✅ Sí |

## 🔐 Validaciones

### Al Crear Inscripción

```typescript
// 1. Calcular precio de la inscripción
const pricePerPerson = timeSlot.totalPrice / groupSize

// 2. Obtener inscripciones pendientes del usuario
const pendingBookings = await getUserPendingBookings(userId)

// 3. Calcular nuevo bloqueo máximo
const currentMax = Math.max(...pendingBookings.map(b => b.amountBlocked))
const newMax = Math.max(currentMax, pricePerPerson * 100) // en céntimos

// 4. Verificar saldo disponible
const availableBalance = user.credits - user.blockedCredits
if (availableBalance < newMax - user.blockedCredits) {
  throw new Error('Saldo insuficiente')
}

// 5. Crear booking y actualizar bloqueo
await createBookingAndUpdateBlocking(userId, newMax)
```

### Al Confirmar Clase

```typescript
// 1. Cobrar a cada usuario del grupo
for (const booking of confirmedBookings) {
  user.credits -= booking.amountBlocked
  booking.amountBlocked = 0
  booking.status = 'CONFIRMED'
}

// 2. Asignar pista
timeSlot.courtId = assignedCourtId

// 3. Recalcular bloqueos de cada usuario
await recalculateBlockedCreditsForAllUsers(confirmedBookings)
```

### Al Cancelar Clase Confirmada

```typescript
// 1. NO devolver dinero
// (user.credits no cambia)

// 2. Calcular y dar puntos
const pointsToAward = Math.floor(booking.amountCharged / 100)
user.points += pointsToAward

// 3. Marcar plaza como reciclada
timeSlot.hasRecycledSlots = true
timeSlot.totalPlayers -= booking.groupSize

// 4. Cancelar booking
booking.status = 'CANCELLED'
```

### Al Reservar con Puntos

```typescript
// 1. Verificar que la clase tiene plazas recicladas
if (!timeSlot.hasRecycledSlots) {
  throw new Error('Esta clase no tiene plazas recicladas')
}

// 2. Calcular puntos necesarios
const pointsNeeded = Math.floor(pricePerPerson)

// 3. Verificar puntos disponibles
if (user.points < pointsNeeded) {
  throw new Error('Puntos insuficientes')
}

// 4. Crear reserva con puntos
user.points -= pointsNeeded
await createBooking({
  paidWithPoints: true,
  pointsUsed: pointsNeeded,
  amountBlocked: 0,
  isRecycled: true
})
```

## 📊 UI/UX Impacto

### Dashboard del Usuario

```
┌─────────────────────────────────────────┐
│ 💰 Tu Saldo                             │
├─────────────────────────────────────────┤
│ Total:        €20.00                    │
│ Bloqueado:    €10.00  (inscripciones)  │
│ Disponible:   €10.00  ✅               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🎁 Tus Puntos                           │
├─────────────────────────────────────────┤
│ Disponibles:   15 pts                   │
│ Próximos:      5 pts  (clase del 10/11) │
└─────────────────────────────────────────┘
```

### Tarjeta de Clase

**Clase Normal:**
```
┌───────────────────────────────────────┐
│ Instructor: Carlos                     │
│ 📅 10 Nov - 09:00                     │
│                                       │
│ [👤][👤][+][+]  €7.50  💳            │
│ [👤][+]         €15.00 💳            │
│                                       │
│ 💰 Pagar con dinero                   │
└───────────────────────────────────────┘
```

**Clase con Plazas Recicladas:**
```
┌───────────────────────────────────────┐
│ Instructor: Carlos                     │
│ 📅 10 Nov - 09:00                     │
│ ♻️ Plaza reciclada disponible          │
│                                       │
│ [👤][♻️][+][+]  7 pts  🎁             │
│                                       │
│ 🎁 Reserva con puntos únicamente      │
└───────────────────────────────────────┘
```

### Mis Inscripciones

```
⏳ PENDIENTES (Bloqueado: €10.00)
┌─────────────────────────────────────┐
│ Clase A - 10 Nov 09:00              │
│ Precio: €10.00 🔒                   │
│ [Cancelar] → Libera €10.00          │
└─────────────────────────────────────┘

✅ CONFIRMADAS
┌─────────────────────────────────────┐
│ Clase B - 11 Nov 10:00              │
│ Pagado: €5.00 ✅                    │
│ [Cancelar] → Devuelve 5 puntos      │
└─────────────────────────────────────┘
```

## 🔮 Próximos Pasos de Implementación

1. ✅ **Schema actualizado**
2. ⏳ **API Endpoint**: `/api/classes/book` - Actualizar con lógica de bloqueo
3. ⏳ **API Endpoint**: `/api/classes/cancel` - Actualizar con lógica de puntos/dinero
4. ⏳ **Función Auxiliar**: `calculateBlockedCredits(userId)`
5. ⏳ **Función Auxiliar**: `recalculateUserBlocking(userId)`
6. ⏳ **UI Component**: Mostrar saldo bloqueado en dashboard
7. ⏳ **UI Component**: Badge "♻️ Plaza Reciclada" en tarjetas
8. ⏳ **UI Component**: Selector "Pagar con Dinero" vs "Pagar con Puntos"

## 💡 Beneficios del Sistema

1. **Para el Usuario**:
   - No necesita tener todo el dinero de todas las inscripciones
   - Puede inscribirse en múltiples clases con menos saldo
   - Recupera valor de cancelaciones (vía puntos)
   - Puede aprovechar plazas liberadas con puntos acumulados

2. **Para el Club**:
   - Incentiva la fidelidad (sistema de puntos)
   - Reduce cancelaciones (los usuarios piensan dos veces)
   - Maximiza ocupación de clases (reciclaje de plazas)
   - Genera economía circular interna

3. **Para el Sistema**:
   - Optimiza uso de capital
   - Reduce fricciones de reserva
   - Crea economía de puntos cerrada
   - Incentiva participación continua
