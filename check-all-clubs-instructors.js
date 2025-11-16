const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllClubs() {
  try {
    console.log('🏢 Checking all clubs in database...\n');
    
    const clubs = await prisma.$queryRaw`
      SELECT id, name, address FROM Club
    `;
    
    console.log(`📊 Total clubs: ${clubs.length}\n`);
    
    for (const club of clubs) {
      console.log(`\n🏢 ${club.name} (${club.id})`);
      console.log(`   📍 ${club.address}`);
      
      // Count instructors in this club
      const instructors = await prisma.$queryRaw`
        SELECT id, name, isActive 
        FROM Instructor 
        WHERE clubId = ${club.id}
      `;
      
      const activeCount = instructors.filter(i => i.isActive).length;
      const inactiveCount = instructors.filter(i => !i.isActive).length;
      
      console.log(`   👨‍🏫 Instructores: ${instructors.length} total (${activeCount} activos, ${inactiveCount} inactivos)`);
      
      instructors.forEach(inst => {
        const status = inst.isActive ? '✅' : '❌';
        console.log(`      ${status} ${inst.name} (${inst.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllClubs();
