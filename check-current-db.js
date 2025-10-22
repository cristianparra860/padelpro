const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDB() {
  console.log('🔍 Verificando base de datos...\n');
  
  const clubs = await prisma.club.findMany({
    select: { id: true, name: true }
  });
  console.log('🏢 Clubes:', clubs);
  
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log('\n👤 Usuarios:', users);
  
  const instructors = await prisma.instructor.findMany({
    select: { id: true, bio: true }
  });
  console.log('\n🎓 Instructores:', instructors);
  
  const timeSlots = await prisma.timeSlot.findMany({
    select: { id: true, clubId: true, start: true, end: true }
  });
  console.log(`\n⏰ TimeSlots (${timeSlots.length}):`, timeSlots.slice(0, 3));
  
  await prisma.$disconnect();
}

checkDB().catch(console.error);
