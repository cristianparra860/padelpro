const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHideFromHistory() {
  try {
    console.log('🧪 Verificando funcionalidad de ocultar del historial\n');
    
    // 1. Buscar reservas pasadas del usuario Alex García
    const alexUser = await prisma.user.findFirst({
      where: { name: 'Alex García' }
    });
    
    if (!alexUser) {
      console.log('❌ No se encontró el usuario Alex García');
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${alexUser.name} (${alexUser.id})\n`);
    
    // 2. Buscar reservas de clases pasadas
    const now = Date.now();
    const pastBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        b.hiddenFromHistory,
        ts.start,
        ts.courtNumber
      FROM Booking b
      INNER JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${alexUser.id}
        AND ts.start < ${now}
      ORDER BY ts.start DESC
      LIMIT 5
    `;
    
    console.log(`📊 Reservas de clases pasadas: ${pastBookings.length}\n`);
    
    if (pastBookings.length > 0) {
      console.log('Primeras 5 reservas pasadas:');
      pastBookings.forEach((booking, i) => {
        const date = new Date(booking.start);
        console.log(`\n${i + 1}. ID: ${booking.id}`);
        console.log(`   Fecha: ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`   Estado: ${booking.status}`);
        console.log(`   Oculta: ${booking.hiddenFromHistory ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Pista: ${booking.courtNumber || 'Sin asignar'}`);
      });
    }
    
    // 3. Buscar reservas de partidas pasadas
    const pastMatchBookings = await prisma.$queryRaw`
      SELECT 
        mb.id,
        mb.status,
        mb.hiddenFromHistory,
        mg.start,
        mg.courtNumber
      FROM MatchGameBooking mb
      INNER JOIN MatchGame mg ON mb.matchGameId = mg.id
      WHERE mb.userId = ${alexUser.id}
        AND mg.start < ${now}
      ORDER BY mg.start DESC
      LIMIT 5
    `;
    
    console.log(`\n\n📊 Reservas de partidas pasadas: ${pastMatchBookings.length}\n`);
    
    if (pastMatchBookings.length > 0) {
      console.log('Primeras 5 reservas de partidas pasadas:');
      pastMatchBookings.forEach((booking, i) => {
        const date = new Date(booking.start);
        console.log(`\n${i + 1}. ID: ${booking.id}`);
        console.log(`   Fecha: ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`   Estado: ${booking.status}`);
        console.log(`   Oculta: ${booking.hiddenFromHistory ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Pista: ${booking.courtNumber || 'Sin pista'}`);
      });
    }
    
    // 4. Verificar que los campos existen en la base de datos
    console.log('\n\n🔍 Verificando estructura de base de datos...\n');
    
    const bookingSchema = await prisma.$queryRaw`
      PRAGMA table_info(Booking)
    `;
    
    const hasHiddenField = bookingSchema.some(col => col.name === 'hiddenFromHistory');
    console.log(`   Booking.hiddenFromHistory: ${hasHiddenField ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    
    const matchBookingSchema = await prisma.$queryRaw`
      PRAGMA table_info(MatchGameBooking)
    `;
    
    const matchHasHiddenField = matchBookingSchema.some(col => col.name === 'hiddenFromHistory');
    console.log(`   MatchGameBooking.hiddenFromHistory: ${matchHasHiddenField ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    
    // 5. Simular ocultamiento (sin ejecutar)
    if (pastBookings.length > 0 && !pastBookings[0].hiddenFromHistory) {
      const testBooking = pastBookings[0];
      console.log(`\n\n✅ Funcionalidad lista para usar`);
      console.log(`\n📝 Para ocultar la reserva ${testBooking.id}, ejecutar:`);
      console.log(`   PATCH /api/bookings/${testBooking.id}/hide`);
      console.log(`\n   O desde el panel de usuario, click en "Eliminar" en la pestaña "Pasadas"`);
    }
    
    console.log('\n\n✅ Verificación completa');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHideFromHistory();
