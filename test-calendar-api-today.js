const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCalendarAPI() {
  try {
    // Fecha actual (7 de enero de 2026)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateParam = `${year}-${month}-${day}`;
    
    console.log(`🔍 Testing Calendar API para ${dateParam}...`);
    console.log('');
    
    // Simular exactamente lo que hace la API
    const adjustedStartDate = new Date(`${dateParam}T00:00:00.000Z`);
    const adjustedEndDate = new Date(`${dateParam}T23:59:59.999Z`);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    const startTime = adjustedStartDate.getTime();
    const endTime = adjustedEndDate.getTime();
    const clubId = 'club-1';
    
    console.log('📅 Rango de tiempo:');
    console.log('  Start:', new Date(startTime).toISOString());
    console.log('  End:', new Date(endTime).toISOString());
    console.log('  Start (ms):', startTime);
    console.log('  End (ms):', endTime);
    console.log('');
    
    // Query exacta de la API
    const classesRaw = await prisma.$queryRawUnsafe(
      `SELECT id, start, end, maxPlayers, totalPrice, level, category, levelRange, 
              courtId, courtNumber, instructorId, clubId
       FROM TimeSlot
       WHERE start >= ? AND start <= ? AND clubId = ?
       ORDER BY start ASC`,
      startTime, endTime, clubId
    );
    
    console.log('📊 TimeSlots encontrados:', classesRaw.length);
    
    if (classesRaw.length > 0) {
      console.log('');
      console.log('🔍 Primeros 5 slots:');
      classesRaw.slice(0, 5).forEach((slot, i) => {
        console.log(`  ${i + 1}. ${new Date(Number(slot.start)).toLocaleString()} - ${slot.level} - Court: ${slot.courtId ? 'Asignada' : 'Sin asignar'}`);
      });
    }
    
    // Verificar instructores
    const timeSlotIds = classesRaw.map(c => c.id);
    const instructorIds = [...new Set(classesRaw.map(c => c.instructorId).filter(Boolean))];
    
    console.log('');
    console.log('👨‍🏫 Instructores únicos:', instructorIds.length);
    
    const instructors = await prisma.instructor.findMany({
      where: { id: { in: instructorIds } },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('👨‍🏫 Instructores cargados:', instructors.length);
    instructors.slice(0, 3).forEach(i => {
      console.log(`  - ${i.user.name}`);
    });
    
    // Verificar bookings
    const allBookings = await prisma.booking.findMany({
      where: {
        timeSlotId: { in: timeSlotIds },
        status: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] }
      }
    });
    
    console.log('');
    console.log('📝 Bookings encontrados:', allBookings.length);
    
    // Separar propuestas de confirmadas
    const proposedClasses = classesRaw.filter(c => c.courtId === null);
    const confirmedClasses = classesRaw.filter(c => c.courtId !== null);
    
    console.log('');
    console.log('📋 RESUMEN:');
    console.log(`  ✅ Clases confirmadas: ${confirmedClasses.length}`);
    console.log(`  🔵 Propuestas de clases: ${proposedClasses.length}`);
    console.log(`  📝 Total de bookings: ${allBookings.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalendarAPI();
