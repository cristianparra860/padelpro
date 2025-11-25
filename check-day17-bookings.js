const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: 'cmhkwi8so0001tggo0bwojrjy',
        timeSlot: {
          start: {
            gte: new Date('2024-11-17T00:00:00.000Z'),
            lte: new Date('2024-11-17T23:59:59.999Z')
          }
        }
      },
      include: {
        timeSlot: {
          select: {
            start: true,
            level: true,
            courtNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📅 Bookings del día 17 de noviembre:');
    console.log('Total:', bookings.length);
    
    bookings.forEach(b => {
      const date = new Date(b.timeSlot.start);
      console.log({
        id: b.id.substring(0, 20),
        status: b.status,
        groupSize: b.groupSize,
        courtNumber: b.timeSlot.courtNumber,
        hour: date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0'),
        level: b.timeSlot.level,
        createdAt: b.createdAt
      });
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
