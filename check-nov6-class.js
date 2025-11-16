const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNov6Class() {
  console.log('🔍 Verificando clase del 6 de noviembre a las 10:00\n');
  
  // Nov 6, 2025 10:00 AM (timestamp)
  const startTime = new Date('2025-11-06T10:00:00').getTime();
  const endTime = startTime + 24 * 60 * 60 * 1000; // +24 horas
  
  console.log('📅 Buscando slots entre:', new Date(startTime).toISOString());
  
  // Buscar TimeSlots del 6 de noviembre
  const slots = await prisma.$queryRaw`
    SELECT id, start, end, courtId, courtNumber, genderCategory, level
    FROM TimeSlot 
    WHERE start >= ${startTime} AND start < ${endTime}
    ORDER BY start
    LIMIT 10
  `;
  
  console.log(`\n📊 Encontrados ${slots.length} TimeSlots:`);
  slots.forEach(slot => {
    console.log(`  - ID: ${slot.id}`);
    console.log(`    Hora: ${new Date(Number(slot.start)).toLocaleString()}`);
    console.log(`    Pista: ${slot.courtNumber || 'SIN ASIGNAR'} (courtId: ${slot.courtId || 'NULL'})`);
    console.log(`    Categoría: ${slot.genderCategory || 'SIN CATEGORÍA'}`);
    console.log(`    Nivel: ${slot.level}`);
  });
  
  // Buscar reservas para estos slots
  const slotIds = slots.map(s => s.id);
  
  if (slotIds.length > 0) {
    const bookings = await prisma.$queryRaw`
      SELECT b.id, b.timeSlotId, b.userId, b.groupSize, b.status, u.name
      FROM Booking b
      JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId IN (${slotIds.join(',')})
      ORDER BY b.timeSlotId, b.createdAt
    `;
    
    console.log(`\n📚 Encontradas ${bookings.length} reservas:`);
    bookings.forEach(booking => {
      const slot = slots.find(s => s.id === booking.timeSlotId);
      console.log(`  - Reserva ID: ${booking.id}`);
      console.log(`    Usuario: ${booking.name}`);
      console.log(`    TimeSlot: ${booking.timeSlotId} (${new Date(Number(slot?.start)).toLocaleTimeString()})`);
      console.log(`    Tamaño grupo: ${booking.groupSize} jugador(es)`);
      console.log(`    Estado: ${booking.status}`);
    });
    
    // Analizar si alguna opción está completa
    console.log('\n🎯 Análisis de grupos completos:');
    slotIds.forEach(slotId => {
      const slotBookings = bookings.filter(b => b.timeSlotId === slotId && b.status === 'confirmed');
      const slot = slots.find(s => s.id === slotId);
      
      if (slotBookings.length > 0) {
        console.log(`\n  TimeSlot ${slotId} (${new Date(Number(slot?.start)).toLocaleTimeString()}):`);
        console.log(`    Total reservas confirmadas: ${slotBookings.length}`);
        
        // Agrupar por groupSize
        const byGroupSize = {};
        slotBookings.forEach(b => {
          if (!byGroupSize[b.groupSize]) byGroupSize[b.groupSize] = [];
          byGroupSize[b.groupSize].push(b);
        });
        
        Object.entries(byGroupSize).forEach(([size, bookings]) => {
          const needed = Number(size);
          const completed = bookings.length >= needed;
          console.log(`    - Opción ${size} jugador(es): ${bookings.length}/${needed} ${completed ? '✅ COMPLETA' : '⏳ Esperando'}`);
          
          if (completed && !slot.courtId) {
            console.log(`      ⚠️ PROBLEMA: Grupo completo pero SIN PISTA ASIGNADA`);
          }
        });
      }
    });
  }
  
  await prisma.$disconnect();
}

checkNov6Class().catch(console.error);
