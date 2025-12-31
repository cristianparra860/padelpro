const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Actualizando conceptos de transacciones de match games...');
  
  // Buscar transacciones de match games con ID en el concepto
  const transactions = await prisma.transaction.findMany({
    where: {
      relatedType: 'matchGameBooking',
      type: 'credit',
      concept: { contains: 'cmj' } // IDs de matchGame empiezan con 'cmj'
    }
  });

  console.log(`📊 Found ${transactions.length} match game transactions to update`);

  for (const tx of transactions) {
    // Buscar el booking usando relatedId
    const booking = await prisma.matchGameBooking.findUnique({
      where: { id: tx.relatedId },
      include: { matchGame: true }
    });

    if (!booking || !booking.matchGame) {
      console.log(`  ⚠️ Skipping ${tx.id} - no matchGame found`);
      continue;
    }

    const matchGame = booking.matchGame;
    const matchDate = new Date(matchGame.start).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Extraer el tipo de acción del concepto original
    let action = 'Reserva de partida';
    if (tx.concept.includes('Desbloqueo')) action = 'Desbloqueo por conflicto con partida';
    if (tx.concept.includes('Reembolso')) action = 'Reembolso por partida perdedora';
    if (tx.concept.includes('Pago')) action = 'Pago de partida';
    if (tx.concept.includes('cancelación')) action = 'Reembolso por cancelación de partida';
    if (tx.concept.includes('Sin pistas')) action = 'Reembolso - Sin pistas disponibles';

    const newConcept = `${action} ${matchDate}`;
    
    console.log(`  - ${tx.id}: "${tx.concept}" → "${newConcept}"`);
    
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { concept: newConcept }
    });
  }

  console.log('✅ Conceptos actualizados correctamente');

  await prisma.$disconnect();
}

main().catch(console.error);
