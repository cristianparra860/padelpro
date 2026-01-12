const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Verificando levelRange y genderCategory en TimeSlots...\n');
    
    const slots = await prisma.timeSlot.findMany({
      where: { 
        courtId: null  // Solo propuestas sin pista asignada
      },
      take: 10,
      select: {
        id: true,
        start: true,
        level: true,
        levelRange: true,
        category: true,
        genderCategory: true,
        instructor: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        start: 'desc'
      }
    });
    
    console.log(`Encontrados ${slots.length} TimeSlots\n`);
    
    slots.forEach((slot, index) => {
      const date = new Date(Number(slot.start));
      console.log(`\n${index + 1}. TimeSlot ID: ${slot.id.substring(0, 15)}...`);
      console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${slot.instructor?.user?.name || 'N/A'}`);
      console.log(`   level: "${slot.level}"`);
      console.log(`   levelRange: "${slot.levelRange}"`);
      console.log(`   category: "${slot.category}"`);
      console.log(`   genderCategory: "${slot.genderCategory}"`);
    });
    
    // Estadísticas
    const withLevelRange = slots.filter(s => s.levelRange && s.levelRange !== null);
    const withGenderCategory = slots.filter(s => s.genderCategory && s.genderCategory !== null);
    
    console.log(`\n\n📊 Estadísticas:`);
    console.log(`   Con levelRange: ${withLevelRange.length}/${slots.length}`);
    console.log(`   Con genderCategory: ${withGenderCategory.length}/${slots.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
