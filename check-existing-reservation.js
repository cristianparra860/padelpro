// Ver detalles de la reserva existente
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReservation() {
  try {
    const userId = 'cmjmrxqpq000jtg8c7jmtlhps';
    
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    console.log('👤 Usuario que hizo la reserva:');
    console.log(`   Nombre: ${user?.name || 'N/A'}`);
    console.log(`   Email: ${user?.email || 'N/A'}`);
    console.log(`   Créditos actuales: ${user ? (Number(user.credits)/100).toFixed(2) : '0'}€\n`);
    
    // Buscar la reserva
    const reservation = await prisma.courtSchedule.findUnique({
      where: { id: 'cmk429yua0001tgvk7192yxka' },
      include: {
        court: true
      }
    });
    
    if (reservation) {
      const start = new Date(reservation.startTime);
      const end = new Date(reservation.endTime);
      const duration = Math.round((end - start) / 1000 / 60);
      
      console.log('📋 Detalles de la reserva:');
      console.log(`   ID: ${reservation.id}`);
      console.log(`   Pista: ${reservation.court.name} (${reservation.court.number})`);
      console.log(`   Fecha: ${start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`);
      console.log(`   Hora: ${start.toLocaleTimeString('es-ES')} - ${end.toLocaleTimeString('es-ES')}`);
      console.log(`   Duración: ${duration} minutos`);
      console.log(`   Estado: ${reservation.isOccupied ? 'Ocupada' : 'Disponible'}`);
      console.log(`   Creada: ${new Date(reservation.createdAt).toLocaleString('es-ES')}\n`);
    }
    
    // Buscar transacción asociada
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId: userId,
        relatedId: 'cmk429yua0001tgvk7192yxka',
        relatedType: 'court_reservation'
      }
    });
    
    if (transaction) {
      console.log('💰 Transacción asociada:');
      console.log(`   Concepto: ${transaction.concept}`);
      console.log(`   Monto: -${transaction.amount}€`);
      console.log(`   Fecha: ${new Date(transaction.createdAt).toLocaleString('es-ES')}\n`);
    }
    
    console.log('✅ La reserva YA EXISTE - por eso el sistema rechaza crear una duplicada');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservation();
