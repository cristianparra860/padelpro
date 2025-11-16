# 🐛 BUG CRÍTICO CORREGIDO: Bloqueo Incorrecto de 30 minutos en lugar de 60

## ❌ PROBLEMA DETECTADO

El usuario reportó que al reservar una clase de 60 minutos, **el sistema solo bloqueaba 30 minutos** en lugar de los 60 minutos completos.

## 🔍 DIAGNÓSTICO

### Bug #1: Eliminación Incorrecta de Propuestas

**Archivo**: `src/app/api/classes/book/route.ts` (línea 373)

**Código incorrecto**:
```typescript
DELETE FROM TimeSlot 
WHERE instructorId = ${instructorId}
AND courtId IS NULL
AND id != ${timeSlotId}
AND start > ${start}      // ❌ Usa > en lugar de >=
AND start < ${endTime}
```

**Problema**:
- Query usaba `start > ${start}` (mayor que, sin igualdad)
- **NO eliminaba** la propuesta que empezaba exactamente a la misma hora
- Ejemplo: Clase 10:00-11:00 → Solo eliminaba 10:30, **NO eliminaba 10:00**
- **Resultado**: Solo bloqueaba 30 minutos en lugar de 60

**Código corregido**:
```typescript
DELETE FROM TimeSlot 
WHERE instructorId = ${instructorId}
AND courtId IS NULL
AND id != ${timeSlotId}
AND start >= ${start}     // ✅ Ahora usa >= (mayor o igual)
AND start < ${end}
```

**Efecto**:
- Ahora elimina **TODAS** las propuestas desde el inicio hasta el fin
- Clase 10:00-11:00 → Elimina 10:00 Y 10:30 (NO 11:00)
- **Bloquea los 60 minutos completos** ✅

---

### Bug #2: Generador Crea Propuestas Sobre Clases Confirmadas

**Archivo**: `src/app/api/cron/generate-cards/route.ts` (líneas 118-127)

**Problema**:
- El generador automático solo verificaba si existía una propuesta en ese horario
- **NO verificaba** si el instructor ya tenía una clase confirmada
- Resultado: Creaba propuestas que se solapaban con clases confirmadas

**Código añadido**:
```typescript
// Verificar si el instructor tiene una clase confirmada en este horario
const confirmedClass = await prisma.$queryRaw`
  SELECT id FROM TimeSlot
  WHERE instructorId = ${instructorId}
  AND courtId IS NOT NULL
  AND start <= ${startDateTime.toISOString()}
  AND end > ${startDateTime.toISOString()}
`;

if (confirmedClass && confirmedClass.length > 0) {
  skippedCount++;
  continue; // El instructor está ocupado en este horario
}
```

**Efecto**:
- Ahora el generador verifica si el instructor está ocupado
- NO crea propuestas sobre clases confirmadas
- Respeta los bloqueos de 60 minutos

---

## 📊 IMPACTO DEL BUG

### Antes de la Corrección
```
Clase confirmada: 10:00-11:00 (60 min)
├─ 09:30 🔶 Propuesta disponible
├─ 10:00 🔶 Propuesta disponible ❌ (DEBERÍA ESTAR BLOQUEADA)
├─ 10:30 ❌ Eliminada (correcto)
├─ 11:00 🔶 Propuesta disponible ✅
└─ 11:30 🔶 Propuesta disponible ✅

Resultado: Solo 30 minutos bloqueados (10:30)
```

### Después de la Corrección
```
Clase confirmada: 10:00-11:00 (60 min)
├─ 09:30 🔶 Propuesta disponible ✅
├─ 10:00 ❌ Eliminada (CORRECTO)
├─ 10:30 ❌ Eliminada (correcto)
├─ 11:00 🔶 Propuesta disponible ✅
└─ 11:30 🔶 Propuesta disponible ✅

Resultado: 60 minutos bloqueados completamente ✅
```

---

## ✅ VERIFICACIÓN

Se ejecutó `fix-blocked-proposals.js` para verificar el estado actual:
- **28 clases confirmadas** verificadas
- **0 propuestas incorrectas** encontradas
- Las clases antiguas no tienen este problema (se eliminaron manualmente o por otro proceso)

---

## 🔄 PRÓXIMOS PASOS

1. **Probar nueva reserva**: Hacer una reserva nueva y verificar que elimina ambas propuestas (inicio y mitad)
2. **Regenerar propuestas**: Ejecutar el generador y verificar que NO crea propuestas sobre clases confirmadas
3. **Monitorear**: Verificar que las próximas reservas bloquean correctamente 60 minutos

---

## 🧪 COMANDO PARA VERIFICAR

```bash
# Hacer una nueva reserva de prueba
curl -X POST http://localhost:9002/api/classes/book \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","timeSlotId":"TIMESLOT_ID","groupSize":4}'

# Verificar propuestas eliminadas
node check-real-blocking.js
```

---

## 📝 RESUMEN

**Bug**: `start > ${start}` permitía que quedara una propuesta sin eliminar  
**Fix**: Cambiado a `start >= ${start}` para eliminar desde el inicio  
**Extra**: Generador ahora verifica clases confirmadas antes de crear propuestas  
**Estado**: ✅ Corregido y listo para probar  

**Agradecimientos**: Usuario identificó el problema correctamente - el sistema solo bloqueaba 30 min en lugar de 60.
