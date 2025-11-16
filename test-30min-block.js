// TEST: Verificar que solo se bloquea 1 slot de 30min antes

const date = new Date('2025-11-12T00:00:00');

// Clase confirmada: 15:00-16:00
const clsStart = new Date('2025-11-12T15:00:00');
const clsEnd = new Date('2025-11-12T16:00:00');

console.log('🧪 TEST: Clase confirmada 15:00-16:00');
console.log('¿Cuántos slots de 30min ANTES se bloquean?\n');

const testSlots = ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

let blockedCount = 0;
let blockedBefore = [];

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
  
  console.log(`${time}: ${blocked ? '❌' : '✅'}`);
  
  if (blocked && slotStart < clsStart) {
    blockedCount++;
    blockedBefore.push(time);
    console.log(`   → Bloqueado ANTES de la clase (timeDiff: ${timeDiff / 60000} min)`);
    if (is30MinBefore) console.log(`   → Razón: is30MinBefore = true`);
    if (wouldOverlap) console.log(`   → Razón: wouldOverlap = true`);
  }
});

console.log(`\n📊 RESUMEN:`);
console.log(`   Slots bloqueados ANTES de la clase: ${blockedCount}`);
console.log(`   Slots: ${blockedBefore.join(', ')}`);
console.log(`   ✅ CORRECTO: ${blockedCount === 1 ? 'SÍ - Solo 1 slot bloqueado' : 'NO - Deberían ser solo 1'}`);
