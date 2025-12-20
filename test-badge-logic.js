// Test: ¿Por qué no se muestra el badge?

const testData = {
  hasRecycledSlots: true,
  availableRecycledSlots: 3,
  recycledSlotsOnlyPoints: true
};

console.log('📊 Datos de prueba:', testData);
console.log('');

// Esta es la condición exacta del código
const shouldShowBadge = testData.hasRecycledSlots && testData.availableRecycledSlots && testData.availableRecycledSlots > 0;

console.log('🔍 Evaluación de shouldShowBadge:');
console.log('  hasRecycledSlots:', testData.hasRecycledSlots, '→', !!testData.hasRecycledSlots);
console.log('  availableRecycledSlots:', testData.availableRecycledSlots, '→', !!testData.availableRecycledSlots);
console.log('  availableRecycledSlots > 0:', testData.availableRecycledSlots > 0);
console.log('');
console.log('  shouldShowBadge =', shouldShowBadge);
console.log('');

if (!shouldShowBadge) {
  console.log('❌ Badge NO se mostrará');
  console.log('Razón:', 
    !testData.hasRecycledSlots ? 'hasRecycledSlots es falsy' :
    !testData.availableRecycledSlots ? 'availableRecycledSlots es falsy' :
    testData.availableRecycledSlots <= 0 ? 'availableRecycledSlots <= 0' :
    'Condición desconocida'
  );
} else {
  console.log('✅ Badge SÍ se mostrará');
}
