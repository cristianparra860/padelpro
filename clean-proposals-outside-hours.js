const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🧹 Script: Limpiar propuestas fuera de horario de apertura
 * 
 * Elimina todos los TimeSlots con courtId=null (propuestas) que están
 * fuera de los horarios de apertura configurados en el club.
 */

async function main() {
  console.log('🧹 Limpiando propuestas fuera de horario de apertura...\n');

  // Obtener club y sus horarios
  const club = await prisma.club.findUnique({
    where: { id: 'padel-estrella-madrid' },
    select: { 
      id: true,
      name: true, 
      openingHours: true 
    }
  });

  if (!club) {
    console.error('❌ Club no encontrado');
    process.exit(1);
  }

  console.log(`🏢 Club: ${club.name}`);

  // Parsear horarios de apertura
  let openingHoursArray = [];
  if (club.openingHours) {
    try {
      openingHoursArray = JSON.parse(club.openingHours);
      console.log(`🕐 Horarios configurados: ${openingHoursArray.filter(Boolean).length}/19 horas abiertas`);
      
      // Mostrar horarios legibles
      const openHours = [];
      openingHoursArray.forEach((isOpen, index) => {
        if (isOpen) {
          const hour = 6 + index;
          openHours.push(`${hour}:00`);
        }
      });
      console.log(`   Horario: ${openHours[0]} - ${openHours[openHours.length - 1]}`);
    } catch (e) {
      console.error('❌ Error parseando openingHours:', e);
      process.exit(1);
    }
  } else {
    console.log('⚠️  No hay horarios configurados, usando 8 AM - 11 PM por defecto');
    openingHoursArray = Array.from({ length: 19 }, (_, i) => i >= 2 && i <= 17);
  }

  // Obtener todas las propuestas (courtId=null)
  const allProposals = await prisma.timeSlot.findMany({
    where: { 
      clubId: club.id,
      courtId: null 
    },
    select: {
      id: true,
      start: true,
      end: true,
      level: true
    }
  });

  console.log(`\n📊 Total de propuestas encontradas: ${allProposals.length}`);

  // Filtrar propuestas fuera de horario
  const toDelete = [];
  const toKeep = [];

  allProposals.forEach(proposal => {
    const startDate = new Date(proposal.start);
    const hour = startDate.getUTCHours(); // Hora en UTC
    
    // Convertir hora UTC a índice de openingHoursArray (6 AM = 0, 7 AM = 1, etc.)
    const hourIndex = hour - 6;
    
    // Verificar si está dentro de horario
    if (hourIndex < 0 || hourIndex >= 19 || !openingHoursArray[hourIndex]) {
      toDelete.push(proposal);
    } else {
      toKeep.push(proposal);
    }
  });

  console.log(`\n🔍 Análisis:`);
  console.log(`   ✅ Dentro de horario: ${toKeep.length}`);
  console.log(`   ❌ Fuera de horario: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('\n✅ No hay propuestas fuera de horario. ¡Todo en orden!');
    await prisma.$disconnect();
    return;
  }

  // Mostrar ejemplos
  console.log(`\n📋 Ejemplos de propuestas a eliminar:`);
  toDelete.slice(0, 5).forEach(p => {
    const date = new Date(p.start);
    console.log(`   - ${date.toLocaleString('es-ES')} (${p.level})`);
  });

  if (toDelete.length > 5) {
    console.log(`   ... y ${toDelete.length - 5} más`);
  }

  // Confirmar antes de eliminar
  console.log(`\n⚠️  ¿Eliminar ${toDelete.length} propuestas fuera de horario?`);
  console.log('   Ejecutando en 3 segundos... (Ctrl+C para cancelar)');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Eliminar en lote
  const idsToDelete = toDelete.map(p => p.id);
  
  const deleted = await prisma.timeSlot.deleteMany({
    where: {
      id: { in: idsToDelete }
    }
  });

  console.log(`\n✅ Eliminadas ${deleted.count} propuestas fuera de horario`);
  console.log(`📊 Propuestas restantes: ${toKeep.length}`);

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('❌ Error:', error);
  prisma.$disconnect();
  process.exit(1);
});
