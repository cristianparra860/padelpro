const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const today = new Date('2025-12-09T10:00:00.000Z');
    
    const classData = {
      id: 'ts-recycled-test-' + Date.now(),
      clubId: 'cmftnbe2o0001tgkobtrxipip',
      instructorId: 'instructor-carlos-martinez',
      start: today,
      end: new Date(today.getTime() + 90 * 60 * 1000),
      maxPlayers: 4,
      totalPrice: 20,
      instructorPrice: 15,
      courtRentalPrice: 5,
      level: 'abierto',
      category: 'general',
      courtNumber: 1,
      courtId: 'cmhkwerqw0000tg1gqw0v944d',
      hasRecycledSlots: true,
      availableRecycledSlots: 3,
      recycledSlotsOnlyPoints: true,
      creditsCost: 50
    };
    
    const slot = await prisma.timeSlot.create({ data: classData });
    
    console.log('✅ Clase creada con plazas recicladas:');
    console.log('  ID:', slot.id);
    console.log('  Instructor: Carlos Martínez');
    console.log('  Fecha: 9 de diciembre de 2025, 10:00 AM');
    console.log('  Pista:', slot.courtNumber);
    console.log('  hasRecycledSlots:', slot.hasRecycledSlots);
    console.log('  availableRecycledSlots:', slot.availableRecycledSlots);
    console.log('  recycledSlotsOnlyPoints:', slot.recycledSlotsOnlyPoints);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
