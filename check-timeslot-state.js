const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const result = await prisma.$queryRaw`
    SELECT hasRecycledSlots, courtNumber, id
    FROM TimeSlot 
    WHERE id = 'ts-1764308197680-dpjdjcrk1ah'
  `;
  
  console.log('\n📊 Estado actual del TimeSlot:\n');
  console.log(result[0]);
  
  console.log('\n📋 Bookings en esta clase:\n');
  
  const bookings = await prisma.$queryRaw`
    SELECT 
      b.id,
      b.status,
      b.isRecycled,
      b.groupSize,
      u.name as userName
    FROM Booking b
    LEFT JOIN User u ON b.userId = u.id
    WHERE b.timeSlotId = 'ts-1764308197680-dpjdjcrk1ah'
    ORDER BY b.createdAt
  `;
  
  bookings.forEach(b => {
    console.log(`${b.status === 'CANCELLED' ? '❌' : '✅'} ${b.userName}: ${b.groupSize} plazas - ${b.status}${b.isRecycled === 1 ? ' ♻️' : ''}`);
  });
  
  await prisma.$disconnect();
})();
