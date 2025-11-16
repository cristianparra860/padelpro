const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('🔍 Testing instructor API query...\n');
    
    const instructors = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.userId,
        i.clubId,
        i.hourlyRate,
        i.name as instructorName,
        i.experience,
        i.specialties,
        i.isActive,
        i.profilePictureUrl,
        i.createdAt,
        i.updatedAt,
        u.name,
        u.email,
        c.name as clubName
      FROM Instructor i
      LEFT JOIN User u ON i.userId = u.id
      LEFT JOIN Club c ON i.clubId = c.id
      WHERE i.clubId = 'club-padel-estrella' 
      ORDER BY i.createdAt DESC
    `;
    
    console.log('✅ Found instructors:', instructors.length);
    console.log('\n📋 Instructors data:');
    instructors.forEach((inst, index) => {
      console.log(`\n${index + 1}. ${inst.name || 'NO NAME'}`);
      console.log(`   ID: ${inst.id}`);
      console.log(`   ClubId: ${inst.clubId}`);
      console.log(`   ClubName: ${inst.clubName || 'NO CLUB NAME'}`);
      console.log(`   Email: ${inst.email}`);
      console.log(`   Specialties: ${inst.specialties}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
