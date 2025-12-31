// Script para añadir datos de prueba para el 1 de enero de 2026
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clubId = 'club-1';
  const instructorId = 'cmjn2528h0001tgysr5c6j7pd'; // Carlos Rodriguez
  const courtId = 'court-1';
  
  // Fecha: 1 de enero de 2026
  const baseDate = new Date('2026-01-01');
  
  console.log('🔧 Creando TimeSlots para el 1 de enero de 2026...');
  
  // Crear TimeSlots (propuestas de clase) para el 1 de enero
  const timeSlots = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const start = new Date(baseDate);
      start.setHours(hour, minute, 0, 0);
      
      const end = new Date(start);
      end.setHours(hour, minute + 60, 0, 0);
      
      const slot = await prisma.timeSlot.create({
        data: {
          clubId,
          instructorId,
          start,
          end,
          maxPlayers: 4,
          totalPrice: 48,
          instructorPrice: 28,
          courtRentalPrice: 20,
          level: '3.5-5',
          category: 'general',
          genderCategory: 'masculino',
          levelRange: '3.5-5',
          status: 'pre_registration'
        }
      });
      
      timeSlots.push(slot);
      console.log(`✅ Creado TimeSlot: ${start.toLocaleTimeString()}`);
    }
  }
  
  console.log(`\n✨ Total TimeSlots creados: ${timeSlots.length}`);
  
  // Crear una clase confirmada para las 10:00
  console.log('\n🔧 Creando clase confirmada para las 10:00...');
  const confirmedClass = await prisma.timeSlot.create({
    data: {
      clubId,
      instructorId,
      courtId,
      courtNumber: 1,
      start: new Date('2026-01-01T10:00:00.000Z'),
      end: new Date('2026-01-01T11:00:00.000Z'),
      maxPlayers: 4,
      totalPrice: 48,
      instructorPrice: 28,
      courtRentalPrice: 20,
      level: '3.5-5',
      category: 'general',
      genderCategory: 'masculino',
      levelRange: '3.5-5',
      status: 'confirmed',
      bookings: {
        create: [
          {
            userId: 'cmjmrxqpq000jtg8c7jmtlhps', // Ana González
            groupSize: 2,
            spotIndex: 1,
            status: 'CONFIRMED',
            activityType: 'class'
          }
        ]
      }
    }
  });
  
  console.log('✅ Clase confirmada creada con 1 booking (2 alumnos)');
  
  // Crear MatchGames (propuestas de partidas) para el 1 de enero
  console.log('\n🔧 Creando MatchGames para el 1 de enero...');
  const matchGames = [];
  for (let hour = 14; hour <= 20; hour += 2) {
    const start = new Date('2026-01-01');
    start.setHours(hour, 0, 0, 0);
    
    const end = new Date(start);
    end.setTime(start.getTime() + 90 * 60 * 1000); // 90 minutos
    
    const matchGame = await prisma.matchGame.create({
      data: {
        clubId,
        start,
        end,
        level: '3.5-5',
        category: 'general',
        genderCategory: 'masculino',
        maxPlayers: 4,
        status: 'forming'
      }
    });
    
    matchGames.push(matchGame);
    console.log(`✅ Creado MatchGame: ${start.toLocaleTimeString()}`);
  }
  
  console.log(`\n✨ Total MatchGames creados: ${matchGames.length}`);
  console.log('\n🎉 ¡Datos de prueba creados exitosamente para el 1 de enero de 2026!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
