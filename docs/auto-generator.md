# 🤖 Sistema Automático de Generación de Tarjetas

Este sistema genera automáticamente propuestas de clases (tarjetas) verificando la disponibilidad de pistas e instructores.

## 📋 Características

- ✅ Genera tarjetas cada **30 minutos** (09:00, 09:30, 10:00, 10:30, etc.)
- ✅ Verifica disponibilidad de **pistas** e **instructores**
- ✅ Solo crea tarjetas si HAY disponibilidad en ambos
- ✅ Evita duplicados automáticamente
- ✅ Marca calendarios como ocupados al confirmar clase
- ✅ Duración de cada clase: **60 minutos**

## 🏗️ Estructura

### Modelos de Base de Datos

```prisma
// Ocupación de pistas en tiempo real
model CourtSchedule {
  id          String
  courtId     String
  date        DateTime
  startTime   DateTime
  endTime     DateTime
  isOccupied  Boolean  // true = ocupada
  timeSlotId  String?  // Referencia a la clase
  reason      String?  // "Clase confirmada", "Mantenimiento", etc.
}

// Ocupación de instructores en tiempo real
model InstructorSchedule {
  id           String
  instructorId String
  date         DateTime
  startTime    DateTime
  endTime      DateTime
  isOccupied   Boolean  // true = ocupado
  timeSlotId   String?  // Referencia a la clase
  reason       String?  // "Clase asignada", "Reunión", etc.
}
```

### Flujo del Sistema

```
1. CRON ejecuta cada día a las 00:00
   ↓
2. Para cada franja de 30 min (09:00-18:00):
   ↓
3. Verificar disponibilidad:
   - ¿Hay pistas libres? (Total pistas - Pistas ocupadas)
   - ¿Hay instructores libres? (Total instructores - Instructores ocupados)
   ↓
4. Si AMBOS > 0:
   → Crear TimeSlot (tarjeta/propuesta)
   Si NO:
   → Saltar (NO crear tarjeta)
   ↓
5. Cuando usuario completa reserva:
   → Asignar pista
   → Marcar CourtSchedule como ocupada
   → Marcar InstructorSchedule como ocupado
   → Cancelar reservas perdedoras
```

## 🚀 Uso

### 1. Ejecución Manual

```bash
# Generar tarjetas para los próximos 7 días
node auto-generate-cards.js

# O llamar al API endpoint
curl http://localhost:9002/api/cron/generate-cards?days=7
```

### 2. Cron Job Automático (Vercel)

El archivo `vercel.json` ya está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-cards?days=7",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Esto ejecuta el generador **cada día a las 00:00 UTC**.

### 3. Cron Job Alternativo (GitHub Actions)

Crear `.github/workflows/generate-cards.yml`:

```yaml
name: Generate Class Cards
on:
  schedule:
    - cron: '0 0 * * *'  # Cada día a las 00:00 UTC
  workflow_dispatch:  # Permite ejecución manual

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X GET "https://tu-dominio.vercel.app/api/cron/generate-cards?days=7"
```

### 4. Servicio Externo (cron-job.org)

1. Ir a https://cron-job.org
2. Crear nueva tarea:
   - **URL**: `https://tu-dominio.vercel.app/api/cron/generate-cards?days=7`
   - **Método**: GET
   - **Horario**: Diario a las 00:00
3. Guardar

## 📊 Verificación

### Ver tarjetas generadas

```bash
# Script para verificar
node check-generated-cards.js
```

O consultar directamente:

```sql
SELECT 
  date(start) as fecha,
  COUNT(*) as tarjetas_creadas
FROM TimeSlot
WHERE courtNumber IS NULL
GROUP BY date(start)
ORDER BY fecha;
```

### Ver calendarios ocupados

```sql
-- Pistas ocupadas
SELECT 
  cs.date,
  c.number as pista,
  cs.startTime,
  cs.endTime,
  cs.reason
FROM CourtSchedule cs
JOIN Court c ON c.id = cs.courtId
WHERE cs.isOccupied = 1
ORDER BY cs.date, cs.startTime;

-- Instructores ocupados
SELECT 
  ist.date,
  i.id as instructor,
  ist.startTime,
  ist.endTime,
  ist.reason
FROM InstructorSchedule ist
JOIN Instructor i ON i.id = ist.instructorId
WHERE ist.isOccupied = 1
ORDER BY ist.date, ist.startTime;
```

## 🔧 Configuración

### Modificar horarios

Editar en `auto-generate-cards.js` o `route.ts`:

```javascript
// Cambiar rango de horarios
for (let hour = 9; hour < 18; hour++) {  // De 09:00 a 18:00
  // Cambiar a 8-21 para horario 08:00-21:00
}

// Cambiar intervalo
timeSlots.push(`${hour}:00`);  // Cada hora
timeSlots.push(`${hour}:30`);  // Cada 30 minutos
// Agregar :15 y :45 para cada 15 minutos
```

### Modificar días a generar

```javascript
// En el script
const days = 7;  // Generar para próximos 7 días

// En el API
GET /api/cron/generate-cards?days=14  // 14 días
```

## ⚠️ Consideraciones

1. **Primera ejecución**: Los calendarios estarán vacíos, todas las tarjetas se crearán
2. **Mantenimiento**: Agregar entradas manuales a `CourtSchedule` para mantenimiento
3. **Vacaciones de instructores**: Usar `InstructorRestriction` para fechas específicas
4. **Horarios especiales**: Modificar `ClubSchedule` para días festivos

## 🐛 Debugging

```bash
# Ver logs del generador
node auto-generate-cards.js

# Ver últimas tarjetas creadas
SELECT * FROM TimeSlot 
WHERE courtNumber IS NULL 
ORDER BY createdAt DESC 
LIMIT 10;

# Ver si hay solapamientos
SELECT 
  t1.start,
  t1.instructorId,
  COUNT(*) as clases_simultaneas
FROM TimeSlot t1
JOIN TimeSlot t2 ON t1.start = t2.start AND t1.instructorId = t2.instructorId
WHERE t1.courtNumber IS NOT NULL
GROUP BY t1.start, t1.instructorId
HAVING COUNT(*) > 1;
```

## 📈 Próximas Mejoras

- [ ] Dashboard admin para ver calendarios
- [ ] Notificaciones cuando se generan tarjetas
- [ ] Predicción de demanda para ajustar horarios
- [ ] Múltiples instructores por tarjeta
- [ ] Priorización por nivel de demanda histórica
