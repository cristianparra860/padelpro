const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Buscando partida del 4 de enero a las 18:30...');
    
    // Buscar partida específica
    const matchGame = await prisma.matchGame.findFirst({
      where: {
        clubId: 'club-1',
        start: new Date('2026-01-04T18:30:00.000Z')
      }
    });
    
    if (!matchGame) {
      console.log('❌ No se encontró partida a las 18:30');
      return;
    }
    
    console.log('✅ Partida encontrada:', {
      id: matchGame.id.substring(0, 8),
      hora: matchGame.start.toISOString()
    });
    
    // Buscar usuario Alex
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario Alex no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', user.name);
    
    // Buscar pista disponible
    const court = await prisma.court.findFirst({
      where: { clubId: 'club-1' }
    });
    
    if (!court) {
      console.log('❌ Pista no encontrada');
      return;
    }
    
    console.log('✅ Pista encontrada:', court.courtNumber);
    
    // Crear TimeSlot (clase) con el MISMO horario que la partida
    console.log('📝 Creando TimeSlot...');
    const timeSlot = await prisma.timeSlot.create({
      data: {
        clubId: 'club-1',
        courtId: court.id,
        start: matchGame.start,
        end: matchGame.end,
        maxPlayers: 4,
        instructorPrice: 0,
        courtRentalPrice: 32,
        totalPrice: 32,
        level: '2.5-3.5',
        category: 'open',
        genderCategory: 'mixto'
      }
    });
    
    console.log('✅ TimeSlot creado:', timeSlot.id.substring(0, 8));
    
    // Crear booking (reserva)
    console.log('📝 Creando Booking...');
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        timeSlotId: timeSlot.id,
        status: 'CONFIRMED',
        groupSize: 4
      }
    });
    
    console.log('✅ Booking creado:', booking.id.substring(0, 8));
    console.log('\n🎉 ¡RESERVA DE PRUEBA CREADA EXITOSAMENTE!');
    console.log('🔄 Recarga la página de Partidas para ver la tarjeta naranja');
    console.log('📍 Busca la partida del 04 DOM a las 18:30');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  });
