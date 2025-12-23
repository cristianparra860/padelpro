const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubs() {
  try {
    const clubs = await prisma.club.findMany({
      include: {
        _count: {
          select: {
            courts: true,
            users: true,
            instructors: true
          }
        }
      }
    });

    console.log(`\n📊 Total de clubes: ${clubs.length}\n`);

    clubs.forEach((club, index) => {
      console.log(`${index + 1}. ${club.name}`);
      console.log(`   ID: ${club.id}`);
      console.log(`   Pistas: ${club._count.courts}`);
      console.log(`   Usuarios: ${club._count.users}`);
      console.log(`   Instructores: ${club._count.instructors}`);
      console.log(`   Ciudad: ${club.location || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClubs();
