# INSTRUCCIONES DE VERIFICACIÓN - Plazas con Puntos

## ✅ VERIFICACIONES COMPLETADAS

1. **Base de datos**: ✅ El slot `ts-1764308189412-z9y4veby1rd` tiene `creditsSlots: [2]`
2. **Parsing**: ✅ El endpoint batch parsea correctamente a array `[2]`
3. **Lógica**: ✅ `isCreditsSlot` evalúa correctamente (true para modalidad 2)
4. **Servidor**: ✅ Corriendo en http://localhost:9002

## 🔍 DIAGNÓSTICO ACTUAL

El servidor NO está recibiendo peticiones del navegador. Esto sugiere:
- El navegador no está en la página correcta
- O hay un error JavaScript que impide las peticiones

## 📋 PASOS DE VERIFICACIÓN MANUAL

### Paso 1: Abrir la página correcta
1. Abre en el navegador: **http://localhost:9002**
2. Asegúrate de que cargas la sección "Clases" (en el menú lateral)
3. La URL debería ser: `http://localhost:9002/activities?view=clases`

### Paso 2: Forzar recarga sin caché
1. Presiona **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R** (Mac)
2. O abre DevTools (F12) → Haz clic derecho en el botón reload → "Empty Cache and Hard Reload"

### Paso 3: Verificar en la consola del navegador
1. Abre DevTools: **F12**
2. Ve a la pestaña **Console**
3. Busca estos logs:

```
🎁 Cargados creditsSlots para X slots: {...}
   ✨ Slot Cristian Parra encontrado: { id: "...", creditsSlots: [2] }
🔄 ClassCard ... Sincronizando creditsSlots
🐛 DEBUG slot ts-1764308189... : { players: 2, isCreditsSlot: true, ... }
```

### Paso 4: Verificar en la pestaña Network
1. En DevTools, ve a **Network**
2. Filtra por: `/api/timeslots`
3. Deberías ver:
   - `GET /api/timeslots?...` → Carga las clases
   - `POST /api/timeslots/credits-slots-batch` → Carga los creditsSlots

4. Haz clic en `credits-slots-batch` y revisa:
   - **Request Payload**: `{ "slotIds": ["ts-...", "ts-...", ...] }`
   - **Response**: `{ "ts-1764308189412-z9y4veby1rd": [2], ... }`

### Paso 5: Verificar visualmente
1. Busca la clase de **Cristian Parra a las 9:00h del 2 de diciembre**
2. Mira la modalidad de **2 jugadores**
3. Debería verse:
   - 🎁 **Círculos con fondo ámbar brillante** (no blanco)
   - **Borde sólido dorado** (no discontinuo verde)
   - **Icono de regalo** dentro (no "+")
   - **Texto "50p"** debajo en color ámbar
   - **Distintivo dorado "🎁 Puntos"** a la derecha (no "€ X.XX")

## ❌ SI NO FUNCIONA

### Si no ves el log "🎁 Cargados creditsSlots":
- El componente `ClassesDisplay` no se está montando
- O hay un error anterior que impide la ejecución
- Busca errores en rojo en la consola

### Si ves el log pero no el visual:
- El prop no llega a `ClassCardReal`
- Busca el log "🔄 ClassCard ... Sincronizando"
- Si no aparece, el problema está en pasar el prop

### Si ves "Sincronizando" pero no "🐛 DEBUG slot":
- La clase de Cristian Parra no está en la lista
- Verifica que la fecha sea 2 de diciembre 2025
- Verifica que estés viendo el club correcto

### Si ves todos los logs pero no el visual:
- Problema en el CSS o renderizado
- Verifica que `isCreditsSlot` sea `true` en el log DEBUG
- Si es true pero no se ve, el CSS no se está aplicando

## 🛠️ COMANDOS ÚTILES

### Verificar datos en base de datos:
```powershell
node test-batch-endpoint.js
```

### Simular flujo completo:
```powershell
node simulate-full-flow.js
```

### Ver slots de Cristian Parra:
```powershell
node find-cristian-slots.js
```

## 📞 QUÉ REPORTAR

Si nada funciona, reporta:
1. ¿Qué URL estás viendo en el navegador?
2. ¿Qué logs ves en la consola del navegador (F12 → Console)?
3. ¿Qué peticiones ves en Network (F12 → Network)?
4. ¿Hay algún error en rojo en la consola?
5. Screenshot de la tarjeta de Cristian Parra a las 9:00h
