const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const clubs = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Club`;
    const users = await prisma.$queryRaw`SELECT COUNT(*) as count FROM User`;
    const instructors = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Instructor`;
    const courts = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Court`;
    const clubSchedules = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ClubSchedule`;
    const instructorAvail = await prisma.$queryRaw`SELECT COUNT(*) as count FROM InstructorAvailability`;

    console.log('\n📊 Estado actual de la base de datos:\n');
    console.log(`   Clubs: ${clubs[0].count}`);
    console.log(`   Users: ${users[0].count}`);
    console.log(`   Instructors: ${instructors[0].count}`);
    console.log(`   Courts: ${courts[0].count}`);
    console.log(`   Club Schedules: ${clubSchedules[0].count}`);
    console.log(`   Instructor Availability: ${instructorAvail[0].count}`);

    if (instructors[0].count > 0) {
      const inst = await prisma.$queryRaw`SELECT id, userId, clubId FROM Instructor LIMIT 1`;
      console.log(`\n📋 Primer instructor:`, inst[0]);
    }

    if (courts[0].count > 0) {
      const court = await prisma.$queryRaw`SELECT id, number, clubId FROM Court LIMIT 1`;
      console.log(`📋 Primera pista:`, court[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
