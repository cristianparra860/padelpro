import { prisma } from './src/lib/prisma.ts';

async function checkTimeSlotsDay25() {
  try {
    console.log('🔍 ANÁLISIS DETALLADO - TimeSlots 25 Nov 2024\n');
    
    // Fecha exacta: 25 de noviembre de 2024
    const targetDate = new Date('2024-11-25T00:00:00.000Z');
    const startDay = targetDate.getTime();
    const endDay = new Date('2024-11-25T23:59:59.999Z').getTime();
    
    console.log(`📅 Buscando TimeSlots para: ${targetDate.toLocaleDateString()}`);
    console.log(`   Timestamp inicio: ${startDay}`);
    console.log(`   Timestamp fin: ${endDay}\n`);
    
    // 1. Contar total de TimeSlots para ese día
    const allSlots = await prisma.$queryRawUnsafe(`
      SELECT * FROM TimeSlot 
      WHERE start >= ? AND start <= ?
      ORDER BY start ASC
    `, startDay, endDay);
    
    console.log(`📊 TOTAL TimeSlots día 25: ${allSlots.length}\n`);
    
    // 2. Agrupar por estado (courtId null vs asignado)
    const proposals = allSlots.filter(s => s.courtId === null);
    const confirmed = allSlots.filter(s => s.courtId !== null);
    
    console.log(`🟠 PROPUESTAS (courtId = NULL): ${proposals.length}`);
    console.log(`🔵 CONFIRMADOS (courtId asignado): ${confirmed.length}\n`);
    
    // 3. Agrupar por instructor
    const byInstructor = {};
    for (const slot of allSlots) {
      const instructorId = slot.instructorId;
      if (!byInstructor[instructorId]) {
        byInstructor[instructorId] = [];
      }
      byInstructor[instructorId].push(slot);
    }
    
    console.log('👨‍🏫 POR INSTRUCTOR:');
    for (const [instructorId, slots] of Object.entries(byInstructor)) {
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId }
      });
      console.log(`   ${instructor?.name || 'Unknown'}: ${slots.length} slots`);
    }
    
    // 4. Agrupar por hora
    console.log('\n🕐 POR HORA:');
    const byHour = {};
    for (const slot of allSlots) {
      const date = new Date(slot.start);
      const hour = date.getUTCHours();
      if (!byHour[hour]) {
        byHour[hour] = 0;
      }
      byHour[hour]++;
    }
    
    for (let hour = 7; hour <= 22; hour++) {
      const count = byHour[hour] || 0;
      const hourStr = hour.toString().padStart(2, '0');
      console.log(`   ${hourStr}:00 - ${count} slots ${count < 5 ? '❌ FALTAN' : '✅'}`);
    }
    
    // 5. Revisar rango esperado
    console.log('\n📐 RANGO ESPERADO:');
    console.log('   Horario: 07:00 - 22:00');
    console.log('   Intervalos: 30 minutos');
    console.log('   Slots por hora: 2 (07:00 y 07:30)');
    console.log('   Horas: 15 horas (7am a 10pm)');
    console.log('   Instructores: 5');
    console.log('   TOTAL ESPERADO: 15 horas × 2 slots × 5 instructores = 150 slots');
    console.log(`   TOTAL REAL: ${allSlots.length} slots`);
    
    if (allSlots.length < 150) {
      console.log(`\n⚠️ FALTAN ${150 - allSlots.length} TIMESLOTS`);
    }
    
    // 6. Ver algunos ejemplos de TimeSlots existentes
    console.log('\n📋 EJEMPLOS (primeros 10):');
    for (let i = 0; i < Math.min(10, allSlots.length); i++) {
      const slot = allSlots[i];
      const instructor = await prisma.instructor.findUnique({
        where: { id: slot.instructorId }
      });
      const date = new Date(slot.start);
      const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
      console.log(`   ${time} | ${instructor?.name || 'Unknown'} | ${slot.level} | Court: ${slot.courtId || 'NULL'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeSlotsDay25();
