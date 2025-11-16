const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeslotDates() {
  const timeSlotIds = [
    'cmhxxjkv200e9tgrcr9rz56ye',
    'cmhxxjlpv00p5tgrcf5ec7otv',
    'cmhxxjkyl00fbtgrc3mtdjs78',
    'cmhxxjk0y003dtgrcexu3fjfo',
    'cmhxxjmki0101tgrcguj1kqar',
    'cmhxxjk5f004xtgrcyi2g5qc5',
    'cmhxxjniu01bjtgrcl2ms4ggp',
    'cmhxxjl0300fttgrck5ypz0u2'
  ];

  console.log('🗓️  Verificando fechas de TimeSlots...\n');

  const slots = await prisma.timeSlot.findMany({
    where: { id: { in: timeSlotIds } },
    select: { id: true, start: true, courtNumber: true },
    orderBy: { start: 'asc' }
  });

  console.log(`📊 Total TimeSlots encontrados: ${slots.length}\n`);

  slots.forEach((slot, index) => {
    const date = new Date(Number(slot.start));
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    console.log(`${index + 1}. TimeSlot: ${slot.id.substring(0, 20)}...`);
    console.log(`   📅 Fecha: ${dayOfMonth}/${month}/${year} a las ${time}`);
    console.log(`   🎾 Court: ${slot.courtNumber || 'Sin asignar'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkTimeslotDates().catch(console.error);
