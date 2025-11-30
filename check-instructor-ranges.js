const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorRanges() {
  try {
    const instructor = await prisma.instructor.findFirst({
      where: {
        user: {
          name: 'Carlos Martinez'
        }
      },
      select: {
        id: true,
        levelRanges: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('Instructor encontrado:');
    console.log(JSON.stringify(instructor, null, 2));
    
    if (instructor && instructor.levelRanges) {
      console.log('\nRangos parseados:');
      console.log(JSON.parse(instructor.levelRanges));
    } else {
      console.log('\n⚠️ El instructor NO tiene rangos de nivel configurados');
      console.log('Ve a /instructor y configura rangos en "Preferencias y Tarifas"');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorRanges();
