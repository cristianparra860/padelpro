const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubs() {
  try {
    const clubs = await prisma.club.findMany();
    console.log('📊 Total clubs:', clubs.length);
    console.log('\nClubs:');
    clubs.forEach(club => {
      console.log(`- ${club.name} (${club.id})`);
      console.log(`  Address: ${club.address}`);
      console.log(`  Email: ${club.email || 'N/A'}`);
      console.log(`  Phone: ${club.phone || 'N/A'}`);
      console.log(`  Logo: ${club.logo || 'N/A'}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClubs();
