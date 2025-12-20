# Verificación Manual del Sistema de Reciclaje

## ✅ Cambios Realizados

Se han realizado los siguientes cambios para que las plazas recicladas se muestren como **círculos amarillos vacíos**:

### 1. ClassesDisplay.tsx
- ✅ Se agregaron los campos `hasRecycledSlots`, `availableRecycledSlots` y `recycledSlotsOnlyPoints` al objeto que se pasa al componente ClassCardReal

### 2. ClassCardReal.tsx  
- ✅ Se modificó `effectiveCreditsSlots` para incluir automáticamente los índices de las plazas recicladas
- ✅ Se filtran los bookings CANCELLED para que NO aparezcan como círculos ocupados
- ✅ Los círculos vacíos en posiciones recicladas se muestran con:
  - Borde amarillo grueso (border-4 border-yellow-400)
  - Fondo ámbar (bg-amber-50)
  - Sombra amarilla brillante
  - Icono 🎁
  - Texto con el coste en puntos

## 🔍 Cómo Verificar

### Paso 1: Limpiar Caché del Navegador
1. Presiona **Ctrl + Shift + R** (Windows/Linux) o **Cmd + Shift + R** (Mac)
2. O bien: 
   - Abre DevTools (F12)
   - Click derecho en el botón de recarga del navegador
   - Selecciona **"Vaciar caché y volver a cargar de manera forzada"**

### Paso 2: Abrir Consola del Navegador
1. Presiona **F12** para abrir DevTools
2. Ve a la pestaña **Console**
3. Navega al día **28 de diciembre 2025**

### Paso 3: Buscar Logs de Reciclaje
En la consola deberías ver:

```
♻️ Modalidad reciclada detectada: {
  groupSize: 2,
  startIndex: 1,
  endIndex: 3,
  indicesAgregados: [1, 2]
}
```

Este log confirma que el código está detectando correctamente las plazas recicladas.

### Paso 4: Verificar Visual
En la clase de **Carlos Martinez** a las **09:00**, modalidad de **2 jugadores**, deberías ver:

#### ✅ Comportamiento Esperado:
- **2 círculos amarillos** con borde grueso
- Icono **🎁** en cada círculo
- Texto debajo: **"12.5p"** o **"13p"** (puntos necesarios)
- Sombra amarilla brillante alrededor de los círculos
- El precio total muestra: **"🎁 13 Puntos"** o **"Todas con puntos"**

#### ❌ Comportamiento Incorrecto (bug):
- Círculos verdes con borde punteado
- Texto "Libre" en lugar de puntos
- Sin icono 🎁
- Sin sombra amarilla

## 🐛 Si No Funciona

Si después de limpiar caché NO ves los círculos amarillos:

1. **Verifica que el log aparezca en consola**
   - Si NO aparece el log "♻️ Modalidad reciclada detectada", el código no se actualizó
   - Reinicia el servidor: `Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force; npm run dev`

2. **Verifica que los datos lleguen**
   - En la consola del navegador, busca: `"🔍 ClassCardReal MONTADO:"`
   - Verifica que tenga: `hasRecycledSlots: true, availableRecycledSlots: 2`

3. **Hard Refresh Multiple**
   - Cierra todas las pestañas del sitio
   - Cierra y vuelve a abrir el navegador completamente
   - Navega a `http://localhost:9002/activities?view=clases&date=2025-12-28`

## 📊 Datos de Prueba

Se crearon clases de prueba el **28 de diciembre 2025**:

| Hora  | Instructor      | Pista | Estado              |
|-------|-----------------|-------|---------------------|
| 09:00 | Carlos Martinez | 1     | ♻️ 2 plazas recicladas (2p) |
| 10:00 | Ana Lopez       | 2     | Sin reciclaje       |
| 11:00 | Alex García     | 3     | Sin reciclaje       |

La primera clase (09:00 Carlos Martinez) debe mostrar **círculos amarillos** en la modalidad de 2 jugadores.

## 🔧 Comandos Útiles

```powershell
# Reiniciar servidor
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force; npm run dev

# Verificar datos en DB
node check-dec28-api.js

# Ver estado del servidor
Test-NetConnection -ComputerName localhost -Port 9002
```

## ✅ Confirmación de Éxito

Cuando funcione correctamente, verás:
1. ✅ Círculos amarillos con borde grueso en modalidad 2 jugadores
2. ✅ Icono 🎁 dentro de los círculos vacíos
3. ✅ Texto "12.5p" o "13p" debajo de cada círculo
4. ✅ Badge de precio total: "🎁 13 Puntos - Todas con puntos"
5. ✅ Sombra amarilla brillante alrededor de los círculos

---

**Nota**: El servidor debe estar corriendo en `http://localhost:9002`. Si no responde, ejecuta `npm run dev` en una terminal.
