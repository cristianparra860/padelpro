const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📊 VERIFICANDO TARIFAS (CourtPriceSlot)...\n');
  
  const slots = await prisma.courtPriceSlot.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' }
  });

  if (slots.length === 0) {
    console.log('⚠️  NO HAY TARIFAS CONFIGURADAS');
    console.log('El sistema usará el precio por defecto del club.\n');
    
    const club = await prisma.club.findUnique({
      where: { id: 'padel-estrella-madrid' },
      select: { courtRentalPrice: true }
    });
    
    console.log(`Precio por defecto del club: €${club?.courtRentalPrice || 10}`);
  } else {
    console.log(`✅ ${slots.length} tarifa(s) encontrada(s):\n`);
    
    slots.forEach((slot, i) => {
      console.log(`${i + 1}. ${slot.name || 'Sin nombre'}`);
      console.log(`   Precio: €${slot.price}`);
      console.log(`   Horario: ${slot.startTime} - ${slot.endTime}`);
      console.log(`   Días: ${slot.daysOfWeek}`);
      console.log(`   Prioridad: ${slot.priority}`);
      console.log(`   Club ID: ${slot.clubId}`);
      console.log('');
    });
  }

  // Verificar precio de algunas clases existentes
  console.log('\n📋 VERIFICANDO PRECIOS DE CLASES EXISTENTES...\n');
  
  const classes = await prisma.timeSlot.findMany({
    where: {
      courtId: null // Solo propuestas
    },
    select: {
      id: true,
      start: true,
      totalPrice: true,
      instructorPrice: true,
      courtRentalPrice: true
    },
    take: 5,
    orderBy: { start: 'asc' }
  });

  if (classes.length === 0) {
    console.log('⚠️  NO HAY CLASES EN LA BASE DE DATOS');
  } else {
    classes.forEach(cls => {
      const date = new Date(cls.start);
      console.log(`Clase: ${date.toLocaleString('es-ES')}`);
      console.log(`  Total: €${cls.totalPrice}`);
      console.log(`  Instructor: €${cls.instructorPrice}`);
      console.log(`  Pista: €${cls.courtRentalPrice}`);
      console.log('');
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
