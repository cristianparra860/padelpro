// TEST: Verificar lógica de bloqueo
// Si hay clase 9:00-10:00, verificar qué slots quedan bloqueados

const slotTests = [
  { time: '08:00', expected: 'LIBRE' },
  { time: '08:30', expected: 'BLOQUEADO (30min antes)' },
  { time: '09:00', expected: 'BLOQUEADO (ocupado)' },
  { time: '09:30', expected: 'BLOQUEADO (ocupado)' },
  { time: '10:00', expected: 'LIBRE' },
  { time: '10:30', expected: 'LIBRE' }
];

// Clase confirmada: 9:00-10:00
const clsStart = new Date('2025-11-07T09:00:00');
const clsEnd = new Date('2025-11-07T10:00:00');

console.log('🧪 TEST: Clase confirmada de 9:00 a 10:00\n');

slotTests.forEach(test => {
  const [hour, minute] = test.time.split(':');
  const slotStart = new Date('2025-11-07');
  slotStart.setHours(parseInt(hour), parseInt(minute), 0, 0);
  
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 60);
  
  // VERIFICAR SOLAPAMIENTO
  const wouldOverlap = slotStart < clsEnd && slotEnd > clsStart;
  
  // VERIFICAR 30MIN ANTES
  const timeDiff = clsStart.getTime() - slotStart.getTime();
  const is30MinutesBefore = timeDiff === 30 * 60 * 1000;
  
  const isBlocked = wouldOverlap || is30MinutesBefore;
  const result = isBlocked ? '❌ BLOQUEADO' : '✅ LIBRE';
  const reason = wouldOverlap ? '(solapa)' : is30MinutesBefore ? '(30min antes)' : '';
  
  console.log(`${test.time}: ${result} ${reason}`);
  console.log(`   - slotStart: ${slotStart.toLocaleTimeString()}, slotEnd: ${slotEnd.toLocaleTimeString()}`);
  console.log(`   - wouldOverlap: ${wouldOverlap}, is30MinBefore: ${is30MinutesBefore}`);
  console.log(`   - Esperado: ${test.expected}\n`);
});
