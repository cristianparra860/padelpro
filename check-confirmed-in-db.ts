import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfirmedInDB() {
  console.log('🔍 Verificando clases confirmadas en la base de datos\n');
  
  // Buscar clases con courtId o courtNumber asignados
  const withCourtId = await prisma.$queryRawUnsafe(`
    SELECT id, start, courtId, courtNumber, instructorId, createdAt, updatedAt
    FROM TimeSlot
    WHERE courtId IS NOT NULL
    LIMIT 10
  `) as any[];
  
  console.log(`📊 Clases con courtId asignado: ${withCourtId.length}`);
  withCourtId.forEach(cls => {
    console.log(`\n  ID: ${cls.id}`);
    console.log(`  Start: ${cls.start}`);
    console.log(`  courtId: ${cls.courtId}`);
    console.log(`  courtNumber: ${cls.courtNumber}`);
    console.log(`  Updated: ${cls.updatedAt}`);
  });
  
  console.log('\n---\n');
  
  const withCourtNumber = await prisma.$queryRawUnsafe(`
    SELECT id, start, courtId, courtNumber, instructorId, createdAt, updatedAt
    FROM TimeSlot
    WHERE courtNumber IS NOT NULL
    LIMIT 10
  `) as any[];
  
  console.log(`📊 Clases con courtNumber asignado: ${withCourtNumber.length}`);
  withCourtNumber.forEach(cls => {
    console.log(`\n  ID: ${cls.id}`);
    console.log(`  Start: ${cls.start}`);
    console.log(`  courtId: ${cls.courtId}`);
    console.log(`  courtNumber: ${cls.courtNumber}`);
    console.log(`  Updated: ${cls.updatedAt}`);
  });
  
  // Contar total de bookings confirmados
  const bookings = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM Booking WHERE status = 'CONFIRMED'
  `) as any[];
  
  console.log(`\n📋 Total bookings confirmados: ${bookings[0].count}`);
  
  await prisma.$disconnect();
}

checkConfirmedInDB();
