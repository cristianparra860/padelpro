import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndGenerate() {
  try {
    console.log('\n🗑️  PASO 1: Eliminando TODAS las propuestas (courtId=null)...\n');
    
    // Primero eliminar bookings de propuestas
    const proposalIds = await prisma.timeSlot.findMany({
      where: { courtId: null },
      select: { id: true }
    });
    
    if (proposalIds.length > 0) {
      await prisma.booking.deleteMany({
        where: {
          timeSlotId: { in: proposalIds.map(p => p.id) }
        }
      });
    }
    
    // Ahora eliminar las propuestas
    const deleted = await prisma.timeSlot.deleteMany({
      where: { courtId: null }
    });
    
    console.log(`   ✅ Eliminadas: ${deleted.count} propuestas\n`);
    
    console.log('👨‍🏫 PASO 2: Obteniendo instructores...\n');
    
    const instructors = await prisma.instructor.findMany({
      where: { clubId: 'club-1' },
      orderBy: { id: 'asc' }
    });
    
    console.log(`   Encontrados: ${instructors.length} instructors`);
    instructors.forEach((inst, i) => 
      console.log(`   ${i + 1}. ${inst.id}`)
    );
    
    console.log('\n📅 PASO 3: Generando propuestas para Octubre 2025...\n');
    
    const proposals = [];
    let totalSlots = 0;
    
    // Generar propuestas para TODOS los días de octubre (1-31)
    for (let day = 1; day <= 31; day++) {
      let slotsThisDay = 0;
      
      // Para cada hora de 08:00 a 21:00 (cada 30 minutos)
      for (let hour = 8; hour < 22; hour++) {
        for (let minute of [0, 30]) {
          // Saltar después de 21:00
          if (hour === 21 && minute === 30) break;
          
          // Crear fechas en hora local de España (UTC+2 en octubre)
          const startDate = new Date(2025, 9, day, hour, minute, 0); // mes 9 = octubre
          const endDate = new Date(startDate.getTime() + 90 * 60 * 1000); // +90 min
          
          // Crear propuesta para CADA instructor
          for (const instructor of instructors) {
            proposals.push({
              clubId: 'club-1',
              instructorId: instructor.id,
              courtId: null, // NULL = propuesta
              start: startDate,
              end: endDate,
              maxPlayers: 4,
              totalPrice: 25.0,
              level: 'INTERMEDIATE',
              category: 'ADULTS'
            });
            slotsThisDay++;
          }
        }
      }
      
      totalSlots += slotsThisDay;
      if (day === 1 || day === 15 || day === 31) {
        console.log(`   Día ${day}: ${slotsThisDay} propuestas`);
      }
    }
    
    console.log(`\n📊 Total a insertar: ${proposals.length} propuestas`);
    console.log(`   Por día: ${proposals.length / 31}`);
    console.log(`   Por instructor: ${proposals.length / instructors.length}\n`);
    
    console.log('💾 PASO 4: Insertando en base de datos...\n');
    
    // Insertar en lotes de 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < proposals.length; i += batchSize) {
      const batch = proposals.slice(i, i + batchSize);
      await prisma.timeSlot.createMany({
        data: batch
      });
      inserted += batch.length;
      process.stdout.write(`\r   Progreso: ${inserted}/${proposals.length}`);
    }
    
    console.log('\n\n✅ COMPLETADO!\n');
    
    // Verificar
    const total = await prisma.timeSlot.count({
      where: { courtId: null }
    });
    
    console.log(`🔍 Verificación: ${total} propuestas en base de datos\n`);
    
    // Verificar Oct 21
    const oct21 = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-21T00:00:00'),
          lte: new Date('2025-10-21T23:59:59')
        }
      },
      select: { start: true }
    });
    
    const at00 = oct21.filter(p => {
      const hour = p.start.getUTCHours();
      const min = p.start.getUTCMinutes();
      return min === 0;
    }).length;
    
    const at30 = oct21.filter(p => {
      const hour = p.start.getUTCHours();
      const min = p.start.getUTCMinutes();
      return min === 30;
    }).length;
    
    console.log(`📊 Oct 21 - Distribución:`);
    console.log(`   :00 -> ${at00} propuestas`);
    console.log(`   :30 -> ${at30} propuestas\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndGenerate();
