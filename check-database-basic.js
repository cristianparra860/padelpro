const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  // Verificar clubs
  const clubs = await prisma.club.findMany();
  console.log('\n🏢 Clubs en la base de datos:');
  clubs.forEach(c => {
    console.log(`   - ID: ${c.id}, Nombre: ${c.name}`);
  });
  
  // Verificar pistas
  const courts = await prisma.court.findMany();
  console.log(`\n🎾 Pistas en la base de datos: ${courts.length}`);
  courts.forEach(c => {
    console.log(`   - Pista ${c.number}, Club: ${c.clubId}, Activa: ${c.isActive}, Superficie: ${c.surface}`);
  });
  
  // Verificar TimeSlots
  const slots = await prisma.timeSlot.count();
  console.log(`\n📅 TimeSlots en la base de datos: ${slots}`);
  
  // Verificar reservas
  const bookings = await prisma.booking.count();
  console.log(`📚 Reservas en la base de datos: ${bookings}`);
  
  await prisma.$disconnect();
}

checkDatabase().catch(console.error);
