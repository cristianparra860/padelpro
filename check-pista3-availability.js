// Verificar disponibilidad de pistas el 12 de enero a las 07:30
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAvailability() {
  console.log('🔍 Verificando disponibilidad Pista 3 - 12 enero 07:30 (90 min)\n');
  
  try {
    // Fecha: 12 de enero 2026 a las 07:30
    const startDate = new Date('2026-01-12T07:30:00');
    const endDate = new Date('2026-01-12T09:00:00'); // +90 min
    
    console.log('📅 Horario solicitado:');
    console.log(`   Inicio: ${startDate.toLocaleString('es-ES')}`);
    console.log(`   Fin: ${endDate.toLocaleString('es-ES')}`);
    console.log(`   Timestamps: ${startDate.getTime()} - ${endDate.getTime()}\n`);
    
    // 1. Buscar pista 3
    const court = await prisma.court.findFirst({
      where: { number: 3, clubId: 'club-1' }
    });
    
    if (!court) {
      console.log('❌ Pista 3 no encontrada');
      return;
    }
    
    console.log(`✅ Pista encontrada: ${court.name} (ID: ${court.id})\n`);
    
    // 2. Verificar conflictos en CourtSchedule
    console.log('🔍 Buscando conflictos en CourtSchedule...');
    const conflicts = await prisma.$queryRaw`
      SELECT * FROM CourtSchedule
      WHERE courtId = ${court.id}
      AND (
        (startTime < ${endDate.getTime()} AND endTime > ${startDate.getTime()})
      )
      AND isOccupied = 1
    `;
    
    if (conflicts.length > 0) {
      console.log(`❌ CONFLICTOS ENCONTRADOS (${conflicts.length}):\n`);
      conflicts.forEach((conflict, i) => {
        const start = new Date(conflict.startTime);
        const end = new Date(conflict.endTime);
        console.log(`   ${i + 1}. ID: ${conflict.id}`);
        console.log(`      Horario: ${start.toLocaleString('es-ES')} - ${end.toLocaleString('es-ES')}`);
        console.log(`      Razón: ${conflict.reason || 'No especificada'}`);
        console.log(`      Ocupada: ${conflict.isOccupied ? 'Sí' : 'No'}\n`);
      });
    } else {
      console.log('✅ No hay conflictos en CourtSchedule\n');
    }
    
    // 3. Verificar todas las reservas de ese día
    console.log('📋 Todas las reservas en CourtSchedule para el 12 de enero:');
    const dayStart = new Date('2026-01-12T00:00:00');
    const dayEnd = new Date('2026-01-12T23:59:59');
    
    const allReservations = await prisma.courtSchedule.findMany({
      where: {
        courtId: court.id,
        startTime: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      orderBy: { startTime: 'asc' }
    });
    
    if (allReservations.length > 0) {
      allReservations.forEach((res, i) => {
        const start = new Date(res.startTime);
        const end = new Date(res.endTime);
        console.log(`   ${i + 1}. ${start.toLocaleTimeString('es-ES')} - ${end.toLocaleTimeString('es-ES')}`);
        console.log(`      Ocupada: ${res.isOccupied ? 'Sí' : 'No'}`);
        console.log(`      Razón: ${res.reason || 'N/A'}\n`);
      });
    } else {
      console.log('   No hay reservas para ese día\n');
    }
    
    // 4. Verificar TimeSlots (clases) en ese horario
    console.log('🎓 Verificando clases en ese horario...');
    const classes = await prisma.timeSlot.findMany({
      where: {
        clubId: 'club-1',
        start: {
          gte: dayStart,
          lte: dayEnd
        },
        courtId: court.id
      },
      include: {
        instructor: true
      }
    });
    
    if (classes.length > 0) {
      console.log(`⚠️ Clases programadas en Pista 3 (${classes.length}):\n`);
      classes.forEach((cls, i) => {
        const start = new Date(cls.start);
        const end = new Date(cls.end);
        console.log(`   ${i + 1}. ${start.toLocaleTimeString('es-ES')} - ${end.toLocaleTimeString('es-ES')}`);
        console.log(`      Instructor: ${cls.instructor?.name || 'N/A'}`);
        console.log(`      Nivel: ${cls.level || 'N/A'}\n`);
      });
    } else {
      console.log('   No hay clases programadas\n');
    }
    
    console.log('✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailability();
