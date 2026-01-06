const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubHours() {
  const club = await prisma.club.findFirst({
    select: {
      id: true,
      name: true,
      openingHours: true
    }
  });

  console.log('🏢 Club:', club.name);
  console.log('🕐 openingHours raw:', club.openingHours);
  
  if (club.openingHours) {
    try {
      const parsed = JSON.parse(club.openingHours);
      console.log('📋 openingHours parsed:', JSON.stringify(parsed, null, 2));
      
      // Si es el nuevo formato con días de la semana
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([day, hours]) => {
          const openHours = hours.filter(Boolean).length;
          console.log(`  ${day}: ${openHours}/19 horas abiertas`);
          
          // Mostrar qué horas están abiertas
          const openSlots = [];
          hours.forEach((isOpen, index) => {
            if (isOpen) {
              const hour = 6 + index;
              openSlots.push(`${hour}:00`);
            }
          });
          if (openSlots.length > 0) {
            console.log(`    Horas: ${openSlots[0]} - ${openSlots[openSlots.length - 1]}`);
          }
        });
      }
    } catch (e) {
      console.error('❌ Error parsing openingHours:', e);
    }
  }

  await prisma.$disconnect();
}

checkClubHours();
