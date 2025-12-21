# Corrección del Sistema de Bloqueo de Créditos - Race Booking

## Problema Identificado

El sistema de race booking estaba bloqueando incorrectamente los créditos porque `amountBlocked` se estaba guardando en **euros** cuando el schema define que debe estar en **céntimos**.

### Síntomas

- Usuario reportó: "solo bloquea 1€ cuando debería bloquear el valor más alto de todas las inscripciones del día"
- Los valores de `amountBlocked` en la BD eran < 100 (euros) cuando deberían ser >= 100 (céntimos)
- Ejemplo: amountBlocked = 30 (€30 en euros) debería ser 3000 (€30 en céntimos)

## Causa Raíz

En `src/app/api/classes/book/route.ts` línea 695:

```typescript
// ❌ INCORRECTO (antes)
const creditsToBlock = usePoints ? 0 : pricePerSlot; // pricePerSlot está en EUROS

// ✅ CORRECTO (después)
const creditsToBlock = usePoints ? 0 : Math.round(pricePerSlot * 100); // Convertir a CÉNTIMOS
```

### Archivos Afectados

1. **src/app/api/classes/book/route.ts**
   - Línea 695: Conversión de euros a céntimos en `creditsToBlock`
   - Línea 633-655: Validación de créditos suficientes (convertir `pricePerSlot` a céntimos)
   - Línea 758: Transacción usa `creditsToBlock` (ya en céntimos) en lugar de `pricePerSlot` (euros)

2. **src/lib/blockedCredits.ts**
   - Actualizado comentarios: "euros" → "CÉNTIMOS"
   - Función `calculateBlockedCredits`: trabaja correctamente con céntimos
   - Función `hasAvailableCredits`: espera `amount` en céntimos

3. **Base de Datos**
   - Script `fix-blocked-amounts.js`: corrigió 83 bookings existentes
   - Multiplicó valores por 100 (euros → céntimos)
   - Recalculó `blockedCredits` de 8 usuarios afectados

## Solución Implementada

### 1. Corrección del Código

```typescript
// Conversión explícita a céntimos al crear booking
const creditsToBlock = usePoints ? 0 : Math.round(pricePerSlot * 100);

// Validación con conversión a céntimos
const priceInCents = Math.round(pricePerSlot * 100);
const hasCredits = await hasAvailableCredits(userId, priceInCents);

// Transacción registra en céntimos
await createTransaction({
  userId,
  type: 'credit',
  action: 'block',
  amount: creditsToBlock, // Ya en céntimos
  balance: userBalance.credits - userBalance.blockedCredits,
  concept: `Reserva pendiente - Clase ${date}`,
  // ...
});
```

### 2. Migración de Datos Existentes

Ejecutado `fix-blocked-amounts.js`:
- ✅ 83 bookings corregidas (euros → céntimos)
- ✅ 8 usuarios con `blockedCredits` recalculado

### 3. Función de Bloqueo Correcta

La función `calculateBlockedCredits()` ya funcionaba correctamente:

```typescript
export async function calculateBlockedCredits(userId: string): Promise<number> {
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PENDING',
      timeSlot: { courtId: null } // Sin pista asignada
    },
    select: { amountBlocked: true }
  });
  
  // Retorna el MÁXIMO de todos los amountBlocked
  return Math.max(...pendingBookings.map(b => b.amountBlocked || 0));
}
```

## Verificación

Ejecutado `test-race-booking-logic.js`:

```
✅ Alex Garcia: 4 bookings pendientes → bloquea €75.00 (máximo de €5, €75, €50, €75)
✅ Marc Parra: 7 bookings pendientes → bloquea €30.00 (máximo de €15, €12, €20, €30, €10, €13, €20)
✅ María García: 9 bookings pendientes → bloquea €5.00 (máximo de €2, €2, €2, €2, €2, €5, €3, €2, €5)

📝 CONCLUSIÓN:
✅ Todos los usuarios tienen el blockedCredits correcto
✅ El sistema está bloqueando correctamente el valor más alto de todas las inscripciones
```

## Regla del Race Booking

El sistema bloquea **solo el precio de la clase MÁS CARA** entre todas las inscripciones pendientes (PENDING) sin pista asignada (courtId = NULL).

### Ejemplo

Usuario tiene 3 bookings pendientes:
- Clase A: groupSize=4 → €10/4 = €2.50 → 250 céntimos bloqueados
- Clase B: groupSize=2 → €60/2 = €30.00 → 3000 céntimos bloqueados
- Clase C: groupSize=3 → €45/3 = €15.00 → 1500 céntimos bloqueados

**Resultado**: Sistema bloquea **3000 céntimos (€30)** - el máximo de los tres.

### Cuando se asigna pista

Al confirmar una clase (asignar `courtId`):
1. Se cobra el `amountBlocked` de esa booking específica
2. Se recalcula `blockedCredits` excluyendo bookings con pista asignada
3. Usuario puede ganar o perder créditos bloqueados según la nueva clase más cara pendiente

## Commit

```
Fix: Convertir amountBlocked de euros a céntimos en race booking

- Modificado book/route.ts línea 695: creditsToBlock = Math.round(pricePerSlot * 100)
- Corregido hasAvailableCredits para trabajar con céntimos
- Actualizado createTransaction para usar creditsToBlock en céntimos
- Actualizado comentarios en blockedCredits.ts (euros → céntimos)
- Ejecutado script fix-blocked-amounts.js para corregir 83 bookings existentes
- Sistema ahora bloquea correctamente el valor máximo de todas las inscripciones pendientes
```

## Testing Recomendado

1. Crear nueva booking → verificar `amountBlocked` >= 100 (céntimos)
2. Usuario con múltiples bookings → verificar `blockedCredits` = max(amountBlocked)
3. Confirmar clase → verificar recalculo de `blockedCredits`
4. Panel de movimientos → verificar transacciones muestran correctamente en euros

---

**Fecha**: 21 de diciembre de 2025
**Autor**: GitHub Copilot + Usuario
**Estado**: ✅ Implementado y verificado
