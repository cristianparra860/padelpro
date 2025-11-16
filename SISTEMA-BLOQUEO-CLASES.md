# 🔒 SISTEMA DE BLOQUEO DE CLASES - CÓMO FUNCIONA

## ✅ SÍ, el sistema bloquea EXACTAMENTE los 60 minutos de la clase

Cuando haces una reserva y se completa el grupo (gana la "carrera"), el sistema ejecuta estos bloqueos:

---

## 🎯 PROCESO DE BLOQUEO (líneas 423-492 en book/route.ts)

### 1️⃣ **Bloqueo de PISTA (CourtSchedule)**

```typescript
INSERT INTO CourtSchedule (
  id, courtId, date, startTime, endTime, 
  isOccupied, timeSlotId, reason
)
VALUES (
  ...,
  start,  // ← Inicio EXACTO de la clase (ej: 10:00)
  end,    // ← Fin EXACTO de la clase (ej: 11:00)
  1,      // ← Marca como ocupada
  ...
)
```

**Resultado:** La pista queda bloqueada de 10:00 a 11:00 (60 minutos exactos).

---

### 2️⃣ **Bloqueo de INSTRUCTOR (InstructorSchedule)**

```typescript
INSERT INTO InstructorSchedule (
  id, instructorId, date, startTime, endTime,
  isOccupied, timeSlotId, reason
)
VALUES (
  ...,
  start,  // ← Inicio EXACTO de la clase
  end,    // ← Fin EXACTO de la clase
  1,      // ← Marca como ocupado
  ...
)
```

**Resultado:** El instructor queda bloqueado de 10:00 a 11:00 (60 minutos exactos).

---

### 3️⃣ **Eliminación de PROPUESTAS SOLAPADAS**

```typescript
DELETE FROM TimeSlot 
WHERE instructorId = ${instructorId}
  AND courtId IS NULL        // ← Solo propuestas
  AND start > ${start}       // ← Empiezan DESPUÉS del inicio
  AND start < ${end}         // ← Empiezan ANTES del final
```

**Ejemplo:** Clase confirmada de 10:00 a 11:00
- ✅ Mantiene: 09:00, 09:30 (antes de la clase)
- ❌ Elimina: 10:00, 10:30 (dentro de la clase)
- ✅ Mantiene: 11:00, 11:30 (después de la clase)

**Lógica:** Solo elimina las propuestas que **empiezan dentro** de la clase confirmada.

---

## 📊 EJEMPLO PRÁCTICO

### Situación Inicial (Propuestas cada 30 min)
```
09:00 🔶 Propuesta disponible
09:30 🔶 Propuesta disponible
10:00 🔶 Propuesta disponible ← Usuario reserva aquí
10:30 🔶 Propuesta disponible
11:00 🔶 Propuesta disponible
11:30 🔶 Propuesta disponible
12:00 🔶 Propuesta disponible
```

### Después de Confirmar Clase 10:00-11:00
```
09:00 🔶 Propuesta disponible (SIN CAMBIOS)
09:30 🔶 Propuesta disponible (SIN CAMBIOS)
10:00 🟢 Clase confirmada - Pista 1 (BLOQUEADA)
10:30 ❌ ELIMINADA (estaba dentro de la clase)
11:00 🔶 Propuesta disponible (SIN CAMBIOS)
11:30 🔶 Propuesta disponible (SIN CAMBIOS)
12:00 🔶 Propuesta disponible (SIN CAMBIOS)
```

---

## 🔍 VERIFICACIÓN EN LA BASE DE DATOS

### CourtSchedule
```sql
SELECT * FROM CourtSchedule WHERE isOccupied = 1;

-- Resultado:
-- startTime: 2025-10-29T10:00:00.000Z
-- endTime:   2025-10-29T11:00:00.000Z
-- reason:    'Clase confirmada'
```

### InstructorSchedule
```sql
SELECT * FROM InstructorSchedule WHERE isOccupied = 1;

-- Resultado:
-- startTime: 2025-10-29T10:00:00.000Z
-- endTime:   2025-10-29T11:00:00.000Z
-- reason:    'Clase asignada'
```

---

## ⚠️ IMPORTANTE: Lógica de Solapamiento

El sistema verifica solapamientos al asignar pistas (líneas 280-298):

```typescript
// Buscar pistas ocupadas por clases
SELECT courtNumber FROM TimeSlot 
WHERE start < ${end} AND end > ${start}
AND courtNumber IS NOT NULL

// Buscar pistas bloqueadas en CourtSchedule
SELECT c.number FROM CourtSchedule cs
JOIN Court c ON cs.courtId = c.id
WHERE cs.isOccupied = 1
AND (startTime < ${end} AND endTime > ${start})
```

**Esta lógica detecta solapamiento SI:**
- Una clase empieza antes de que termine la actual, Y
- Una clase termina después de que empiece la actual

**Ejemplo de solapamiento:**
- Clase A: 10:00-11:00
- Clase B: 10:30-11:30 ← ❌ SOLAPA (empieza en 10:30, dentro de A)

**Ejemplo SIN solapamiento:**
- Clase A: 10:00-11:00
- Clase B: 11:00-12:00 ← ✅ NO SOLAPA (empieza justo cuando termina A)

---

## ✅ RESPUESTA DIRECTA A TU PREGUNTA

**Sí, al hacer una reserva el sistema SOLO bloquea las casillas correspondientes a los 60 minutos de la clase.**

**No bloquea:**
- ✅ Propuestas que empiezan ANTES de la clase
- ✅ Propuestas que empiezan EXACTAMENTE cuando termina la clase
- ✅ Propuestas que empiezan DESPUÉS de la clase

**Sí bloquea:**
- ❌ La pista asignada durante esos 60 minutos (CourtSchedule)
- ❌ El instructor durante esos 60 minutos (InstructorSchedule)
- ❌ Propuestas del mismo instructor que empiezan DENTRO de esos 60 minutos

---

## 🧪 PARA VERIFICAR EN TU SISTEMA

```bash
# Ver bloques de pistas
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { const blocks = await prisma.courtSchedule.findMany({ where: { isOccupied: true } }); console.log('Bloques de pistas:', blocks.length); blocks.forEach(b => console.log(' -', new Date(b.startTime).toLocaleString(), 'a', new Date(b.endTime).toLocaleString())); await prisma.$disconnect(); })();"

# Ver bloques de instructores
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { const blocks = await prisma.instructorSchedule.findMany({ where: { isOccupied: true } }); console.log('Bloques de instructores:', blocks.length); blocks.forEach(b => console.log(' -', new Date(b.startTime).toLocaleString(), 'a', new Date(b.endTime).toLocaleString())); await prisma.$disconnect(); })();"
```

---

**Duración del bloqueo:** Exactamente **60 minutos** (la duración de la clase).  
**Precisión:** Minuto a minuto (startTime → endTime).  
**Efecto colateral:** Solo elimina propuestas que **empiezan dentro** de la clase confirmada.
