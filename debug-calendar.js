// Script de depuración para el calendario del club
// Ejecutar en la consola del navegador mientras estás en la página del calendario

console.log('🔍 Iniciando depuración del calendario...');

// Verificar si React DevTools está disponible
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools detectado');
}

// Buscar el componente del calendario en el DOM
const calendarContainer = document.querySelector('[class*="calendar"]');
console.log('📍 Contenedor del calendario:', calendarContainer);

// Verificar si hay tablas de calendario
const tables = document.querySelectorAll('table');
console.log(`📊 Tablas encontradas: ${tables.length}`);
tables.forEach((table, i) => {
  const rows = table.querySelectorAll('tr');
  console.log(`  Tabla ${i+1}: ${rows.length} filas`);
});

// Verificar celdas con datos
const cells = document.querySelectorAll('td');
console.log(`📦 Celdas TD encontradas: ${cells.length}`);

// Buscar elementos de propuestas
const proposals = document.querySelectorAll('[class*="proposal"], [class*="bg-blue"], [class*="bg-green"]');
console.log(`🎯 Elementos con estilos de propuesta: ${proposals.length}`);

// Verificar si hay errores en consola
console.log('⚠️ Revisa si hay errores en rojo arriba de este mensaje');

// Verificar llamadas a API
console.log('🌐 Para ver las llamadas API, abre la pestaña Network en DevTools');
