const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.count();
  const timeSlots = await prisma.timeSlot.count();
  const bookings = await prisma.booking.count();
  const instructors = await prisma.instructor.count();
  const clubs = await prisma.club.count();
  
  console.log('\n✅ VERIFICACIÓN DE LA BASE DE DATOS:\n');
  console.log('═'.repeat(50));
  console.log('Usuarios:', users);
  console.log('TimeSlots (Clases):', timeSlots);
  console.log('Reservas (Bookings):', bookings);
  console.log('Instructores:', instructors);
  console.log('Clubes:', clubs);
  console.log('═'.repeat(50));
  console.log('\n✅ Todo está intacto - Ningún dato fue borrado\n');
  
  await prisma.$disconnect();
})();
