# 🔧 Pasos para Depurar el Problema de "Cargando disponibilidad..."

## ✅ Cambios Aplicados

1. ✅ API devuelve `courtsAvailability` correctamente
2. ✅ Tipo TypeScript actualizado en `classesApi.ts`
3. ✅ Logs de debug agregados en `ClassCardReal.tsx`
4. ✅ Logs de debug agregados en `ClassesDisplay.tsx`
5. ✅ Headers sin caché configurados

## 🎯 PASO 1: Reiniciar Servidor (IMPORTANTE)

El servidor necesita recompilarse con los nuevos tipos TypeScript:

```powershell
# En la terminal donde corre npm run dev:
1. Presionar Ctrl + C
2. Esperar a que se detenga
3. Ejecutar: npm run dev
4. Esperar a que compile completamente
```

## 🎯 PASO 2: Abrir Navegador en Modo Incógnito

```
1. Ctrl + Shift + N (Chrome/Edge) o Ctrl + Shift + P (Firefox)
2. Ir a: http://localhost:9002
3. Navegar a: Clases / Activities
4. Seleccionar fecha: 10 de noviembre
```

## 🎯 PASO 3: Abrir Consola del Navegador

```
1. Presionar F12
2. Ir a pestaña "Consola" / "Console"
3. Buscar mensajes que empiecen con:
   - 🏟️ ClassCard DEBUG
   - 📥 API returned slots
```

## 📊 QUÉ BUSCAR EN LA CONSOLA

### ✅ Si funciona correctamente verás:

```
📥 API returned slots: 134
📝 First slot completo: {courtsAvailability: Array(4), ...}
🏟️ First slot tiene courtsAvailability? true
🏟️ First slot availableCourtsCount: 4

🏟️ ClassCard DEBUG:
  - courtsAvailability: (4) [{…}, {…}, {…}, {…}]
  - tipo: object
  - es Array?: true
  - availableCourtsCount: 4
✅ courtsAvailability válido con 4 pistas
```

### ❌ Si hay problema verás:

```
📥 API returned slots: 134
🏟️ First slot tiene courtsAvailability? undefined
⚠️ courtsAvailability es null/undefined
```

## 🔍 PASO 4: Debug Manual en Consola

Copia y pega este código en la consola del navegador:

```javascript
fetch('/api/timeslots?clubId=padel-estrella-madrid&date=2025-11-10&_t=' + Date.now(), {
  cache: 'no-store'
})
.then(r => r.json())
.then(data => {
  console.log('Total slots:', data.length);
  console.log('Primer slot courtsAvailability:', data[0]?.courtsAvailability);
  console.log('Es array?', Array.isArray(data[0]?.courtsAvailability));
})
```

**Resultado esperado:**
```
Total slots: 134
Primer slot courtsAvailability: (4) [{courtNumber: 1, status: "available"}, ...]
Es array? true
```

## ⚠️ PROBLEMAS COMUNES

### Problema 1: "courtsAvailability es undefined"

**Causa:** El servidor no se ha reiniciado
**Solución:** Reiniciar servidor (Paso 1)

### Problema 2: "courtsAvailability NO es un array"

**Causa:** Tipo de datos incorrecto en API
**Solución:** Ejecutar:
```bash
node test-browser-perspective.js
```
Si muestra datos correctos, el problema es caché.

### Problema 3: "Cargando..." aparece aunque courtsAvailability existe

**Causa:** Componente React no se actualiza
**Solución:** 
1. Verificar que no hay errores TypeScript: `npm run build`
2. Limpiar `.next` folder: `rm -rf .next`
3. Reiniciar servidor

### Problema 4: Los logs no aparecen en consola

**Causa:** Los componentes no se están renderizando
**Solución:** Verificar que estás en la página correcta:
- URL debe ser: `localhost:9002/activities?view=classes`
- Debe haber tarjetas visibles en pantalla

## 🎯 RESULTADO ESPERADO EN PANTALLA

### En cada tarjeta debería aparecer:

```
┌──────────────────────────────┐
│ Carlos Martinez - 09:00      │
│ ⭐ Intermedio                │
│                              │
│ [Opciones de reserva 1-4]    │
│                              │
│ Estado de pistas (4 disp.):  │
│ 🟢 🟢 🟢 🟢                  │
└──────────────────────────────┘
```

### NO debería aparecer:

```
Estado de pistas (0 disponibles):
Cargando disponibilidad...
```

## 🚀 SOLUCIÓN RÁPIDA SI NADA FUNCIONA

```powershell
# 1. Detener servidor
Ctrl + C

# 2. Limpiar caché de Next.js
Remove-Item -Recurse -Force .next

# 3. Limpiar node_modules/.cache (si existe)
Remove-Item -Recurse -Force node_modules/.cache

# 4. Reiniciar servidor
npm run dev

# 5. Abrir en incógnito
# Chrome: Ctrl + Shift + N
# URL: http://localhost:9002/activities?view=classes
```

## 📝 INFORMACIÓN PARA REPORTAR

Si después de todos los pasos sigue sin funcionar, reporta:

1. **Mensaje en consola del navegador** (copia completa)
2. **Screenshot de una tarjeta**
3. **Resultado del comando:**
   ```bash
   node test-browser-perspective.js
   ```
4. **Salida del servidor** (últimas 20 líneas después de cargar la página)

---

## ✅ CHECKLIST

- [ ] Servidor reiniciado con `npm run dev`
- [ ] Navegador en modo incógnito
- [ ] URL correcta: `/activities?view=classes`
- [ ] Fecha seleccionada: 10 de noviembre
- [ ] Consola F12 abierta
- [ ] Logs de debug visibles
- [ ] Test manual ejecutado en consola
