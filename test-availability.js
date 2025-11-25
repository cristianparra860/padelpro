const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAvailability() {
  const date = '2025-11-29';
  const startTime = '08:00';
  const endTime = '09:00';
  
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
  const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
  
  // Contar total de pistas e instructores activos
  const totalCourts = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM Court WHERE isActive = 1
  `;
  
  const totalInstructors = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM Instructor WHERE isActive = 1
  `;

  console.log('Total Courts:', totalCourts);
  console.log('Total Instructors:', totalInstructors);

  const totalCourtsCount = Number(totalCourts[0]?.count || 0);
  const totalInstructorsCount = Number(totalInstructors[0]?.count || 0);

  console.log('Parsed - Courts:', totalCourtsCount, 'Instructors:', totalInstructorsCount);

  // Verificar ocupados
  const occupiedCourts = await prisma.$queryRaw`
    SELECT DISTINCT courtId 
    FROM CourtSchedule
    WHERE date = ${date}
    AND isOccupied = 1
  `;

  console.log('Occupied Courts:', occupiedCourts);

  await prisma.$disconnect();
}

testAvailability();
