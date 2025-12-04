const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlot() {
  // Buscar la clase de Cristian Parra del 10 dic 9:00
  const slots = await prisma.timeSlot.findMany({
    where: {
      instructorId: 'instructor-cristian-parra',
      start: { gte: BigInt(1733821200000), lte: BigInt(1733824800000) } // 10 dic 2025 9:00-10:00
    },
    select: {
      id: true,
      start: true,
      creditsSlots: true,
      instructor: { select: { name: true } }
    }
  });

  console.log('Clases encontradas:', slots.length);
  slots.forEach(slot => {
    const date = new Date(Number(slot.start));
    console.log('\n📅 Clase:', {
      id: slot.id,
      instructor: slot.instructor.name,
      fecha: date.toLocaleString('es-ES'),
      creditsSlots: slot.creditsSlots,
      parsed: JSON.parse(slot.creditsSlots || '[]')
    });
  });

  await prisma.$disconnect();
}

checkSlot();
