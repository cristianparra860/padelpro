const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function superSimpleSeed() {
  console.log('🌱 Super simple seed...\n');

  // Limpiar todo primero
  await prisma.booking.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.court.deleteMany();
  await prisma.club.deleteMany();
  await prisma.admin.deleteMany();
  console.log('🗑️  Database cleaned\n');

  const admin = await prisma.admin.create({
    data: {
      email: 'admin@club.com',
      name: 'Admin',
      role: 'CLUB_ADMIN'
    }
  });
  console.log('✅ Admin');

  const club = await prisma.club.create({
    data: {
      id: 'club-1',
      name: 'Club Padel',
      address: 'Calle 123'
    }
  });
  console.log('✅ Club');

  const user = await prisma.user.create({
    data: {
      id: 'alex-user-id',
      email: 'alex@email.com',
      name: 'Alex García',
      clubId: club.id,
      level: 'intermedio',
      credits: 1000,
      profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    }
  });
  console.log('✅ User');

  const instUser = await prisma.user.create({
    data: {
      email: 'elena@email.com',
      name: 'Elena Martínez',
      clubId: club.id,
      role: 'INSTRUCTOR',
      level: 'avanzado'
    }
  });

  const instructor = await prisma.instructor.create({
    data: {
      userId: instUser.id,
      clubId: club.id,
      hourlyRate: 35
    }
  });
  console.log('✅ Instructor');

  // Crear 4 pistas
  const courts = [];
  for (let i = 1; i <= 4; i++) {
    const court = await prisma.court.create({
      data: {
        clubId: club.id,
        number: i,
        name: `Pista ${i}`
      }
    });
    courts.push(court);
  }
  console.log('✅ 4 Courts');

  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const start = new Date(today);
    start.setHours(9 + i, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    await prisma.timeSlot.create({
      data: {
        clubId: club.id,
        courtId: courts[0].id, // Asignar a la primera pista por defecto
        instructorId: instructor.id,
        start,
        end,
        maxPlayers: 4,
        totalPrice: 55,
        level: 'ABIERTO',
        category: 'ABIERTO'
      }
    });
  }
  console.log('✅ 10 TimeSlots\n🎉 Done!');

  await prisma.$disconnect();
}

superSimpleSeed().catch(e => {
  console.error(e);
  process.exit(1);
});
