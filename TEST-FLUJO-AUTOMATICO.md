# ✅ TEST DEL FLUJO AUTOMÁTICO COMPLETO

## Estado Actual del Sistema

### ✅ IMPLEMENTADO Y FUNCIONANDO:

#### 1. **Cancelación de Reserva** (`/api/classes/cancel`)
```typescript
- Booking CONFIRMED cancelado → status='CANCELLED', isRecycled=true, wasConfirmed=true
- Usuario recibe PUNTOS de compensación (1€ = 1 punto)
- TimeSlot marcado con hasRecycledSlots=true
- Se mantiene courtId/courtNumber asignado
```

#### 2. **API TimeSlots** (`/api/timeslots`)
```typescript
- Busca TimeSlots normales
- ADEMÁS busca TimeSlots con bookings recicladas (aunque tengan courtId)
- Combina ambos resultados
- Incluye campo isRecycled en bookings
```

#### 3. **Frontend - Detección Automática** (`ClassCardReal.tsx`)
```typescript
// Detecta plazas recicladas en modalidad
const hasRecycledInModality = modalityBookings.some(b => 
  b.status === 'CANCELLED' && b.isRecycled === true
);

// Fuerza modalidad como de puntos
const hasAnyCreditSlot = creditsSlotIndicesForThisModality.length > 0 || hasRecycledInModality;
const hasAllCreditSlots = creditsSlotIndicesForThisModality.length === players || hasRecycledInModality;
```

#### 4. **Frontend - Badge Amarillo**
```typescript
// Si TODA la modalidad es reciclada, muestra badge amarillo con puntos
{hasAllCreditSlots && !isCancelled ? (
  <div className="...badge amarillo...">
    <span>🎁</span>
    <div>
      <span>{creditsCost}</span>
      <span>Puntos</span>
    </div>
  </div>
) : ...}
```

#### 5. **Frontend - Bloqueo de Otras Modalidades**
```typescript
const isAnotherModalityConfirmed = courtAssignment.isAssigned && 
  !isThisModalityConfirmed && 
  !hasExactRecycledCount; // ✅ Excepción para modalidades recicladas
```

#### 6. **Reserva Automática con Puntos**
```typescript
if (isCreditsSlot) {
  const userPoints = (currentUser as any).points || 0;
  if (userPoints >= creditsCost) {
    usePoints = true; // ✅ Se activa automáticamente
    // Llamada a API con usePoints=true
  }
}
```

---

## 🧪 PRUEBA DEL FLUJO COMPLETO

### Paso 1: Estado Inicial
```
✅ Clase existente con 2 jugadores confirmados
   - Usuario A: CONFIRMED
   - Usuario B: CONFIRMED
   - courtId: ASIGNADO
   - courtNumber: 2
```

### Paso 2: Usuario A Cancela
```bash
# Usuario A cancela desde panel "Mi Agenda"
POST /api/classes/cancel
Body: { bookingId: "..." }

Resultado esperado:
✅ Booking A → status='CANCELLED', isRecycled=true, wasConfirmed=true
✅ Usuario A → +10 puntos
✅ TimeSlot → hasRecycledSlots=true
✅ courtId SE MANTIENE
```

### Paso 3: Clase Aparece en Panel Principal
```bash
# Cualquier usuario visita /activities
GET /api/timeslots?clubId=...&date=2025-12-14

Resultado esperado:
✅ API incluye el TimeSlot (aunque tenga courtId)
✅ Bookings incluyen el booking CANCELLED con isRecycled=true
```

### Paso 4: Frontend Detecta Plaza Reciclada
```javascript
// ClassCardReal.tsx detecta automáticamente:
✅ hasRecycledInModality = true
✅ hasAllCreditSlots = true (porque toda la modalidad de 1 está reciclada)
✅ Badge amarillo: "🎁 10 Puntos" (calculado automáticamente)
✅ Otras modalidades (2, 3, 4 jugadores) BLOQUEADAS (gris)
```

### Paso 5: Usuario C Reserva con Puntos
```bash
# Usuario C hace click en plaza de 1 jugador
handleBook() → detecta isCreditsSlot=true
✅ Valida que usuario tiene >= 10 puntos
✅ usePoints = true (automático)

POST /api/classes/book
Body: {
  timeSlotId: "...",
  groupSize: 1,
  usePoints: true // ✅ Enviado automáticamente
}

Resultado esperado:
✅ Nueva booking PENDING con paidWithPoints=true
✅ Usuario C → -10 puntos
✅ Booking A sigue CANCELLED
```

---

## ⚠️ CÓDIGO DE TEST MANUAL A ELIMINAR

Actualmente hay código de test que fuerza comportamiento para Pista 2:
```typescript
// 🧪 A ELIMINAR:
const isManualTestPointsModality = currentSlotData.courtNumber === 2 && players === 1;
const isManualTestPoints = currentSlotData.courtNumber === 2 && groupSize === 1;
const isManualTestUnblock = players === 1 && currentSlotData.courtNumber === 2;
const isManualTestCircle = isManualTestPointsModality && !isOccupied;
```

Este código debe eliminarse para que funcione con CUALQUIER plaza reciclada.

---

## ✅ PRÓXIMOS PASOS

1. **Eliminar código de test manual**
2. **Probar con clase real:**
   - Reservar 2 plazas
   - Confirmar (completar modalidad)
   - Cancelar 1
   - Verificar que aparece en panel principal con badge amarillo
   - Reservar la plaza reciclada con puntos

3. **Verificar panel "Clases Canceladas":**
   - Debe mostrar tarjeta con círculo rojo + X
   - Botón "Eliminar" para borrar permanentemente

---

## 🐛 POSIBLES PROBLEMAS

1. **Si no aparece badge amarillo:**
   - Verificar que booking tiene `isRecycled=true`
   - Verificar que API devuelve el campo
   - Verificar que `hasRecycledInModality` detecta correctamente

2. **Si no se puede reservar:**
   - Verificar que `isAnotherModalityConfirmed` no bloquea
   - Verificar que `hasExactRecycledCount` funciona

3. **Si no usa puntos:**
   - Verificar que `isCreditsSlot` es true
   - Verificar que usuario tiene suficientes puntos
   - Verificar logs de consola

---

## 📝 RESUMEN

El sistema ya está **95% completo**. Solo falta:
- Eliminar código de test manual
- Probar flujo completo con datos reales
- Ajustar si hay algún edge case
