# Sistema de Indicadores de Disponibilidad de Pistas

## 📋 Descripción General

Sistema que muestra visualmente el estado de las pistas del club en cada tarjeta de clase, permitiendo a los usuarios saber qué pistas están disponibles antes de reservar. Las tarjetas se ocultan automáticamente cuando no hay pistas disponibles.

## 🎯 Funcionalidad

### Estados de Pistas

Cada pista puede estar en uno de tres estados:

1. **🟢 Verde (Disponible)**: La pista está libre para este horario
2. **🔴 Rojo (Ocupada)**: La pista está reservada por otra clase
3. **⚫ Gris (No disponible)**: La pista no está disponible por restricciones del instructor/club

### Reglas de Visualización

- **Propuestas (sin pista asignada)**:
  - Se muestran indicadores de las 4 pistas con sus estados
  - Se oculta la tarjeta completa si `availableCourtsCount === 0`
  - El contador muestra: "Estado de pistas (X disponibles)"

- **Clases confirmadas (con pista asignada)**:
  - Se muestra solo la pista asignada
  - Formato: "Pista asignada: Pista X" con icono verde
  - Siempre se muestran aunque no haya otras pistas disponibles

## 🔧 Implementación Técnica

### Backend: `/api/timeslots/route.ts`

#### 1. Consulta de Pistas del Club

```typescript
const allCourts = await prisma.court.findMany({
  where: { 
    clubId: clubId,
    isActive: true 
  },
  orderBy: { number: 'asc' }
});
```

#### 2. Consulta de Clases Confirmadas

```typescript
const confirmedClasses = await prisma.$queryRawUnsafe(`
  SELECT 
    t.id,
    t.start,
    t.end,
    t.courtId,
    c.number as courtNumber
  FROM TimeSlot t
  LEFT JOIN Court c ON t.courtId = c.id
  WHERE t.clubId = ?
    AND ((t.start >= ? AND t.start <= ?) OR (t.start >= ? AND t.start <= ?))
    AND t.courtId IS NOT NULL
  ORDER BY t.start
`, clubId, startTimestamp, endTimestamp, dateStart, dateEnd);
```

#### 3. Cálculo de Disponibilidad por Slot

```typescript
const courtsAvailability = allCourts.map(court => {
  const isOccupied = confirmedClasses.some((cls: any) => {
    const clsStart = Number(cls.start);
    const clsEnd = Number(cls.end);
    const isSameCourt = cls.courtId === court.id;
    const hasOverlap = slotStart < clsEnd && slotEnd > clsStart;
    return isSameCourt && hasOverlap;
  });
  
  return {
    courtNumber: court.number,
    courtId: court.id,
    status: isOccupied ? 'occupied' : 'available'
  };
});
```

#### 4. Agregación al Objeto Slot

```typescript
return {
  // ... otros campos
  courtsAvailability: courtsAvailability,
  availableCourtsCount: courtsAvailability.filter(c => c.status === 'available').length
};
```

#### 5. Filtrado de Propuestas Sin Pistas

```typescript
filteredSlots = filteredSlots.filter(slot => {
  // Clases confirmadas siempre se muestran
  if (slot.courtId) {
    return true;
  }
  
  // Propuestas solo si tienen pistas disponibles
  return slot.availableCourtsCount > 0;
});
```

### Frontend: `ClassCardReal.tsx`

#### Estructura de Datos

```typescript
interface CourtAvailability {
  courtNumber: number;
  courtId: string;
  status: 'available' | 'occupied' | 'unavailable';
}

interface TimeSlot {
  // ... campos existentes
  courtsAvailability: CourtAvailability[];
  availableCourtsCount: number;
}
```

#### Renderizado de Indicadores

```tsx
<div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
  <div className="text-center">
    {courtAssignment.isAssigned ? (
      // Mostrar pista asignada
      <div className="flex items-center justify-center gap-1">
        <span className="font-semibold text-gray-900 text-sm">
          Pista {courtAssignment.courtNumber}
        </span>
        <svg width="20" height="12" viewBox="0 0 60 40" fill="none">
          <rect x="2" y="2" width="56" height="36" rx="4" 
                fill="#86BC24" stroke="#6B9B1E" strokeWidth="2"/>
          <line x1="30" y1="2" x2="30" y2="38" 
                stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
        </svg>
      </div>
    ) : (
      // Mostrar indicadores de disponibilidad
      <>
        <div className="text-xs text-gray-600 mb-1">
          Estado de pistas ({availableCourtsCount} disponibles):
        </div>
        <div className="flex items-center justify-center gap-1">
          {courtsAvailability.map((court) => (
            <div key={court.courtId} className="relative group">
              <svg width="20" height="12" viewBox="0 0 60 40" fill="none">
                <rect x="2" y="2" width="56" height="36" rx="4" 
                      fill={court.status === 'available' ? '#10B981' : 
                            court.status === 'occupied' ? '#EF4444' : '#9CA3AF'}
                      stroke={court.status === 'available' ? '#059669' : 
                              court.status === 'occupied' ? '#DC2626' : '#6B7280'}
                      strokeWidth="2"/>
              </svg>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 
                              mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded 
                              opacity-0 group-hover:opacity-100 transition-opacity">
                Pista {court.courtNumber}: {statusText}
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
</div>
```

## 📊 Optimizaciones de Performance

### 1. Query Única para Pistas
- Se consultan todas las pistas del club una sola vez
- Se reutilizan para todos los slots (O(1) lookup)

### 2. Query Única para Clases Confirmadas
- Se obtienen todas las clases confirmadas del día en una consulta
- Se verifica ocupación por slot usando `Array.some()` (O(n))

### 3. Filtrado Eficiente
- El filtrado se hace en memoria después de cargar los datos
- Se separan propuestas de confirmadas antes de aplicar reglas
- Solo se filtran propuestas (confirmadas siempre visibles)

### 4. Caché HTTP
```typescript
response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
```
- 60 segundos en servidor (CDN/Vercel Edge)
- 30 segundos stale-while-revalidate (respuesta inmediata)

## 🧪 Tests de Verificación

### Test de Base de Datos
```bash
node test-court-availability.js
```
Verifica:
- Consulta de pistas del club
- Consulta de clases confirmadas
- Cálculo de disponibilidad por horario

### Test de API
```bash
node test-api-court-availability.js
```
Verifica:
- Presencia de campos `courtsAvailability` y `availableCourtsCount`
- Correcta asignación de estados (available/occupied)
- Estadísticas de slots con/sin pistas

### Test de Filtrado
```bash
node test-filter-improved.js
```
Verifica:
- Propuestas sin pistas disponibles se ocultan
- Clases confirmadas siempre visibles
- Distribución de pistas disponibles

## 📈 Resultados Esperados

### API Response Structure
```json
{
  "id": "ts_xxx",
  "start": "2025-11-09T09:00:00.000Z",
  "end": "2025-11-09T10:00:00.000Z",
  "instructorName": "Carlos Martinez",
  "courtId": null,
  "courtsAvailability": [
    { "courtNumber": 1, "courtId": "court_1", "status": "available" },
    { "courtNumber": 2, "courtId": "court_2", "status": "occupied" },
    { "courtNumber": 3, "courtId": "court_3", "status": "available" },
    { "courtNumber": 4, "courtId": "court_4", "status": "available" }
  ],
  "availableCourtsCount": 3
}
```

### Comportamiento UI

**Propuesta con 3 pistas disponibles:**
```
Estado de pistas (3 disponibles):
🟢 🔴 🟢 🟢
```

**Propuesta sin pistas disponibles:**
```
[TARJETA OCULTA - No aparece en el listado]
```

**Clase confirmada:**
```
Pista asignada:
Pista 2 🎾
```

## 🔄 Flujo de Datos

1. Usuario selecciona fecha en calendario
2. `ClassesDisplay` llama `/api/timeslots?date=YYYY-MM-DD&clubId=xxx`
3. API consulta:
   - Pistas del club (4 pistas)
   - Clases confirmadas del día
   - Propuestas del día
4. API calcula disponibilidad para cada slot
5. API filtra propuestas sin pistas disponibles
6. Frontend renderiza:
   - Propuestas con indicadores de pistas
   - Clases confirmadas con pista asignada
7. Usuario ve estado en tiempo real de cada pista

## 🎨 Colores del Sistema

- **Verde (#10B981)**: Pista disponible
- **Rojo (#EF4444)**: Pista ocupada por otra clase
- **Gris (#9CA3AF)**: Pista no disponible (futuro: restricciones)

## 📝 Notas Importantes

1. **Las clases confirmadas siempre se muestran** aunque `availableCourtsCount === 0`
   - Razón: El usuario puede querer ver su reserva confirmada
   - El indicador muestra la pista específica asignada

2. **El filtro solo aplica a propuestas** (slots sin `courtId`)
   - Previene confusión: usuarios no pueden reservar si no hay pistas
   - Mejora UX: no se muestran opciones inválidas

3. **Tooltip interactivo** en cada indicador
   - Hover muestra: "Pista X: Disponible/Ocupada/No disponible"
   - Mejora accesibilidad para usuarios con dificultades visuales

4. **Integración con sistema de bloqueo de 30 minutos**
   - El filtro de pistas es adicional al filtro de bloqueo
   - Ambos criterios deben cumplirse para mostrar la propuesta

## 🚀 Mejoras Futuras

1. **Estado "unavailable" (gris)**
   - Actualmente no usado
   - Futuro: restricciones de instructor/mantenimiento

2. **Animaciones de transición**
   - Fade in/out cuando cambia disponibilidad
   - Destacar cambios en tiempo real

3. **Indicador de "última pista disponible"**
   - Mostrar badge "¡Última pista!" cuando `availableCourtsCount === 1`
   - Crear urgencia para reservar

4. **Predicción de disponibilidad**
   - Mostrar tendencia: "Esta hora suele llenarse rápido"
   - Basado en datos históricos

5. **Notificaciones push**
   - Alertar cuando se libere una pista en horario deseado
   - Integración con Firebase Cloud Messaging
