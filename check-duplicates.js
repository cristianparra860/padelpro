const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    // 1. Verificar instructor Pedro López
    const instructors = await prisma.instructor.findMany({
      where: { name: { contains: 'Pedro' } },
      select: { id: true, name: true, levelRanges: true }
    });
    
    console.log('👨‍🏫 Instructores encontrados:');
    console.log(JSON.stringify(instructors, null, 2));
    
    // 2. Verificar TimeSlots del día 2026-01-05
    const slots = await prisma.timeSlot.findMany({
      where: {
        clubId: 'club-1',
        start: {
          gte: new Date('2026-01-05T00:00:00.000Z'),
          lte: new Date('2026-01-05T23:59:59.999Z')
        },
        courtId: null // Solo clases no confirmadas
      },
      select: {
        id: true,
        start: true,
        levelRange: true,
        instructorId: true,
        courtId: true,
        instructor: {
          select: { name: true }
        },
        bookings: {
          select: {
            id: true,
            userId: true,
            status: true
          }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    console.log(`\n📅 TimeSlots del 05/01/2026: ${slots.length} encontrados\n`);
    
    // Agrupar por hora e instructor
    const grouped = {};
    slots.forEach(slot => {
      const hour = new Date(slot.start).toISOString().substring(11, 16);
      const key = `${slot.instructor.name}-${hour}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({
        id: slot.id,
        levelRange: slot.levelRange,
        bookings: slot.bookings.length,
        courtId: slot.courtId
      });
    });
    
    // Mostrar duplicados
    console.log('🔍 Análisis de duplicados por hora:\n');
    Object.entries(grouped).forEach(([key, slots]) => {
      if (slots.length > 1) {
        console.log(`⚠️  ${key}: ${slots.length} TimeSlots`);
        slots.forEach(s => {
          console.log(`   - ID: ${s.id.substring(0, 8)}... | Nivel: ${s.levelRange || 'N/A'} | Bookings: ${s.bookings} | Court: ${s.courtId || 'NULL'}`);
        });
      }
    });
    
    // 3. Verificar si hay usuarios con nivel configurado
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        level: true
      },
      take: 5
    });
    
    console.log('\n👤 Usuarios de ejemplo:');
    users.forEach(u => {
      console.log(`   ${u.name}: ${u.level || 'SIN NIVEL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
