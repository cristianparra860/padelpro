const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorsByClub() {
  try {
    console.log('🔍 Checking instructors by club...\n');
    
    // Get all instructors with their club info
    const instructors = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.name,
        i.clubId,
        i.isActive,
        c.name as clubName
      FROM Instructor i
      LEFT JOIN Club c ON i.clubId = c.id
      ORDER BY i.clubId, i.name
    `;
    
    console.log('📊 Total instructors in DB:', instructors.length);
    console.log('\n=== ALL INSTRUCTORS ===');
    instructors.forEach(inst => {
      console.log(`${inst.isActive ? '✅' : '❌'} ${inst.name} | Club: ${inst.clubName || 'Sin club'} (${inst.clubId})`);
    });
    
    // Count by club
    console.log('\n=== ACTIVE INSTRUCTORS BY CLUB ===');
    const activeByClub = {};
    instructors.forEach(inst => {
      if (inst.isActive) {
        const clubKey = inst.clubId || 'sin-club';
        if (!activeByClub[clubKey]) {
          activeByClub[clubKey] = {
            clubName: inst.clubName || 'Sin club',
            count: 0,
            instructors: []
          };
        }
        activeByClub[clubKey].count++;
        activeByClub[clubKey].instructors.push(inst.name);
      }
    });
    
    Object.entries(activeByClub).forEach(([clubId, data]) => {
      console.log(`\n🏢 ${data.clubName} (${clubId}): ${data.count} instructores activos`);
      data.instructors.forEach(name => console.log(`   - ${name}`));
    });
    
    // Count inactive
    const inactiveCount = instructors.filter(i => !i.isActive).length;
    console.log(`\n⚠️ Instructores inactivos: ${inactiveCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorsByClub();
