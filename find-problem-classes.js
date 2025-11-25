const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProblem() {
  // Buscar las 2 clases de 22:30 con bookings
  const problem = await prisma.timeSlot.findMany({
    where: {
      start: new Date('2025-12-17T22:30:00.000Z'),
      bookings: { some: {} }
    },
    include: {
      bookings: {
        select: { id: true, groupSize: true, status: true, userId: true }
      },
      instructor: { select: { name: true } }
    }
  });
  
  console.log('=== CLASES PROBLEMA: 2025-12-17T22:30:00 ===\n');
  console.log(`Total encontradas: ${problem.length}\n`);
  
  problem.forEach(cls => {
    const date = new Date(cls.start);
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    const totalPlayers = cls.bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    
    console.log(`Instructor: ${cls.instructor?.name}`);
    console.log(`  Hora local: ${hourLocal} (23:30 hora España)`);
    console.log(`  CourtId: ${cls.courtId}`);
    console.log(`  Total players: ${totalPlayers}`);
    console.log(`  Bookings:`);
    cls.bookings.forEach(b => {
      console.log(`    - ID: ${b.id}, groupSize: ${b.groupSize}, status: ${b.status}`);
    });
    console.log(`  TimeSlot ID: ${cls.id}\n`);
  });
  
  // Verificar si estas clases deben eliminarse
  if (problem.length > 0) {
    console.log('  ACCIÓN REQUERIDA:');
    console.log('   Estas clases están fuera del horario correcto (después de 21:30 local)');
    console.log('   Opciones:');
    console.log('   1. Eliminar bookings y luego eliminar TimeSlots');
    console.log('   2. Contactar usuarios para mover reservas a otro horario');
  }
  
  await prisma.$disconnect();
}

findProblem();
