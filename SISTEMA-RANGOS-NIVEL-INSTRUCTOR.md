# Sistema de Clasificación Dinámica por Rangos de Nivel

## 📋 Descripción General

El sistema permite que cada instructor configure sus propios rangos de nivel personalizados. Las clases se generan como **"ABIERTAS"** (accesibles a todos los niveles), y cuando el primer usuario se inscribe, el sistema:
1. Asigna el rango de nivel que coincida con el usuario
2. **Crea automáticamente una nueva tarjeta ABIERTA** para que usuarios de otros niveles puedan competir
3. Cuando una clase se completa, gana la pista y se cancelan las otras inscripciones del mismo instructor/hora

## 🎯 Flujo Completo del Sistema

### 1. Generación Automática de Clases

**Cron Job**: `/api/cron/generate-cards` (ejecuta diariamente a las 00:00 UTC)

```javascript
// Para cada instructor y horario
await createTimeSlot({
  level: 'ABIERTO',
  genderCategory: 'ABIERTO',
  levelRange: null  // Sin rango asignado aún
});
```

**Resultado**: Se crea **UNA SOLA clase ABIERTA** por instructor por horario. No se pre-generan múltiples versiones.

### 2. Primera Inscripción - Asignación Dinámica de Nivel

**Endpoint**: `/api/classes/book`

Cuando un usuario se inscribe en una clase ABIERTA:

1. **Se determina el rango del usuario** según los rangos configurados por el instructor:
```javascript
// Parsear rangos del instructor
const ranges = JSON.parse(instructor.levelRanges); // [{minLevel:0, maxLevel:1}, ...]

// Encontrar rango que coincida
const userLevel = 3.5; // Nivel del usuario
const matchingRange = ranges.find(r => 
  userLevel >= r.minLevel && userLevel <= r.maxLevel
); // Resultado: {minLevel: 3, maxLevel: 4.5}
```

2. **Se asigna el rango a la clase**:
```javascript
await prisma.$executeRaw`
  UPDATE TimeSlot 
  SET level = '3-4.5',
      levelRange = '3-4.5',
      genderCategory = 'masculino'
  WHERE id = ${timeSlotId}
`;
```

3. **Se crea automáticamente una nueva tarjeta ABIERTA**:
```javascript
await prisma.timeSlot.create({
  data: {
    // ... mismos datos (instructor, horario, precios)
    level: 'ABIERTO',
    genderCategory: 'ABIERTO',
    levelRange: null
  }
});
```

**Resultado**: 
- Clase original ahora es "3.0-4.5" (solo usuarios nivel 3-4.5 pueden unirse)
- Nueva clase "ABIERTA" disponible para usuarios de otros niveles

### 3. Filtrado Inteligente de Clases Visibles

**Endpoint**: `/api/timeslots`

El sistema aplica las siguientes reglas:

```javascript
// REGLA 1: Usuario ve clases donde YA está inscrito (siempre)
if (userHasBooking) return true;

// REGLA 2: Obtener inscripciones activas de la clase
const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');

// REGLA 3: Si NO hay inscripciones → solo mostrar si es ABIERTA
if (activeBookings.length === 0) {
  return slot.level === 'ABIERTO';
}

// REGLA 4: Si SÍ hay inscripciones → verificar rango del usuario
if (slot.levelRange && slot.levelRange !== 'ABIERTO') {
  const [min, max] = slot.levelRange.split('-').map(parseFloat);
  return userLevel >= min && userLevel <= max;
}
```

**Ejemplo práctico**:
- Usuario nivel 1.0 → Ve solo clases ABIERTAS
- Después de inscribirse → Ve su clase "0-1" + nuevas clases ABIERTAS
- Usuario nivel 5.5 → Ve clases ABIERTAS + clases "5-7" con inscripciones

### 4. Sistema de Carreras (Race System)

Cuando se completa una clase (4 jugadores o grupo completo):

1. **Se asigna pista** a la clase ganadora
2. **Se cancelan otras inscripciones** del mismo instructor/hora/día
3. **Se devuelven créditos** o se otorgan puntos de compensación

**Código en** `src/app/api/classes/book/route.ts` (líneas 293-356, 881-944)

## 📊 Modelo de Datos

### Instructor Model
```prisma
model Instructor {
  id          String   @id
  levelRanges String?  // JSON: [{"minLevel":0,"maxLevel":1},...]
  // ...otros campos
}
```

### TimeSlot Model
```prisma
model TimeSlot {
  id         String   @id
  level      String   // "5-7" o "ABIERTO"
  levelRange String?  // "5-7" (formato preferido)
  // ...otros campos
}
```

## 🧪 Scripts de Prueba y Utilidades

### 1. Configurar Rangos para Todos los Instructores
```bash
node setup-instructor-level-ranges.js
```
Configura los rangos estándar para todos los instructores activos:
- 0.0-1.0 (Principiantes)
- 1.5-2.5 (Iniciación)
- 3.0-4.5 (Intermedio)
- 5.0-7.0 (Avanzado)

### 2. Verificar Sistema Completo
```bash
node test-level-ranges-system.js
```
Prueba:
- Rangos configurados por instructor
- TimeSlots generados con levelRange correcto
- Filtrado por nivel de usuario

### 3. Generar Clases Manualmente
```powershell
Invoke-RestMethod -Uri "http://localhost:9002/api/cron/generate-cards?daysRange=1" -Method Get
```

## 🎯 Ventajas del Sistema

1. **Personalización por Instructor**: Cada instructor define sus propios rangos según su metodología
2. **Filtrado Automático**: Los usuarios solo ven clases apropiadas a su nivel
3. **Escalabilidad**: Soporte para cualquier número de rangos (no limitado a 4)
4. **Backward Compatibility**: Clases sin rangos configurados se muestran como "ABIERTO"
5. **Flexibilidad**: Los instructores pueden modificar rangos en cualquier momento

## 🔄 Flujo de Actualización

Cuando un instructor modifica sus rangos:
1. Los cambios se guardan en la base de datos inmediatamente
2. Las **clases futuras** se generarán con los nuevos rangos
3. Las **clases existentes** mantienen el levelRange asignado originalmente
4. No afecta a clases ya reservadas o confirmadas

## 📝 Notas Importantes

- **Compatibilidad con `level` existente**: El sistema mantiene ambos campos `level` y `levelRange` por compatibilidad
- **Clases ABIERTAS**: Instructores sin rangos configurados generan clases accesibles a todos
- **Primera reserva**: Cuando se hace la primera reserva en una clase, el sistema también asigna categoría de género
- **Validación de rango**: El API valida que el usuario esté dentro del rango permitido antes de aceptar la reserva

## 🚀 Próximas Mejoras Posibles

1. **Filtros UI por Rango**: Botones de filtro que muestren los rangos disponibles dinámicamente
2. **Estadísticas por Rango**: Panel de admin mostrando ocupación por rango de nivel
3. **Recomendaciones IA**: Sugerir rangos óptimos basados en histórico de usuarios
4. **Rangos por Día**: Permitir rangos diferentes según el día de la semana
