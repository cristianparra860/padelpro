# ♻️ Sistema de Plazas Recicladas - Implementación Completa

## 📋 Resumen

Sistema implementado para permitir que plazas canceladas sean reutilizadas, otorgando compensación en puntos al usuario que cancela y permitiendo que esa plaza sea reservada exclusivamente con puntos.

---

## ✅ Cambios Implementados

### 1. **Modificaciones en API `/api/timeslots`** 
**Archivo:** `src/app/api/timeslots/route.ts`

#### Cambios:
- ✅ Agregado campo `isRecycled` a la consulta de bookings
- ✅ Creado Map `recycledSlotsInfo` que calcula:
  - Número de plazas recicladas por slot
  - Número de plazas activas
  - Plazas disponibles para reservar con puntos
- ✅ Agregados 3 campos nuevos a la respuesta de cada slot:
  ```typescript
  {
    hasRecycledSlots: boolean,
    availableRecycledSlots: number,
    recycledSlotsOnlyPoints: boolean
  }
  ```

**Líneas modificadas:** ~200-330

---

### 2. **Desbloqueo de Día para Usuarios que Cancelan**
**Archivo:** `src/app/api/classes/book/route.ts`

#### Cambios:
- ✅ Modificada query de verificación de bookings confirmados (línea ~420)
- ✅ La query **solo** busca bookings con `status = 'CONFIRMED'`
- ✅ Los bookings `CANCELLED` ya NO bloquean el día del usuario
- ✅ Usuario que cancela puede reservar de nuevo ese mismo día

**Comportamiento:**
```typescript
// ANTES: Usuario con booking cancelado = día bloqueado ❌
// AHORA: Usuario con booking cancelado = día libre ✅
```

---

### 3. **Nuevo Endpoint para Reservar con Puntos**
**Archivo:** `src/app/api/classes/book-with-points/route.ts` *(NUEVO)*

#### Características:
- ✅ Endpoint exclusivo para plazas recicladas
- ✅ Valida que `hasRecycledSlots = true`
- ✅ Solo acepta pago con **puntos** (no con saldo)
- ✅ Valida disponibilidad de plazas
- ✅ Verifica que usuario tenga suficientes puntos
- ✅ Respeta regla de "1 reserva confirmada por día"
- ✅ Cobra puntos inmediatamente si clase ya está confirmada
- ✅ Bloquea puntos si clase está pendiente

**Endpoint:** `POST /api/classes/book-with-points`

**Payload:**
```json
{
  "timeSlotId": "string",
  "userId": "string",
  "groupSize": 2
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Plaza reciclada reservada exitosamente con 10 puntos. Pista 1 asignada.",
  "booking": {
    "id": "booking-xxx",
    "timeSlotId": "ts-xxx",
    "userId": "user-xxx",
    "groupSize": 2,
    "status": "CONFIRMED",
    "pointsUsed": 10,
    "courtNumber": 1,
    "isRecycledSlot": true
  }
}
```

---

### 4. **Actualización del Frontend**
**Archivo:** `src/components/class/ClassCardReal.tsx`

#### Cambios:

**a) Badge de Plazas Recicladas (línea ~1000):**
```tsx
{currentSlotData.hasRecycledSlots && currentSlotData.availableRecycledSlots > 0 && (
  <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1">
    <span className="text-xl animate-pulse">♻️</span>
    <span className="text-white font-bold text-xs">
      {currentSlotData.availableRecycledSlots} plaza(s) reciclada(s)
    </span>
    <span className="text-white text-xs font-semibold">
      <Gift className="w-3 h-3" />
      Solo con puntos
    </span>
  </div>
)}
```

**b) Visualización de Plazas Recicladas:**
- ✅ Círculos amarillos con símbolo ♻️ para plazas canceladas
- ✅ Animación `recycled-slot-blink` para destacar
- ✅ Tooltip: "♻️ Plaza reciclada - Reservable con puntos"

**c) Integración con creditsSlots:**
- ✅ Plazas recicladas se tratan automáticamente como `creditsSlots`
- ✅ Combinación de creditsSlots manuales + recicladas automáticas
- ✅ Instructores pueden toggle individual por círculo

---

### 5. **Actualización de Tipos TypeScript**
**Archivo:** `src/types/index.ts`

#### Campos agregados a `TimeSlot`:
```typescript
interface TimeSlot {
  // ... campos existentes
  hasRecycledSlots?: boolean;           // ♻️ Indica que tiene plazas recicladas
  availableRecycledSlots?: number;      // ♻️ Cantidad disponible
  recycledSlotsOnlyPoints?: boolean;    // ♻️ Reserva solo con puntos
  // ... resto de campos
}
```

#### Campos en `Booking`:
```typescript
interface Booking {
  // ... campos existentes
  isRecycled?: boolean; // ♻️ Marca si es plaza reciclada
}
```

---

## 🔄 Flujo Completo del Sistema

### Escenario: Clase de 2 Jugadores

#### **1. Estado Inicial**
```
Clase: 2 plazas disponibles
Usuario A: Reserva plaza 1 (PENDING → CONFIRMED)
Usuario B: Reserva plaza 2 (PENDING → CONFIRMED)
Resultado: Clase completa, pista asignada
```

#### **2. Usuario A Cancela**
```
API: POST /api/classes/cancel
- Booking A → status = 'CANCELLED', isRecycled = true
- TimeSlot → hasRecycledSlots = true
- Usuario A → +10 puntos (compensación)
- Usuario A → día DESBLOQUEADO ✅
- Usuario B → día sigue BLOQUEADO 🚫
```

#### **3. Plaza Disponible para Reservar**
```
API: GET /api/timeslots
Respuesta incluye:
{
  "hasRecycledSlots": true,
  "availableRecycledSlots": 1,
  "recycledSlotsOnlyPoints": true
}
```

#### **4. Frontend Muestra Plaza**
```
ClassCard:
- Badge amarillo: "♻️ 1 plaza reciclada - Solo con puntos"
- Círculo amarillo con ♻️ pulsante
- Tooltip explicativo
```

#### **5. Usuario A (u otro) Reserva con Puntos**
```
API: POST /api/classes/book-with-points
Validaciones:
✅ hasRecycledSlots = true
✅ Usuario tiene puntos suficientes
✅ Plaza disponible
✅ No tiene booking confirmado ese día

Resultado:
- Crea nuevo booking con paidWithPoints = true
- Cobra puntos (si clase confirmada)
- Clase vuelve a estar completa
```

---

## 🧪 Testing

### Script de Prueba Completo
**Archivo:** `test-complete-recycled-system.js`

**Ejecutar:**
```bash
node test-complete-recycled-system.js
```

**Pasos del test:**
1. ✅ Encuentra clase de 2 jugadores
2. ✅ Simula 2 bookings (clase completa)
3. ✅ Asigna pista (CONFIRMED)
4. ✅ Usuario 1 cancela
5. ✅ Verifica plaza reciclada
6. ✅ Verifica desbloqueo de día
7. ✅ Valida compensación de puntos

### Scripts de Diagnóstico
```bash
# Ver plazas recicladas actuales
node test-recycled-slots.js

# Ver estructura de niveles
node check-level-structure.js
```

---

## 📊 Cambios en Base de Datos

### Campos Utilizados (ya existían):
- `Booking.isRecycled` (Boolean) - Marca booking cancelado que otorga puntos
- `TimeSlot.hasRecycledSlots` (Boolean) - Indica slot con plazas recicladas

### Queries Importantes:

**Buscar clases con plazas recicladas:**
```sql
SELECT 
  ts.id,
  ts.hasRecycledSlots,
  COUNT(CASE WHEN b.status = 'CANCELLED' AND b.isRecycled = 1 THEN 1 END) as recycled,
  COUNT(CASE WHEN b.status != 'CANCELLED' THEN 1 END) as active
FROM TimeSlot ts
LEFT JOIN Booking b ON ts.id = b.timeSlotId
WHERE ts.hasRecycledSlots = 1
GROUP BY ts.id
```

**Verificar día bloqueado (excluye cancelados):**
```sql
SELECT b.id
FROM Booking b
JOIN TimeSlot ts ON b.timeSlotId = ts.id
WHERE b.userId = ?
AND b.status = 'CONFIRMED'  -- Solo CONFIRMED bloquean
AND ts.start >= ?
AND ts.start <= ?
```

---

## 🎯 Reglas de Negocio Implementadas

### ✅ Cancelación
1. Booking confirmado → Otorga puntos (1€ = 1 punto)
2. Booking pendiente → Penalización €1, devuelve resto
3. Booking cancelado → Marca `isRecycled = true`
4. TimeSlot → Marca `hasRecycledSlots = true`

### ✅ Desbloqueo de Día
1. Usuario con booking CONFIRMED → Día bloqueado 🚫
2. Usuario con booking CANCELLED → Día libre ✅
3. Solo se cuentan bookings NO cancelados

### ✅ Reserva con Puntos
1. Solo para slots con `hasRecycledSlots = true`
2. Coste: Precio de clase en puntos (1€ = 1 punto)
3. Validación de puntos disponibles
4. Respeta límite de 1 reserva/día
5. Cobra/bloquea puntos según estado de clase

### ✅ Visualización
1. Badge amarillo si `availableRecycledSlots > 0`
2. Círculos amarillos con ♻️ para plazas recicladas
3. Texto "Solo con puntos" visible
4. Plazas recicladas = creditsSlots automáticos

---

## 🚀 Próximos Pasos (Opcionales)

### Mejoras Sugeridas:
1. **Endpoint para listar solo plazas recicladas**
   ```
   GET /api/classes/recycled?userId=xxx
   ```

2. **Notificaciones push**
   - Avisar a usuarios cuando se libera plaza reciclada
   - En clases que matchean su nivel

3. **Panel de admin**
   - Estadísticas de plazas recicladas
   - Tracking de compensaciones de puntos

4. **Límite temporal**
   - Plazas recicladas expiran en 24h
   - Después vuelven a reserva normal con saldo

5. **Prioridad para usuarios del mismo nivel**
   - Primeras 2 horas: solo usuarios nivel similar
   - Después: abierto a todos

---

## 📝 Notas Técnicas

### Compatibilidad
- ✅ Compatible con sistema de race booking existente
- ✅ No afecta bookings normales con saldo
- ✅ creditsSlots manuales siguen funcionando
- ✅ Sistema de puntos de compensación ya existente

### Performance
- Cálculo de plazas recicladas: O(n) en map
- Sin queries adicionales N+1
- Información incluida en respuesta principal

### Seguridad
- Validación de ownership en cancelación
- Validación de puntos disponibles
- No permite double-booking
- Respeta límite 1 reserva/día

---

## 🐛 Debugging

### Logs a buscar:
```
♻️ RESERVA DE PLAZA RECICLADA CON PUNTOS
✅ Clase tiene plazas recicladas
📊 Plazas: X/Y ocupadas, Z disponibles
💎 Coste en puntos: X
```

### Variables de entorno:
Ninguna nueva requerida.

### Errores comunes:
1. **"Esta clase no tiene plazas recicladas"**
   - Verificar `hasRecycledSlots = true` en TimeSlot
   - Verificar bookings con `isRecycled = true`

2. **"No tienes suficientes puntos"**
   - Verificar `User.points - User.blockedLoyaltyPoints`
   - Coste = `Math.floor(TimeSlot.totalPrice)`

3. **"Ya tienes una reserva confirmada este día"**
   - Usuario tiene booking CONFIRMED ese día
   - Aunque haya cancelado, puede haber reservado otra clase

---

## 📞 Soporte

Para más información, revisar:
- `src/app/api/classes/cancel/route.ts` - Lógica de cancelación
- `src/app/api/classes/book-with-points/route.ts` - Reserva con puntos
- `src/app/api/timeslots/route.ts` - Cálculo de plazas disponibles
- `test-complete-recycled-system.js` - Test end-to-end

---

**Última actualización:** 8 de diciembre de 2025
**Versión:** 1.0.0
**Estado:** ✅ Implementación completa y funcional
