const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRecycledClass() {
  console.log('🚀 Creando clase con plazas recicladas...\n');

  try {
    const clubId = 'padel-estrella-madrid';
    const instructorId = 'cmhkwmdc10005tgqw6fn129he'; // Carlos Martinez
    const courtId = 'cmhkwerqw0002tg1gjuibilfn'; // Pista 3
    const courtNumber = 3;
    
    // Fecha: Diciembre 9, 2025 a las 14:00
    const start = new Date('2025-12-09T14:00:00.000Z');
    const end = new Date('2025-12-09T15:00:00.000Z');
    
    // Crear TimeSlot con Prisma ORM
    const timeSlot = await prisma.timeSlot.create({
      data: {
        clubId,
        instructorId,
        courtId,
        courtNumber,
        start,
        end,
        maxPlayers: 4,
        instructorPrice: 20.0,
        courtRentalPrice: 10.0,
        totalPrice: 30.0,
        level: 'abierto',
        category: 'clase',
        genderCategory: 'mixto',
        hasRecycledSlots: true,
        availableRecycledSlots: 2,
        recycledSlotsOnlyPoints: true,
        creditsCost: 50
      }
    });
    
    console.log(`✅ TimeSlot creado: ${timeSlot.id}`);
    console.log(`   📅 Fecha: ${start.toLocaleString('es-ES')}`);
    console.log(`   🎾 Pista: ${courtNumber}`);
    console.log(`   ♻️ Plazas recicladas: 2\n`);
    
    // Crear 2 bookings CONFIRMED (ambos del mismo usuario)
    const userId = 'user-1763677110798-mq6nvxq88'; // María García
    
    const booking1 = await prisma.booking.create({
      data: {
        userId,
        timeSlotId: timeSlot.id,
        groupSize: 1,
        status: 'CONFIRMED',
        isRecycled: false,
        pointsUsed: 0
      }
    });
    
    const booking2 = await prisma.booking.create({
      data: {
        userId,
        timeSlotId: timeSlot.id,
        groupSize: 1,
        status: 'CONFIRMED',
        isRecycled: false,
        pointsUsed: 0
      }
    });
    
    console.log(`✅ Bookings activos creados: 2`);
    
    // Crear 2 bookings CANCELLED (reciclados)
    const booking3 = await prisma.booking.create({
      data: {
        userId,
        timeSlotId: timeSlot.id,
        groupSize: 1,
        status: 'CANCELLED',
        isRecycled: true,
        pointsUsed: 0
      }
    });
    
    const booking4 = await prisma.booking.create({
      data: {
        userId,
        timeSlotId: timeSlot.id,
        groupSize: 1,
        status: 'CANCELLED',
        isRecycled: true,
        pointsUsed: 0
      }
    });
    
    console.log(`♻️ Bookings cancelados/reciclados: 2\n`);
    
    console.log('🎉 ¡Clase demo creada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - TimeSlot ID: ${timeSlot.id}`);
    console.log(`   - Fecha: 9 de diciembre 2025, 14:00`);
    console.log(`   - Pista: ${courtNumber}`);
    console.log(`   - Estado: CONFIRMADA (courtNumber asignado)`);
    console.log(`   - Jugadores activos: 2/4`);
    console.log(`   - Plazas recicladas disponibles: 2`);
    console.log(`   - Solo con puntos: SÍ (50 puntos/plaza)`);
    console.log('\n✨ Esta clase DEBE mostrar el badge amarillo ♻️');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createRecycledClass();
