const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteBadSlotsAndRecreate() {
  try {
    console.log('🗑️ ELIMINANDO TODAS LAS PROPUESTAS Y RECREANDO CON UTC CORRECTO\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Eliminar todas las propuestas existentes (solo propuestas, no confirmadas)
    const deleted = await prisma.timeSlot.deleteMany({
      where: {
        start: {
          gte: today,
          lt: nextWeek
        },
        courtNumber: null
      }
    });
    
    console.log(`🗑️ Eliminadas ${deleted.count} propuestas antiguas\n`);
    
    // Obtener instructores
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`👥 Recreando propuestas para ${instructors.length} instructores\n`);
    
    let created = 0;
    
    for (const instructor of instructors) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        for (let hour = 8; hour < 22; hour++) {
          for (const minute of [0, 30]) {
            // Crear fecha en UTC explícitamente
            const localDate = new Date(today);
            localDate.setDate(today.getDate() + dayOffset);
            localDate.setHours(hour, minute, 0, 0);
            
            // Convertir a UTC: restar 1 hora (estamos en UTC+1)
            const utcStart = new Date(localDate.getTime() - 60 * 60 * 1000);
            const utcEnd = new Date(utcStart.getTime() + 60 * 60 * 1000);
            
            try {
              await prisma.timeSlot.create({
                data: {
                  clubId: instructor.clubId,
                  instructorId: instructor.id,
                  start: utcStart,
                  end: utcEnd,
                  maxPlayers: 4,
                  totalPrice: 25.00,
                  instructorPrice: 10.00,
                  courtRentalPrice: 15.00,
                  level: 'ABIERTO',
                  category: 'clases'
                }
              });
              
              created++;
              
              if (created <= 5) {
                console.log(`  ✅ ${localDate.toLocaleString('es-ES')} → UTC: ${utcStart.toISOString()}`);
              }
            } catch (error) {
              // Ignorar duplicados
            }
          }
        }
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Propuestas creadas: ${created}`);
    console.log(`  (7 días × 5 instructores × 28 slots = ${7 * 5 * 28} esperados)`);
    
    // Verificar que ahora sí hay slots de 8:00 AM
    console.log(`\n🔍 Verificando slots de 8:00 AM local (07:00 UTC):\n`);
    
    const morning = await prisma.$queryRaw`
      SELECT id, start, instructorId
      FROM TimeSlot
      WHERE start >= '2025-11-13T07:00:00.000Z'
        AND start < '2025-11-13T07:30:00.000Z'
    `;
    
    console.log(`  Slots de 8:00 AM hoy: ${morning.length}`);
    
    if (morning.length > 0) {
      console.log(`  ✅ Ahora sí existen las propuestas de 8:00 AM`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBadSlotsAndRecreate();
