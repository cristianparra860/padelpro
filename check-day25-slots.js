import { prisma } from './src/lib/prisma.ts';

async function checkDay25Slots() {
  try {
    console.log('🔍 REVISANDO TIMESLOTS DEL 25 DE NOVIEMBRE 2025\n');
    
    // Fecha para el 25 de noviembre 2025
    const day25Start = new Date('2025-11-25T00:00:00.000Z').getTime();
    const day25End = new Date('2025-11-25T23:59:59.999Z').getTime();
    
    console.log(`📅 Rango: ${new Date(day25Start).toISOString()} - ${new Date(day25End).toISOString()}\n`);
    
    // Usar raw SQL para filtrar por timestamps
    const slots = await prisma.$queryRawUnsafe(`
      SELECT 
        ts.*,
        i.name as instructorName,
        i.id as instructorId
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start >= ? AND ts.start <= ?
      ORDER BY ts.start ASC
    `, day25Start, day25End);
    
    const totalSlots = slots.length;
    
    console.log(`📊 Total TimeSlots día 25: ${totalSlots}\n`);
    
    // Obtener bookings para estos slots
    const slotIds = slots.map(s => s.id);
    const bookings = slotIds.length > 0 ? await prisma.booking.findMany({
      where: {
        timeSlotId: { in: slotIds }
      }
    }) : [];
    
    console.log('📋 DETALLE DE TIMESLOTS:\n');
    
    const slotsByHour = {};
    
    slots.forEach(slot => {
      const date = new Date(Number(slot.start));
      const time = date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Madrid'
      });
      
      if (!slotsByHour[time]) {
        slotsByHour[time] = [];
      }
      
      const slotBookings = bookings.filter(b => b.timeSlotId === slot.id);
      
      slotsByHour[time].push({
        instructor: slot.instructorName || 'SIN INSTRUCTOR',
        level: slot.level,
        gender: slot.genderCategory,
        court: slot.courtId ? `Pista ${slot.courtNumber}` : 'PROPUESTA',
        bookings: slotBookings.length,
        allowedCounts: slot.allowedPlayerCounts
      });
    });
    
    Object.keys(slotsByHour).sort().forEach(time => {
      console.log(`⏰ ${time}:`);
      slotsByHour[time].forEach(s => {
        console.log(`   ${s.instructor} | ${s.level} | ${s.gender} | ${s.court} | ${s.bookings} reservas | Permite: ${s.allowedCounts}`);
      });
      console.log('');
    });
    
    // Verificar qué horas faltan
    console.log('🔍 VERIFICANDO COBERTURA HORARIA (7:00 - 22:00):\n');
    
    const expectedHours = [];
    for (let h = 7; h <= 21; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        expectedHours.push(time);
      }
    }
    
    const existingHours = Object.keys(slotsByHour);
    const missingHours = expectedHours.filter(h => !existingHours.includes(h));
    
    if (missingHours.length > 0) {
      console.log('❌ HORAS FALTANTES:');
      missingHours.forEach(h => console.log(`   ${h}`));
      console.log(`\nTotal horas faltantes: ${missingHours.length}`);
    } else {
      console.log('✅ Todas las horas cubiertas');
    }
    
    // Contar instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`\n👨‍🏫 Instructores activos: ${instructors.length}`);
    instructors.forEach(i => {
      const slotsCount = slots.filter(s => s.instructorId === i.id).length;
      console.log(`   ${i.name}: ${slotsCount} slots`);
    });
    
    // Calcular cuántos deberían haber
    const hoursPerDay = (22 - 7) * 2; // 7:00 a 22:00, cada 30min
    const expectedTotal = hoursPerDay * instructors.length;
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Slots esperados: ${expectedTotal} (${hoursPerDay} intervalos × ${instructors.length} instructores)`);
    console.log(`   Slots encontrados: ${totalSlots}`);
    console.log(`   Diferencia: ${expectedTotal - totalSlots} slots faltantes`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDay25Slots();
