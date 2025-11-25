const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGeneration() {
  const date = '2025-11-29';
  const startTime = '08:00';
  const instructorId = 'instructor-alex-garcia';
  
  console.log(`Testing generation for ${date} at ${startTime}...`);
  console.log('');
  
  // 1. Verificar si ya existe
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
  const existing = await prisma.$queryRaw`
    SELECT id FROM TimeSlot 
    WHERE clubId = ${'padel-estrella-madrid'}
    AND instructorId = ${instructorId}
    AND start = ${startDateTime.toISOString()}
    AND courtId IS NULL
  `;
  
  console.log('1. Existing proposals:', existing);
  
  // 2. Verificar clases confirmadas
  const confirmedClass = await prisma.$queryRaw`
    SELECT id FROM TimeSlot
    WHERE instructorId = ${instructorId}
    AND courtId IS NOT NULL
    AND start <= ${startDateTime.toISOString()}
    AND end > ${startDateTime.toISOString()}
  `;
  
  console.log('2. Confirmed classes blocking:', confirmedClass);
  
  //3. Verificar schedule
  const instructorSchedule = await prisma.$queryRaw`
    SELECT * FROM InstructorSchedule
    WHERE date = ${date}
    AND instructorId = ${instructorId}
  `;
  
  console.log('3. Instructor schedule:', instructorSchedule);
  
  await prisma.$disconnect();
}

testGeneration();
