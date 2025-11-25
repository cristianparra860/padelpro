# Sistema de Actualización Automática de Precios

## 📌 Problema Resuelto

Cuando un club actualiza sus tarifas horarias en `CourtPriceSlot`, las clases ya generadas para los próximos 30 días mantienen sus precios antiguos. Esta funcionalidad permite actualizar todas esas clases de forma inmediata sin esperar a que se regeneren.

## 🎯 Características

### Endpoint API
- **Ruta:** `POST /api/admin/update-future-prices`
- **Permisos:** Solo admins globales o instructores del club
- **Funcionalidad:** Recalcula precios de todas las clases futuras sin confirmar (`courtId = NULL`)

### Parámetros de entrada:
```json
{
  "clubId": "club-uuid",
  "userId": "user-uuid",
  "instructorId": "instructor-uuid" // Opcional: filtrar solo clases de un instructor
}
```

### Respuesta exitosa:
```json
{
  "success": true,
  "message": "Se actualizaron 152 clases futuras",
  "updated": 152,
  "details": {
    "totalFound": 152,
    "filtered": 152,
    "clubId": "club-uuid",
    "instructorId": "all",
    "dateRange": {
      "from": "2025-11-21T08:00:00.000Z",
      "to": "2025-12-20T20:30:00.000Z"
    }
  },
  "sample": [
    {
      "id": "slot-1",
      "newPrice": 25,
      "courtPrice": 10,
      "instructorPrice": 15,
      "date": "2025-11-21T09:00:00.000Z"
    },
    // ... primeros 5 cambios
  ]
}
```

## 🖥️ Interfaz de Usuario

### Ubicación
Panel de administración → Tarifas de Pista → Botón "Aplicar a Clases Futuras"

### Flujo de uso:
1. **Actualizar tarifas:**
   - Modificar `CourtPriceSlot` con nuevas franjas horarias/precios
   - Hacer clic en "Guardar Cambios de Tarifas"

2. **Aplicar a clases existentes:**
   - Hacer clic en "Aplicar a Clases Futuras" (botón naranja)
   - El sistema recalcula automáticamente todas las clases sin confirmar
   - Muestra notificación con cantidad de clases actualizadas

### Validaciones:
- Botón deshabilitado si hay cambios sin guardar (form dirty)
- Solo visible para admins e instructores del club
- Muestra spinner mientras procesa

## 🔧 Uso Técnico

### Desde scripts Node.js:
```javascript
const response = await fetch('http://localhost:9002/api/admin/update-future-prices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clubId: 'cm3uxxx...',
    userId: 'cm3uyyy...'
  })
});

const result = await response.json();
console.log(`Actualizadas ${result.updated} clases`);
```

### Script de prueba incluido:
```bash
node test-price-update-api.js
```

Este script:
- Obtiene el club y usuario de prueba
- Muestra precios antes de la actualización
- Ejecuta el endpoint
- Verifica cambios en base de datos
- Muestra muestra de clases actualizadas

## ⚙️ Lógica Interna

### Algoritmo:
1. **Validación de permisos:** Verifica que el usuario sea admin o instructor del club
2. **Query de clases futuras:**
   ```sql
   SELECT * FROM TimeSlot 
   WHERE clubId = ? 
     AND courtId IS NULL 
     AND start > ?
   ```
3. **Cálculo de precios:**
   - Para cada clase: `getCourtPriceForTime(clubId, startDate)`
   - Precio total = `courtPrice + instructorPrice`
4. **Actualización en batch:**
   - Update `totalPrice`, `courtRentalPrice`, `instructorPrice`
   - Log de auditoría en `ActivityLog` (si existe)

### Filtros opcionales:
- Por instructor: Solo actualiza clases de un instructor específico
- Respeta clases confirmadas: No toca clases con `courtId != NULL`

## 📊 Casos de Uso

### 1. Cambio de temporada
```
Invierno → Verano
- Antes: €20 (17:00-21:00)
- Después: €15 (17:00-21:00)
→ Actualizar 30 días de clases nocturnas
```

### 2. Promoción especial
```
Black Friday: Mañanas más baratas
- Antes: €10 (07:00-16:00)
- Después: €7 (07:00-16:00)
→ Aplicar a todas las clases de mañana del mes
```

### 3. Ajuste por instructor
```
Instructor cambia tarifa: €15 → €18
- Filtrar: instructorId = "instructor-uuid"
→ Solo actualiza clases de ese instructor
```

## 🛡️ Seguridad

### Control de acceso:
- ✅ Solo usuarios autenticados
- ✅ Verificación de rol (admin o instructor)
- ✅ Validación de pertenencia al club
- ✅ Log de auditoría de cambios

### Protecciones:
- No afecta clases confirmadas (con `courtId`)
- No afecta clases pasadas
- Transacciones atómicas en base de datos
- Manejo de errores con rollback automático

## 🔗 Archivos Relacionados

### Backend:
- `src/app/api/admin/update-future-prices/route.ts` - Endpoint principal
- `src/lib/courtPricing.ts` - Lógica de cálculo de precios

### Frontend:
- `src/app/(app)/admin/components/ManageCourtRatesPanel.tsx` - UI del botón

### Testing:
- `test-price-update-api.js` - Script de prueba end-to-end

## 📝 Notas Importantes

1. **Auto-generación diaria:** Las clases generadas después del cambio de tarifas ya usan automáticamente los nuevos precios (día +30)

2. **Ventana de 30 días:** El cron genera para día +30, por lo que sin este endpoint habría que esperar 30 días para aplicar nuevos precios

3. **Performance:** Actualiza en batch, ~2-3 segundos para 200 clases

4. **Compatibilidad:** Trabaja con el sistema de precios existente, no requiere cambios en otros componentes
