// Script para verificar el estado del calendario en el navegador
// Pegar esto en la consola del navegador en la página del calendario

console.clear();
console.log('🔍 Verificando estado del calendario...\n');

// Verificar si hay elementos con propuestas
const proposalCells = document.querySelectorAll('[class*="bg-orange"]');
console.log('🎨 Elementos naranjas encontrados:', proposalCells.length);

// Verificar checkboxes de filtros
const classesCheckbox = document.querySelector('input[type="checkbox"]');
console.log('\n✅ Estado de filtros:');
const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
allCheckboxes.forEach((cb, i) => {
  const label = cb.parentElement?.textContent || `Checkbox ${i}`;
  console.log(`   ${label}: ${cb.checked ? 'ACTIVO ✓' : 'INACTIVO ✗'}`);
});

// Verificar fila de "Clases Propuestas"
console.log('\n📋 Buscando fila "Clases Propuestas"...');
const allRows = document.querySelectorAll('[role="row"], .grid-row, [class*="grid"]');
let foundVirtualRow = false;
allRows.forEach(row => {
  const text = row.textContent;
  if (text && text.includes('Clases Propuestas')) {
    foundVirtualRow = true;
    console.log('   ✅ Fila encontrada:', row);
    console.log('   Contenido:', text.substring(0, 200));
  }
});
if (!foundVirtualRow) {
  console.log('   ❌ No se encontró la fila "Clases Propuestas"');
}

console.log('\n💡 Instrucciones:');
console.log('   1. Busca en la consola los logs: 📊, 🗓️, 📦');
console.log('   2. Verifica que el checkbox "Clases Propuestas" esté ACTIVO');
console.log('   3. Si no ves propuestas, copia TODOS los logs y envíamelos');
