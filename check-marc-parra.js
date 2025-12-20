const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcParra() {
  console.log('🔍 Verificando usuario Marc Parra...\n');
  
  // Buscar usuario por nombre
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Marc' } },
        { name: { contains: 'Parra' } }
      ]
    }
  });
  
  console.log(`📊 Usuarios encontrados: ${users.length}\n`);
  
  users.forEach(u => {
    console.log(`👤 ${u.name}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   ID: ${u.id}`);
    console.log(`   Credits: ${u.credits}`);
    console.log('');
  });
  
  if (users.length > 0) {
    const userId = users[0].id;
    console.log(`\n🔍 Buscando bookings de ${users[0].name}...\n`);
    
    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId
      },
      include: {
        timeSlot: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`📋 Total bookings: ${bookings.length}\n`);
    
    bookings.forEach(b => {
      const date = new Date(b.timeSlot.start);
      console.log(`${date.toLocaleDateString()} ${date.toLocaleTimeString()} - Status: ${b.status}`);
      console.log(`   Booking ID: ${b.id.substring(0, 25)}...`);
      console.log(`   TimeSlot ID: ${b.timeSlotId.substring(0, 25)}...`);
      console.log(`   GroupSize: ${b.groupSize}, Pista: ${b.timeSlot.courtNumber || 'Pendiente'}`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

checkMarcParra();
