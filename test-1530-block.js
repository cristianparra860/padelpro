// TEST: Verificar bloqueo con clase a las 15:30

const date = new Date('2025-11-14T00:00:00');

// Clase confirmada: 15:30-16:30
const clsStart = new Date('2025-11-14T15:30:00');
const clsEnd = new Date('2025-11-14T16:30:00');

console.log('🧪 TEST: Clase confirmada 15:30-16:30');
console.log('¿Qué slots se bloquean?\n');

const testSlots = ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

testSlots.forEach(time => {
  const [hour, minute] = time.split(':');
  const slotStart = new Date(date);
  slotStart.setHours(parseInt(hour), parseInt(minute), 0, 0);
  
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 60);
  
  // LÓGICA ACTUAL
  const timeDiff = clsStart.getTime() - slotStart.getTime();
  const is30MinBefore = timeDiff === 30 * 60 * 1000;
  const wouldOverlap = slotEnd > clsStart && slotStart < clsEnd;
  
  const blocked = is30MinBefore || wouldOverlap;
  
  console.log(`${time}: ${blocked ? '❌ BLOQUEADO' : '✅ LIBRE'}`);
  
  if (blocked) {
    console.log(`   Nueva clase sería: ${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()}`);
    console.log(`   Clase existente: ${clsStart.toLocaleTimeString()} - ${clsEnd.toLocaleTimeString()}`);
    if (is30MinBefore) console.log(`   ✓ is30MinBefore = true (${timeDiff / 60000} min antes)`);
    if (wouldOverlap) console.log(`   ✓ wouldOverlap = true`);
    console.log('');
  }
});

console.log('\n📊 RESULTADO ESPERADO:');
console.log('   15:00 → ❌ BLOQUEADO (30min antes)');
console.log('   15:30 → ❌ BLOQUEADO (clase confirmada)');
console.log('   16:00 → ❌ BLOQUEADO (solapa)');
console.log('   14:30 y anteriores → ✅ LIBRES');
