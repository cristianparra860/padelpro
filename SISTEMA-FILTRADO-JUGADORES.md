# Sistema de Filtrado por Número de Jugadores - Panel de Clases

## 🎯 Funcionalidad Implementada

Se ha implementado un sistema de pestañas que permite filtrar las clases y sus opciones de inscripción según el número de jugadores deseado.

## ✨ Características

### 1. **Pestañas de Filtrado Interactivas**
- 4 pestañas para filtrar por: 1, 2, 3, o 4 jugadores
- Cada pestaña muestra:
  - **Icono representativo**: 👤 (1), 👥 (2), 👨‍👨‍👦 (3), 👨‍👩‍👧‍👦 (4)
  - **Etiqueta clara**: "Individual" o "X Jugadores"
  - **Contador**: Número de clases disponibles para esa modalidad
- Diseño visual atractivo con:
  - Estado activo: Fondo azul con texto blanco
  - Estado inactivo: Fondo gris claro
  - Transiciones suaves al activar/desactivar

### 2. **Filtrado Múltiple**
- El usuario puede **activar/desactivar** cualquier combinación de pestañas
- Ejemplos de uso:
  - Activar solo "1 Jugador" → Ver solo clases individuales
  - Activar "2 Jugadores" y "4 Jugadores" → Ver solo esas opciones
  - Activar todas → Ver todas las modalidades (comportamiento por defecto)
  - Desactivar todas → Muestra advertencia de que no hay filtros activos

### 3. **Botón "Seleccionar/Deseleccionar Todas"**
- Permite activar o desactivar todas las pestañas con un solo clic
- Ubicado en la esquina superior derecha del panel de filtros

### 4. **Filtrado de Tarjetas**
- Las tarjetas de clase se filtran según las pestañas activas
- Solo se muestran las clases que coinciden con al menos una pestaña activa

### 5. **Filtrado de Opciones de Inscripción**
- **Dentro de cada tarjeta**, solo se muestran las opciones de inscripción correspondientes a los filtros activos
- Por ejemplo:
  - Si solo está activa la pestaña "2 Jugadores":
    - Se muestran solo las clases que permiten 2 jugadores
    - Dentro de cada tarjeta, solo aparece la opción de inscribirse con 2 jugadores
  - Si están activas "1 Jugador" y "4 Jugadores":
    - Se muestran las clases compatibles
    - Cada tarjeta solo muestra las opciones de 1 y 4 jugadores

## 📊 Contador Dinámico
- El contador "X clases → Y mostradas" se actualiza en tiempo real
- Muestra:
  - Total de clases cargadas desde la API
  - Número de clases visibles después de aplicar filtros

## 🎨 Interfaz de Usuario

### Panel de Filtros
```
🎯 Filtrar por número de jugadores     [Seleccionar todas / Deseleccionar todas]

[👤 Individual (15)] [👥 2 Jugadores (23)] [👨‍👨‍👦 3 Jugadores (18)] [👨‍👩‍👧‍👦 4 Jugadores (30)]
```

### Advertencia cuando no hay filtros
Si el usuario desactiva todas las pestañas, se muestra:
```
⚠️ Selecciona al menos un tipo de clase para ver las opciones disponibles
```

## 🔧 Archivos Modificados

### 1. **ClassesDisplay.tsx**
- Estado para filtros activos: `activePlayerFilters`
- Función `togglePlayerFilter()`: Alterna el estado de cada filtro
- Función `getFilteredSlots()`: Filtra clases según filtros activos
- Panel de pestañas de filtrado con diseño visual
- Pasa `allowedPlayerCounts` a las tarjetas de clase

### 2. **ClassCardReal.tsx**
- Nueva prop: `allowedPlayerCounts?: number[]`
- Filtrado de opciones de inscripción: `.filter(players => allowedPlayerCounts.includes(players))`
- Solo muestra botones de reserva para los números de jugadores permitidos

### 3. **ClassCardPremium.tsx**
- Nueva prop: `allowedPlayerCounts?: number[]`
- Filtrado de espacios de inscripción individual
- Adapta el sistema de inscripciones según filtros activos

## 🎮 Flujo de Usuario

1. Usuario accede al panel de clases
2. Ve todas las clases por defecto (4 filtros activos)
3. Hace clic en una pestaña para desactivarla (ej: "4 Jugadores")
4. Las tarjetas se actualizan inmediatamente:
   - Se ocultan las clases que solo permiten 4 jugadores
   - Las clases restantes solo muestran opciones de 1, 2, 3 jugadores
5. Puede activar/desactivar cualquier combinación de filtros
6. El contador muestra cuántas clases están visibles

## 💡 Casos de Uso

### Caso 1: Buscar Clase Individual
1. Desactivar todas las pestañas excepto "👤 Individual"
2. Solo se muestran clases con opción de 1 jugador
3. Cada tarjeta solo muestra la opción de reserva individual

### Caso 2: Comparar Precios para 2 y 4 Jugadores
1. Activar solo "👥 2 Jugadores" y "👨‍👩‍👧‍👦 4 Jugadores"
2. Ver lado a lado las opciones disponibles
3. Comparar precios y disponibilidad

### Caso 3: Ver Todo
1. Clic en "Seleccionar todas"
2. Ver todas las opciones disponibles
3. Cada tarjeta muestra las 4 modalidades de inscripción

## 🔄 Estado Inicial
Por defecto, al cargar la página:
- **Todas las pestañas están activas** (Set([1, 2, 3, 4]))
- Se muestran todas las clases y todas las opciones de inscripción
- El usuario puede personalizar según sus preferencias

## 🚀 Mejoras Futuras Posibles
- Guardar preferencias de filtrado en localStorage
- Añadir animaciones al cambiar de filtro
- Mostrar tooltip con información adicional en cada pestaña
- Añadir filtros adicionales (nivel, precio, horario)
- Permitir ordenar por precio, disponibilidad, etc.
