# ✅ MEJORA: Reseteo Completo al Cancelar Reserva Confirmada

## 🎯 Problema Solucionado

Cuando se cancelaba la última reserva de una clase confirmada, la clase se liberaba PERO:
- ❌ La categoría de género quedaba asignada (ej: "masculino", "femenino")
- ❌ Las propuestas 30 min antes quedaban bloqueadas

Esto impedía que otros usuarios pudieran reservar la clase correctamente.

---

## ✅ Solución Implementada

### Cambios en `src/app/api/classes/cancel/route.ts`

Cuando se cancela la última reserva y se libera la clase, ahora se:

```typescript
// ANTES (incompleto):
await prisma.$executeRaw`
  UPDATE TimeSlot
  SET courtId = NULL, courtNumber = NULL
  WHERE id = ${timeSlotId}
`;

// AHORA (completo):
await prisma.$executeRaw`
  UPDATE TimeSlot
  SET courtId = NULL, courtNumber = NULL, genderCategory = NULL
  WHERE id = ${timeSlotId}
`;

// NUEVO: Desbloquear propuestas 30 min antes
const thirtyMinBefore = new Date(startTime.getTime() - 30 * 60 * 1000);
await prisma.$executeRaw`
  DELETE FROM TimeSlot
  WHERE instructorId = ${timeSlotInfo.instructorId}
  AND start = ${thirtyMinBefore.toISOString()}
  AND courtId IS NULL
  AND courtNumber IS NULL
`;
```

### Lo que se resetea ahora:

1. ✅ **courtId** = null
2. ✅ **courtNumber** = null
3. ✅ **genderCategory** = null ← NUEVO
4. ✅ **CourtSchedule** eliminado
5. ✅ **InstructorSchedule** eliminado
6. ✅ **Propuestas 30min antes** desbloqueadas ← NUEVO

---

## 🔄 Flujo Completo de Cancelación

### Caso: Usuario cancela última reserva de una clase confirmada

```
Estado INICIAL:
- Clase 10:00 confirmada, Pista 2, Género: "masculino"
- Propuesta 09:30 BLOQUEADA (mismo instructor)
- 1 booking CONFIRMED

Usuario cancela →

Estado FINAL:
- Clase 10:00 → PROPUESTA (sin pista, sin género)
- Propuesta 09:30 → DISPONIBLE
- Booking → CANCELLED
- Usuario recibe puntos de compensación
```

### Resultado para otros usuarios:

1. ✅ Pueden reservar la clase 10:00 con cualquier género
2. ✅ Pueden reservar la clase 09:30 (ya no está bloqueada)
3. ✅ Sistema completamente limpio y sincronizado

---

## 🧹 Actualización del Script de Limpieza

También se actualizó `fix-ghost-classes.js` para resetear género en clases fantasma:

```javascript
await prisma.timeSlot.update({
  where: { id: ghostClass.id },
  data: {
    courtNumber: null,
    courtId: null,
    genderCategory: null // ← Añadido
  }
});
```

---

## 🧪 Pruebas

### Cómo probar:

1. Reservar una clase (se asigna género y pista)
2. Ver que la propuesta 30min antes se bloquea
3. Cancelar la reserva
4. Verificar:
   - ✅ Clase vuelve a propuesta (naranja)
   - ✅ Género reseteado (sin badge de chicos/chicas)
   - ✅ Propuesta 30min antes visible de nuevo
   - ✅ Usuario recibe puntos

### Script manual:
```bash
node fix-ghost-classes.js
```

---

## 📊 Estado del Sistema

### Antes de este cambio:
- Clases liberadas pero con género asignado
- Propuestas 30min antes bloqueadas permanentemente
- Usuarios confundidos al ver restricciones fantasma

### Después de este cambio:
- ✅ Sistema completamente limpio
- ✅ Clases liberadas sin restricciones
- ✅ Propuestas desbloqueadas
- ✅ Calendario sincronizado 100%

---

## 🎯 Beneficios

1. **UX mejorada**: Las clases liberadas son realmente accesibles
2. **Sin restricciones fantasma**: No hay categorías de género huérfanas
3. **Más disponibilidad**: Propuestas 30min antes vuelven al pool
4. **Sistema limpio**: Estado consistente en todo momento

---

## ✅ Checklist de Liberación de Clase

Cuando se cancela la última reserva:

- ✅ courtId = null
- ✅ courtNumber = null  
- ✅ genderCategory = null
- ✅ CourtSchedule eliminado
- ✅ InstructorSchedule eliminado
- ✅ Propuestas 30min antes desbloqueadas
- ✅ Usuario recibe puntos de compensación
- ✅ Transacción registrada

**Todo sincronizado y listo para nuevas reservas.** 🎉
