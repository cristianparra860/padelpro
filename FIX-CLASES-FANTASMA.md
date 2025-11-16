# 🔧 SOLUCIÓN: Desincronización de Clases Fantasma

## ❌ Problema Detectado

Había **13 clases "fantasma"** en el sistema:
- ✅ Tenían pista asignada (`courtNumber` != null)
- ✅ Aparecían como "confirmadas" (verde) en el calendario
- ❌ NO tenían bookings activas
- ❌ Bloqueaban las tarjetas de clase
- ❌ No aparecían en la agenda del usuario

### Causa Raíz
Las clases se confirmaron (se asignó pista) pero las bookings fueron:
1. Canceladas posteriormente, O
2. Eliminadas manualmente de la base de datos, O
3. Nunca creadas correctamente

El sistema NO liberó automáticamente las clases al quedar sin bookings.

---

## ✅ Solución Aplicada

### 1. Script de Limpieza (`fix-ghost-classes.js`)
```javascript
// Busca clases con pista asignada pero sin bookings activas
// Las libera automáticamente:
// - courtNumber = null
// - courtId = null  
// - Elimina CourtSchedule
// - Elimina InstructorSchedule
```

### 2. Resultado
- ✅ Liberadas 13 clases fantasma
- ✅ 975 propuestas disponibles (naranjas)
- ✅ 0 clases confirmadas (verde) sin bookings reales
- ✅ Sistema sincronizado

---

## 🛡️ Prevención Futura

### Opción 1: Verificación Automática en el API de Cancelación
Añadir verificación cuando se cancela la última booking:

```typescript
// En src/app/api/classes/cancel/route.ts
if (!hasRemainingBookings) {
  // Liberar la clase (ESTO YA EXISTE ✅)
  await prisma.timeSlot.update({
    where: { id: timeSlotId },
    data: { courtId: null, courtNumber: null }
  });
  
  // Limpiar schedules (ESTO YA EXISTE ✅)
  await prisma.courtSchedule.deleteMany({ where: { timeSlotId } });
  await prisma.instructorSchedule.deleteMany({ where: { timeSlotId } });
}
```

**NOTA:** Esta lógica YA ESTÁ IMPLEMENTADA en el API de cancelación actual.

### Opción 2: Tarea de Limpieza Diaria
Añadir endpoint para ejecutar limpieza automática:

```typescript
// src/app/api/cron/cleanup-ghost-classes/route.ts
export async function GET() {
  const confirmedClasses = await prisma.timeSlot.findMany({
    where: { courtNumber: { not: null } },
    include: { bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } }
  });
  
  const ghostClasses = confirmedClasses.filter(c => c.bookings.length === 0);
  
  for (const ghost of ghostClasses) {
    await prisma.timeSlot.update({
      where: { id: ghost.id },
      data: { courtId: null, courtNumber: null }
    });
    await prisma.courtSchedule.deleteMany({ where: { timeSlotId: ghost.id } });
    await prisma.instructorSchedule.deleteMany({ where: { timeSlotId: ghost.id } });
  }
  
  return NextResponse.json({ cleaned: ghostClasses.length });
}
```

Añadir a `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-ghost-classes",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## 🔍 Cómo Detectar el Problema

### Síntomas:
1. Usuario ve "0 reservas" en su agenda
2. Calendario muestra clases confirmadas (verdes)
3. Tarjetas de clase aparecen bloqueadas
4. No hay usuarios en las clases confirmadas

### Diagnóstico Rápido:
```bash
node debug-sync-issue.js
```

### Solución Manual:
```bash
node fix-ghost-classes.js
```

---

## ✅ Estado Actual

- ✅ Sistema limpio y sincronizado
- ✅ 975 propuestas disponibles
- ✅ 0 clases fantasma
- ✅ API de cancelación implementada correctamente
- ⚠️ Recomendado: Añadir limpieza automática diaria

---

## 📝 Recomendaciones

1. **Corto plazo**: Ejecutar `fix-ghost-classes.js` manualmente si se detecta desincronización
2. **Medio plazo**: Implementar endpoint de limpieza automática con cron job
3. **Largo plazo**: Añadir constraint en base de datos que prevenga clases confirmadas sin bookings

### Constraint SQL (PostgreSQL):
```sql
-- Cuando migres a PostgreSQL, añadir:
ALTER TABLE "TimeSlot" 
ADD CONSTRAINT check_confirmed_has_bookings
CHECK (
  courtNumber IS NULL OR 
  EXISTS (
    SELECT 1 FROM "Booking" 
    WHERE "Booking"."timeSlotId" = "TimeSlot"."id" 
    AND "Booking"."status" IN ('PENDING', 'CONFIRMED')
  )
);
```

**Nota**: SQLite no soporta subqueries en CHECK constraints.
