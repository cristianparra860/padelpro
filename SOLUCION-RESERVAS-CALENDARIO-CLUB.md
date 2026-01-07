# Solución: Sistema de Reservas desde el Calendario del Club

## Problema Identificado

El sistema de reservas de pistas desde el panel del calendario del club no estaba implementado. Al hacer clic en "Confirmar Reserva", solo se mostraba una alerta con el mensaje "Funcionalidad de reserva en desarrollo".

**Ubicación del problema:**
- Archivo: `src/components/admin/ClubCalendarImproved.tsx`
- Línea: ~2133 (botón "Confirmar Reserva")
- Código problemático: `alert('Funcionalidad de reserva en desarrollo');`

## Solución Implementada

### 1. Integración con la API existente

Se implementó la llamada al endpoint `/api/bookings/court-reservation` que ya estaba disponible pero no se estaba usando.

**Flujo implementado:**
1. Usuario selecciona una celda del calendario (hora + pista)
2. Se abre el diálogo de reserva con selector de duración (30, 60, 90, 120 min)
3. Se calcula automáticamente el precio basado en: `(10€/hora × duración) / 60`
4. Al confirmar, se envía petición POST a la API con:
   - `clubId`: ID del club
   - `courtId`: ID de la pista (obtenido del número de pista)
   - `start`: Fecha/hora de inicio (ISO string)
   - `end`: Fecha/hora de fin (ISO string)
   - `userId`: ID del usuario actual
   - `duration`: Duración en minutos
   - `totalPrice`: Precio total calculado

### 2. Funcionalidad añadida al botón "Confirmar Reserva"

```typescript
onClick={async () => {
  if (!selectedCourtSlot || !currentUser) return;
  
  // 1. Calcular timestamps
  const [hours, minutes] = selectedCourtSlot.time.split(':').map(Number);
  const startDate = new Date(selectedCourtSlot.date);
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + selectedDuration);
  
  // 2. Calcular precio
  const pricePerHour = 10;
  const totalPrice = (pricePerHour * selectedDuration) / 60;
  
  // 3. Obtener courtId
  const courtId = calendarData?.courts.find(c => c.number === selectedCourtSlot.courtNumber)?.id;
  
  // 4. Llamar a la API
  const response = await fetch('/api/bookings/court-reservation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clubId, courtId, 
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      userId: currentUser.id,
      duration: selectedDuration,
      totalPrice,
    }),
  });
  
  // 5. Manejar respuesta
  if (response.ok) {
    alert('✅ ¡Reserva confirmada!');
    // 6. Limpiar caché y recargar
    sessionStorage.removeItem(`calendar-${clubId}-${dateParam}`);
    setCurrentDate(new Date(currentDate.getTime()));
  } else {
    alert('❌ Error: ' + result.error);
  }
}
```

### 3. Validaciones implementadas por la API

El endpoint `/api/bookings/court-reservation` ya tiene implementadas las siguientes validaciones:

✅ **Verificación de usuario**: Confirma que el usuario existe
✅ **Verificación de créditos**: Comprueba saldo suficiente
✅ **Disponibilidad de pista**: Verifica que no haya conflictos en `CourtSchedule`
✅ **Transacción automática**: Descuenta créditos y registra en `Transaction`
✅ **Registro en base de datos**: Crea entrada en `CourtSchedule` marcando la pista como ocupada

### 4. Recarga automática del calendario

Después de crear la reserva exitosamente:
1. Se limpia la caché de `sessionStorage` para ese día
2. Se fuerza la recarga del calendario actualizando el estado `currentDate`
3. El calendario vuelve a hacer fetch a `/api/admin/calendar` con los datos frescos
4. La reserva aparece inmediatamente en la vista del calendario

## Archivos Modificados

### `src/components/admin/ClubCalendarImproved.tsx`
- **Líneas modificadas**: 2115-2215 (aprox)
- **Cambio**: Implementación completa del handler `onClick` del botón "Confirmar Reserva"

## Endpoints utilizados

### POST `/api/bookings/court-reservation`
**Ubicación:** `src/app/api/bookings/court-reservation/route.ts`

**Request body:**
```json
{
  "clubId": "club-1",
  "courtId": "court-1",
  "start": "2026-01-08T10:00:00.000Z",
  "end": "2026-01-08T11:00:00.000Z",
  "userId": "alex-garcia-id",
  "duration": 60,
  "totalPrice": 10
}
```

**Response (éxito):**
```json
{
  "success": true,
  "reservation": {
    "id": "cs-...",
    "courtId": "court-1",
    "startTime": "2026-01-08T10:00:00.000Z",
    "endTime": "2026-01-08T11:00:00.000Z",
    "duration": 60,
    "totalPrice": 10
  }
}
```

**Response (error - créditos insuficientes):**
```json
{
  "error": "Créditos insuficientes",
  "requiredCredits": 10,
  "availableCredits": 5.5
}
```

**Response (error - pista ocupada):**
```json
{
  "error": "La pista seleccionada no está disponible en ese horario"
}
```

## Pruebas

### Script de prueba creado
`test-court-reservation-calendar.js` - Verifica:
1. ✅ Creación de reserva mediante la API
2. ✅ Validación de créditos suficientes
3. ✅ Verificación de disponibilidad de pista
4. ✅ Aparición de la reserva en el calendario

### Cómo ejecutar las pruebas

```powershell
# 1. Asegurarse de que el servidor está corriendo
npm run dev

# 2. En otra terminal, ejecutar el test
node test-court-reservation-calendar.js
```

## Comportamiento esperado

### Antes (PROBLEMA)
1. Usuario hace clic en una celda del calendario
2. Se abre el diálogo de reserva
3. Usuario selecciona duración (30/60/90/120 min)
4. Usuario hace clic en "Confirmar Reserva"
5. ❌ Solo aparece: `alert('Funcionalidad de reserva en desarrollo')`
6. ❌ No se crea ninguna reserva
7. ❌ El calendario no se actualiza

### Ahora (SOLUCIÓN)
1. Usuario hace clic en una celda del calendario
2. Se abre el diálogo de reserva
3. Usuario selecciona duración (30/60/90/120 min)
4. Usuario hace clic en "Confirmar Reserva"
5. ✅ Se envía petición a `/api/bookings/court-reservation`
6. ✅ Se validan créditos y disponibilidad
7. ✅ Se crea la reserva en la base de datos
8. ✅ Se descuentan los créditos del usuario
9. ✅ Se registra la transacción
10. ✅ Se muestra confirmación con los detalles
11. ✅ El calendario se recarga automáticamente
12. ✅ La reserva aparece en el calendario (bloque naranja/rojo)

## Mensajes de feedback al usuario

### Éxito
```
✅ ¡Reserva confirmada!

Pista 1
8 de enero de 2026
Hora: 10:00
Duración: 60 min
Total: 10.00€
```

### Error (créditos insuficientes)
```
❌ Error: Créditos insuficientes

[Detalles del error]
```

### Error (pista ocupada)
```
❌ Error: La pista seleccionada no está disponible en ese horario

[Detalles del error]
```

### Error (conexión)
```
❌ Error al procesar la reserva. Por favor, intenta de nuevo.
```

## Integración con el sistema existente

La implementación se integra perfectamente con:

✅ **Sistema de créditos**: Descuenta automáticamente del saldo
✅ **Sistema de transacciones**: Registra cada reserva
✅ **CourtSchedule**: Marca la pista como ocupada
✅ **Calendario del club**: Muestra las reservas en tiempo real
✅ **Race booking system**: No interfiere con el sistema de clases

## Próximos pasos recomendados

1. ✅ **Testing exhaustivo**: Probar con diferentes duraciones y horarios
2. ⚠️ **Validación de horarios del club**: Verificar que no se pueda reservar fuera del horario de apertura
3. ⚠️ **Cancelación de reservas**: Implementar funcionalidad para cancelar reservas de pista
4. ⚠️ **Vista de mis reservas**: Mostrar las reservas del usuario en su perfil
5. ⚠️ **Notificaciones**: Enviar confirmación por email/notificación push

## Notas técnicas

- **Price calculation**: 10€/hora → fórmula `(10 × duration) / 60`
- **Timestamps**: Convertidos a ISO strings para la API
- **Cache invalidation**: Se limpia `sessionStorage` después de crear reserva
- **Error handling**: Manejo completo de errores con mensajes descriptivos
- **UX**: Feedback inmediato con alertas y recarga automática del calendario

---

**Fecha de implementación**: 7 de enero de 2026  
**Estado**: ✅ Completado y funcional
