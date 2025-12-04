# Sistema de Plazas con Puntos (Credits Slots)

## 📋 Resumen

Sistema implementado para permitir que los instructores marquen plazas específicas (1-4 jugadores) como "reservables con puntos" en lugar de pago con créditos. Esto da flexibilidad a los instructores para:
- Ofrecer clases gratuitas (usando puntos de la plataforma)
- Recompensar estudiantes regulares
- Llenar clases con baja demanda

## 🗄️ Esquema de Base de Datos

### TimeSlot (Modificado)
```sql
-- Nuevos campos añadidos:
creditsSlots      String?  -- JSON array [1,2,3,4] - índices de plazas con puntos
creditsCost       Int      @default(50) -- Coste en puntos para reservar
```

**Migration**: `20251130174648_add_credits_slots_to_timeslot`

### Ejemplo de datos:
```json
{
  "id": "ts-123",
  "creditsSlots": "[2,3]",  // Modalidades de 2 y 3 jugadores son con puntos
  "creditsCost": 50,         // Cuesta 50 puntos reservar
  "totalPrice": 60           // Precio normal en céntimos (€0.60)
}
```

## 🔌 API Endpoints

### 1. Gestión de Credits Slots (Instructor)
**Endpoint**: `PATCH /api/timeslots/[id]/credits-slots`

**Request Body**:
```json
{
  "slotIndex": 3,           // 1, 2, 3, o 4
  "action": "add",          // "add" o "remove"
  "creditsCost": 50         // Opcional, actualizar coste
}
```

**Response**:
```json
{
  "message": "Credits slot añadido exitosamente",
  "creditsSlots": [2, 3],
  "creditsCost": 50
}
```

**Validaciones**:
- ✅ `slotIndex` debe ser 1-4
- ✅ `action` debe ser "add" o "remove"
- ✅ No se puede marcar una plaza ocupada
- ✅ TimeSlot debe existir

### 2. Obtener Credits Slots
**Endpoint**: `GET /api/timeslots/[id]/credits-slots`

**Response**:
```json
{
  "creditsSlots": [2, 3],
  "creditsCost": 50
}
```

### 3. Reservar con Puntos
**Endpoint**: `POST /api/classes/book`

**Request Body**:
```json
{
  "userId": "user-123",
  "timeSlotId": "ts-456",
  "groupSize": 3,           // Debe estar en creditsSlots
  "usePoints": true         // ⚠️ REQUERIDO para credits slots
}
```

**Lógica del Backend**:
1. Verifica si `groupSize` está en `creditsSlots` del TimeSlot
2. Si es credits slot:
   - ✅ Valida que `usePoints = true`
   - ✅ Usa `creditsCost` (no `pricePerSlot`)
   - ✅ Verifica que el usuario tenga suficientes puntos
   - ✅ Descuenta puntos de `User.points`
   - ✅ No bloquea créditos (`amountBlocked = 0`)
3. Si no tiene suficientes puntos → Error 400

## 🎨 Componentes Frontend

### 1. InstructorCreditsSlotManager (Instructor)
**Ubicación**: `src/components/class/InstructorCreditsSlotManager.tsx`

**Props**:
```typescript
{
  timeSlotId: string;
  maxPlayers: number;        // 4
  bookings: Booking[];
  creditsSlots?: number[];   // [2, 3]
  creditsCost?: number;      // 50
  onUpdate: () => void;      // Callback para refrescar
}
```

**Características**:
- Grid de 1-4 jugadores
- Plazas ocupadas: Gris con nombre del usuario (no editables)
- Plazas con puntos: Gradiente ámbar/dorado con icono 🎁
- Plazas normales: Fondo blanco con texto verde
- Botones de toggle: "Marcar Puntos" (🎁) / "Quitar Puntos" (✕)
- Estados de carga por plaza
- Notificaciones toast en éxito/error

**Integración**:
```tsx
// En InstructorClassCards.tsx
<div className="space-y-3">
  <InstructorCreditsSlotManager
    timeSlotId={slot.id}
    maxPlayers={slot.maxPlayers}
    bookings={slot.bookings || []}
    creditsSlots={slot.creditsSlots}
    creditsCost={slot.creditsCost}
    onUpdate={() => setRefreshKey(prev => prev + 1)}
  />
  <ClassCardReal {...slotProps} />
</div>
```

### 2. ClassCardReal (Estudiante)
**Ubicación**: `src/components/class/ClassCardReal.tsx`

**Modificaciones**:

#### a) Detección de Credits Slots
```typescript
const creditsSlots = (currentSlotData as any).creditsSlots || [];
const creditsCost = (currentSlotData as any).creditsCost || 50;
const isCreditsSlot = Array.isArray(creditsSlots) && creditsSlots.includes(players);
```

#### b) Visual de Círculos de Jugadores
```tsx
<div className={cn(
  "w-12 h-12 rounded-full border-2",
  isOccupied 
    ? (isCreditsSlot ? 'border-amber-500' : 'border-green-500')
    : (isCreditsSlot 
        ? 'border-dashed border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
        : 'border-dashed border-green-400')
)}>
```

**Efectos**:
- 🟡 Bordes dorados para credits slots
- 🌟 Efecto glow dorado en plazas vacías
- 🎁 Icono y texto "Puntos" debajo

#### c) Display de Precio/Puntos
```tsx
{isCreditsSlot ? (
  // 🎁 Mostrar puntos
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500">
    <span className="text-2xl">🎁</span>
    <div>
      <span className="text-base font-bold text-amber-900">{creditsCost}</span>
      <span className="text-[10px] font-semibold text-amber-800">Puntos</span>
    </div>
  </div>
) : (
  // 💰 Mostrar precio normal
  <div className="text-lg font-bold text-gray-900">
    € {pricePerPerson.toFixed(2)}
  </div>
)}
```

#### d) Lógica de Reserva
```typescript
if (isCreditsSlot) {
  const userPoints = (currentUser as any).points || 0;
  
  if (userPoints >= creditsCost) {
    usePoints = true; // Usar puntos automáticamente
    toast({
      title: "🎁 Reserva con Puntos",
      description: `Se usarán ${creditsCost} puntos (tienes ${userPoints}).`
    });
  } else {
    toast({
      title: "❌ Puntos Insuficientes",
      description: `Requiere ${creditsCost} puntos pero tienes ${userPoints}.`
    });
    return; // 🚫 Bloquear reserva
  }
}
```

## 🔄 Flujo Completo

### Flujo del Instructor
1. Instructor accede a su panel de clases
2. Ve componente `InstructorCreditsSlotManager` arriba de cada clase
3. Click en "Marcar Puntos" para plaza deseada (ej: 3 jugadores)
4. PATCH `/api/timeslots/{id}/credits-slots` → `creditsSlots: [3]`
5. Visual cambia a gradiente dorado con badge de puntos
6. Estudiantes ahora ven esa modalidad con icono 🎁

### Flujo del Estudiante
1. Estudiante busca clases disponibles
2. Ve clase con plaza de 3 jugadores en dorado
3. Muestra "🎁 50 Puntos" en lugar de "€ 15"
4. Click para reservar
5. Sistema verifica: `userPoints >= 50`
6. Si OK: 
   - POST `/api/classes/book` con `usePoints: true`
   - Backend descuenta 50 puntos de `User.points`
   - Booking creado con `paidWithPoints: 1, pointsUsed: 50`
7. Si NO: Toast de error "Puntos insuficientes"

## 📊 Estados de Plazas

| Estado | Color | Borde | Texto | Acción |
|--------|-------|-------|-------|--------|
| **Libre (Normal)** | Blanco | Verde punteado | "Libre" verde | Reservar con créditos |
| **Libre (Credits)** | Blanco | Ámbar punteado + glow | "🎁 Puntos" ámbar | Reservar con puntos |
| **Ocupada (Normal)** | Avatar/Iniciales | Verde sólido | Nombre usuario | No disponible |
| **Ocupada (Credits)** | Avatar/Iniciales | Ámbar sólido | Nombre usuario | No disponible |
| **Reciclada** | Amarillo | Amarillo | "♻️ Reciclada" | Opcional puntos |

## 🛡️ Validaciones y Seguridad

### Frontend (ClassCardReal.tsx)
```typescript
// ✅ Verificar puntos suficientes
if (userPoints < creditsCost) {
  toast({ title: "Puntos Insuficientes" });
  return; // Bloquear
}

// ✅ Forzar usePoints = true
usePoints = true;
```

### Backend (book/route.ts)
```typescript
// ✅ Detectar credits slot
const isCreditsSlot = creditsSlots.includes(groupSize);

// ✅ Validar método de pago
if (isCreditsSlot && !usePoints) {
  return NextResponse.json({ 
    error: "Esta plaza solo se puede reservar con puntos" 
  }, { status: 400 });
}

// ✅ Validar saldo de puntos
if (userPoints < creditsCost) {
  return NextResponse.json({ 
    error: "Puntos insuficientes" 
  }, { status: 400 });
}

// ✅ Usar creditsCost (no pricePerSlot)
const pointsToUse = isCreditsSlot ? creditsCost : Math.floor(pricePerSlot);

// ✅ Descontar puntos
await prisma.$executeRaw`
  UPDATE User SET points = points - ${pointsToUse}
  WHERE id = ${userId}
`;
```

## 🧪 Testing

### Caso 1: Instructor Marca Plaza
```bash
# Marcar modalidad 2 jugadores con puntos
curl -X PATCH http://localhost:9002/api/timeslots/ts-123/credits-slots \
  -H "Content-Type: application/json" \
  -d '{"slotIndex": 2, "action": "add", "creditsCost": 50}'

# Resultado:
{
  "message": "Credits slot añadido exitosamente",
  "creditsSlots": [2],
  "creditsCost": 50
}
```

### Caso 2: Estudiante Reserva con Puntos
```bash
# Usuario con 100 puntos reserva plaza de 2 jugadores
curl -X POST http://localhost:9002/api/classes/book \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "timeSlotId": "ts-123",
    "groupSize": 2,
    "usePoints": true
  }'

# Resultado:
{
  "message": "Booking successful",
  "bookingId": "book-789",
  "pointsDeducted": 50,
  "remainingPoints": 50
}
```

### Caso 3: Estudiante Sin Puntos Suficientes
```bash
# Usuario con 30 puntos intenta reservar (requiere 50)
curl -X POST http://localhost:9002/api/classes/book \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-999",
    "timeSlotId": "ts-123",
    "groupSize": 2,
    "usePoints": true
  }'

# Resultado:
{
  "error": "Puntos insuficientes",
  "details": "Necesitas 50 puntos pero solo tienes 30.",
  "required": 50,
  "available": 30,
  "missing": 20
}
```

## 📁 Archivos Modificados

### Database
- ✅ `prisma/schema.prisma` (líneas 267-269)
- ✅ `prisma/migrations/20251130174648_add_credits_slots_to_timeslot/`

### Backend API
- ✅ `src/app/api/timeslots/route.ts` (líneas 213-223, 298-301)
- ✅ `src/app/api/timeslots/[id]/credits-slots/route.ts` (NUEVO - 175 líneas)
- ✅ `src/app/api/classes/book/route.ts` (líneas 389-445, 515-520)

### Types
- ✅ `src/types/index.ts` (líneas 265-266)
- ✅ `src/lib/classesApi.ts` (líneas 44-46)

### Components
- ✅ `src/components/class/InstructorCreditsSlotManager.tsx` (NUEVO - 200 líneas)
- ✅ `src/components/class/ClassCardReal.tsx` (líneas 930-945, 1000-1010, 1070-1085, 295-365)
- ✅ `src/app/(app)/instructor/components/InstructorClassCards.tsx` (líneas 7, 139-169)

## 🎯 Casos de Uso

### 1. Promoción de Clase con Baja Demanda
**Problema**: Clase a las 07:00 no se llena
**Solución**: Instructor marca modalidad 1 jugador (50 puntos)
**Resultado**: Estudiantes usan puntos acumulados, clase se llena

### 2. Recompensa a Estudiantes Regulares
**Problema**: Estudiante fiel merece beneficio
**Solución**: Instructor crea clase especial con todas modalidades en puntos
**Resultado**: Estudiante reserva gratis usando sus puntos ganados

### 3. Clase de Prueba
**Problema**: Nuevo estudiante quiere probar antes de comprar créditos
**Solución**: Instructor marca plaza de 1 jugador con 25 puntos (bono inicial)
**Resultado**: Estudiante prueba clase sin pagar

### 4. Evento Especial
**Problema**: Torneo interno requiere inscripción sin costo
**Solución**: Crear TimeSlots con todas modalidades en creditsSlots
**Resultado**: Participantes usan puntos, no hay cobros

## 💡 Mejoras Futuras (No Implementadas)

- [ ] Batch editing: Marcar múltiples clases a la vez
- [ ] Templates: Guardar configuraciones de creditsSlots para reutilizar
- [ ] Analytics: Dashboard de uso de plazas con puntos
- [ ] Variable costs: Diferentes costes por modalidad (ej: 1 jugador = 30p, 4 jugadores = 100p)
- [ ] Time-based discount: Creditsslots más baratos en horas pico
- [ ] Student view filter: Mostrar solo clases con puntos

## 🐛 Troubleshooting

### Problema: Estudiante no ve plazas doradas
**Causa**: `creditsSlots` no está siendo enviado por el API
**Solución**: Verificar que `/api/timeslots` incluye campos en response:
```typescript
creditsSlots: creditsSlots,
creditsCost: Number(slot.creditsCost || 50)
```

### Problema: Instructor no puede marcar plaza ocupada
**Causa**: Validación en API rechaza slots con bookings
**Solución**: Esto es intencional. Desmarcar usuarios primero si es necesario.

### Problema: Booking falla con "Puntos insuficientes" pero el usuario tiene puntos
**Causa**: Frontend no está enviando `usePoints: true`
**Solución**: Verificar que `handleBook()` detecta `isCreditsSlot` y asigna `usePoints = true`

### Problema: JSON parse error en creditsSlots
**Causa**: String mal formado en BD
**Solución**: Siempre usar `JSON.stringify([])` al guardar:
```typescript
const creditsSlots = JSON.stringify([1, 2]);
await prisma.timeSlot.update({
  where: { id },
  data: { creditsSlots }
});
```

## 📝 Notas de Implementación

- **Opción elegida**: Opción 1 (creditsSlots en TimeSlot)
  - ✅ Simple: Solo 2 campos en TimeSlot
  - ✅ Rápido: No requiere cambios en Booking
  - ✅ Flexible: Instructor controla por clase
  - ❌ Limitación: Todos los credits slots cuestan lo mismo

- **Compatibilidad**: Sistema compatible con plazas recicladas
  - Plaza reciclada: Usuario elige puntos o créditos
  - Credits slot: Solo puntos (obligatorio)

- **Performance**: Parsing de JSON es rápido (<1ms para arrays pequeños)

---

**Fecha de implementación**: 30 de noviembre de 2024
**Versión**: 1.0.0
**Status**: ✅ Completamente funcional
