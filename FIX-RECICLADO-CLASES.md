## 🔧 FIX APLICADO: RECICLADO DE CLASES

### Problema Identificado

Cuando se confirmaba una clase, el sistema **NO eliminaba las propuestas solapadas** del mismo instructor.

**Diagnóstico:**
```
Formato 1 (.toISOString()): '2025-12-26T08:00:00.000Z' → 0 resultados ❌
Formato 2 (timestamps):     1735200000000 → 2 resultados ✅
```

### Causa Raíz

SQLite almacena las fechas como **INTEGER (timestamps en milisegundos)**, pero el código usaba `.toISOString()` para compararlas como **strings**.

**Código problemático:**
```typescript
// ❌ INCORRECTO
const confirmedStart = new Date(slotDetails[0].start);
const confirmedEnd = new Date(slotDetails[0].end);

DELETE FROM TimeSlot
WHERE start >= ${confirmedStart.toISOString()}  // String comparison
  AND start < ${confirmedEnd.toISOString()}
```

SQLite no podía comparar `INTEGER (1735200000000)` con `STRING ('2025-12-26T08:00:00.000Z')`.

### Solución Implementada

**Ubicación:** `src/app/api/classes/book/route.ts`

#### Fix 1: Extensión de 30min a 60min (línea ~1442)
```typescript
// ✅ CORRECTO - Usar timestamps directamente
const currentStart = slotDetails[0].start; // Ya es timestamp numérico
const currentEnd = slotDetails[0].end;
const durationMinutes = (Number(currentEnd) - Number(currentStart)) / (1000 * 60);

if (durationMinutes === 30) {
  const newEndTimestamp = Number(currentStart) + (60 * 60 * 1000);
  
  UPDATE TimeSlot 
  SET end = ${newEndTimestamp}  // INTEGER, no string
  WHERE id = ${timeSlotId}
}
```

#### Fix 2: Eliminación de propuestas solapadas (línea ~1477)
```typescript
// ✅ CORRECTO - Comparar timestamps directamente
const confirmedStart = slotDetails[0].start; // Ya es timestamp
const confirmedEnd = slotDetails[0].end;

DELETE FROM TimeSlot
WHERE instructorId = ${instructorId}
  AND courtId IS NULL
  AND (
    (start >= ${confirmedStart} AND start < ${confirmedEnd})  // INTEGER comparison
    OR (end > ${confirmedStart} AND end <= ${confirmedEnd})
    OR (start <= ${confirmedStart} AND end >= ${confirmedEnd})
  )
```

### Resultado Esperado

Cuando un usuario confirma una clase:

1. **Extensión:** Slot pasa de 30min → 60min
2. **Eliminación:** Se borran las 2 propuestas de 30min:
   - Propuesta 1: 09:00 - 09:30
   - Propuesta 2: 09:30 - 10:00
3. **Resultado:** Instructor queda ocupado 09:00-10:00, sin propuestas duplicadas

### Prueba

**Antes del fix:**
```
⚠️ HAY 2 propuestas solapadas que NO se eliminaron:
   1. 9:00:00 - 10:00:00 (60 min)
   2. 9:30:00 - 10:30:00 (60 min)
```

**Para verificar el fix:**
```bash
# 1. Hacer una nueva reserva
# 2. Confirmar la clase (llenar el grupo)
# 3. Ejecutar:
node verify-recycling-fix.js
```

**Resultado esperado:**
```
✅ TODO CORRECTO - El reciclado de clases funciona perfectamente:
   1. La clase se extendió a 60 minutos
   2. Las propuestas solapadas se eliminaron correctamente
   3. El instructor quedó disponible para esa hora
```

### Archivos Modificados

- `src/app/api/classes/book/route.ts` (2 secciones corregidas)

### Scripts de Diagnóstico Creados

- `diagnose-recycling.js` - Análisis detallado del problema
- `verify-recycling-fix.js` - Verificación del fix

### Notas Técnicas

- SQLite almacena timestamps como `INTEGER` (milisegundos desde epoch)
- Prisma devuelve fechas como `Date` objects, pero internamente son números
- Siempre usar comparación numérica directa en queries raw
- `.toISOString()` solo para logs/display, nunca para queries SQL

### Documentación Relacionada

Ver instrucciones en `.github/copilot-instructions.md`:
> **Database Queries: Raw SQL Over ORM**
> Due to SQLite timestamp handling and performance, always use raw SQL queries

---
**Estado:** ✅ FIX COMPLETADO - Pendiente de prueba en producción
