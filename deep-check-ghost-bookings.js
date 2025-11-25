const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🔍 BÚSQUEDA EXHAUSTIVA DE RESERVAS FANTASMA\n');
  console.log('='.repeat(70));
  
  // Buscar TODOS los TimeSlots del 21 de noviembre
  console.log('\n1️⃣ TODOS LOS TIMESLOTS DEL 21 DE NOVIEMBRE:');
  const timeSlots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-21T00:00:00Z'),
        lte: new Date('2025-11-21T23:59:59Z')
      }
    },
    include: {
      bookings: {
        include: {
          user: { select: { name: true, email: true } }
        }
      },
      instructor: { select: { name: true } }
    },
    orderBy: { start: 'asc' }
  });
  
  console.log(`\nTotal TimeSlots: ${timeSlots.length}\n`);
  
  let foundGhost = false;
  
  timeSlots.forEach((slot, idx) => {
    const hora = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const hasBookings = slot.bookings.length > 0;
    const hasCourt = slot.courtNumber !== null;
    
    // Mostrar solo si tiene pista asignada O tiene reservas
    if (hasCourt || hasBookings) {
      console.log(`${idx + 1}. ${hora} - ${slot.level}`);
      console.log(`   ID: ${slot.id}`);
      console.log(`   Instructor: ${slot.instructor?.name || 'N/A'}`);
      console.log(`   Pista: ${slot.courtNumber || '❌ Sin asignar'}`);
      console.log(`   Reservas: ${slot.bookings.length}`);
      
      if (hasCourt && !hasBookings) {
        console.log('   ⚠️⚠️⚠️ FANTASMA ENCONTRADO - Pista asignada sin reservas');
        foundGhost = true;
      }
      
      if (hasBookings) {
        slot.bookings.forEach(b => {
          console.log(`   - ${b.user.name}: ${b.status} (Grupo: ${b.groupSize})`);
        });
      }
      console.log('');
    }
  });
  
  if (!foundGhost) {
    console.log('✅ No se encontraron reservas fantasma (pistas asignadas sin reservas)\n');
  } else {
    console.log('\n2️⃣ LIMPIANDO RESERVAS FANTASMA...\n');
    
    for (const slot of timeSlots) {
      if (slot.courtNumber !== null && slot.bookings.length === 0) {
        const hora = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`🧹 Limpiando slot ${hora} (${slot.id})...`);
        
        // Quitar pista asignada
        await prisma.timeSlot.update({
          where: { id: slot.id },
          data: { courtNumber: null }
        });
        console.log('   ✅ Pista liberada');
        
        // Limpiar CourtSchedule
        await prisma.courtSchedule.deleteMany({
          where: { timeSlotId: slot.id }
        });
        console.log('   ✅ CourtSchedule limpiado');
        
        // Limpiar InstructorSchedule
        await prisma.instructorSchedule.deleteMany({
          where: { timeSlotId: slot.id }
        });
        console.log('   ✅ InstructorSchedule limpiado\n');
      }
    }
  }
  
  console.log('='.repeat(70));
  console.log('✅ ANÁLISIS COMPLETADO\n');
  
  await prisma.$disconnect();
})();
