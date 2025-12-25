# Debug: Panel de Instructor - Conversión € → 🎁

## Problema reportado
El usuario hace clic en el símbolo verde € en la última plaza libre, pero no se realiza la conversión de pago en euros a puntos.

## Pasos para debuggear

### 1. Abrir la consola del navegador (F12)
- Ve a la pestaña "Console"
- Limpia la consola (botón de limpiar o Ctrl+L)

### 2. Hacer clic en el botón € verde
Deberías ver estos logs en orden:

```
🔥 Botón clicked! { players: X, index: Y, groupSize: X }
🔥 handleToggleIndividualSlot CALLED { players: X, circleIndex: Y }
🎁 Toggle plaza individual: { modalidad: X, groupSize: X, circuloEnModalidad: Y, accion: 'add' o 'remove', ... }
```

### 3. Posibles errores

#### Error A: No aparece "🔥 Botón clicked!"
**Causa**: El onClick no está siendo ejecutado
**Verificar**:
- ¿El botón tiene la clase `bg-green-500`?
- ¿Está habilitado (no tiene `disabled`)?
- ¿El click se está ejecutando en el círculo en lugar del botón?

#### Error B: Aparece "❌ No es instructor o falta instructorId"
**Causa**: Las props `isInstructor` o `instructorId` no están llegando
**Solución**: Verificar en React DevTools que ClassCardReal recibe:
- `isInstructor={true}`
- `instructorId="cmjhhs1lv000ltga4yl7vspkl"` (o el ID correcto)

#### Error C: Error de red al hacer fetch
**Causa**: El servidor no está respondiendo o el endpoint no existe
**Verificar**: En la pestaña "Network" de DevTools:
- Busca un request a `/api/timeslots/[id]/credits-slots`
- ¿Status code? (200 = OK, 404 = no encontrado, 500 = error servidor)
- ¿Qué dice la respuesta?

#### Error D: "CORS" o "Failed to fetch"
**Causa**: Problema de red o servidor caído
**Solución**: Verificar que el servidor esté corriendo en http://localhost:9002

### 4. Verificar visualmente

Después del click exitoso, deberías ver:
1. **Spinner**: Brevemente, el botón muestra un ícono de carga
2. **Actualización**: Todos los círculos de esa modalidad cambian:
   - Borde amarillo grueso (4px)
   - Fondo amber-50
   - Glow dorado pulsante
   - Ícono de regalo 🎁 en el tooltip

### 5. Verificar en base de datos

```bash
node check-credits-slots.js
```

Deberías ver el slot con el nuevo `creditsSlots` actualizado.

## Comandos útiles

```powershell
# Ver logs del servidor
Get-Content -Path ".next\server\middleware.js" -Tail 50

# Verificar que el endpoint existe
Test-Path "src\app\api\timeslots\[id]\credits-slots\route.ts"

# Probar el endpoint directamente
node test-credits-conversion.js
```

## Información actual del sistema

**Slot de prueba**: 26/12/2025 09:00
- ID: `ts_1766512986806_eexnl3t7y`
- Instructor: Carlos Rodriguez
- creditsSlots actual: `[1,2]`

**Props correctas en InstructorClassCards.tsx** (línea 252):
```tsx
isInstructor={true}
instructorId={instructor.id}
```

**Handler en ClassCardReal.tsx** (línea 219):
```tsx
const handleToggleIndividualSlot = async (players: number, circleIndex: number, event: React.MouseEvent) => {
  console.log('🔥 handleToggleIndividualSlot CALLED', { players, circleIndex });
  // ...
}
```

**Botón render** (línea 1859):
```tsx
{isInstructorProp && !isOccupied && !isAnotherModalityConfirmed && index === players - 1 && (
  <button onClick={(e) => { handleToggleIndividualSlot(players, index, e); }}>
```

## Siguiente paso
**Por favor, abre la consola del navegador (F12) y haz clic en el botón €**. Comparte qué mensajes aparecen en la consola.
