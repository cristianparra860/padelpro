const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentTransactions() {
  try {
    console.log('🔍 Verificando transacciones recientes de Alex Garcia (userId: 1)...\n');
    
    // Obtener las últimas 15 transacciones
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: '1'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 15
    });
    
    console.log(`📊 Total de transacciones encontradas: ${transactions.length}\n`);
    
    transactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt);
      const dateStr = date.toLocaleString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      console.log(`${index + 1}. ID: ${tx.id}`);
      console.log(`   Tipo: ${tx.type}`);
      console.log(`   Acción: ${tx.action}`);
      console.log(`   Monto: ${tx.amount} (${tx.type === 'credit' ? '€' : 'pts'})`);
      console.log(`   Balance después: ${tx.balance}`);
      console.log(`   Concepto: ${tx.concept}`);
      console.log(`   Fecha: ${dateStr}`);
      if (tx.metadata) {
        console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
      }
      console.log('');
    });
    
    // Verificar también reservas canceladas recientes
    console.log('\n📋 Verificando reservas canceladas en las últimas horas...\n');
    
    const now = Date.now();
    const twoHoursAgo = now - (2 * 60 * 60 * 1000);
    
    const cancelledBookings = await prisma.booking.findMany({
      where: {
        userId: '1',
        status: 'CANCELLED',
        updatedAt: {
          gte: new BigInt(twoHoursAgo)
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        timeSlot: true
      }
    });
    
    console.log(`🚫 Reservas canceladas encontradas: ${cancelledBookings.length}\n`);
    
    cancelledBookings.forEach((booking, index) => {
      const updatedDate = new Date(Number(booking.updatedAt));
      const slotDate = booking.timeSlot ? new Date(Number(booking.timeSlot.start)) : null;
      
      console.log(`${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   TimeSlot ID: ${booking.timeSlotId}`);
      console.log(`   Fecha de la clase: ${slotDate ? slotDate.toLocaleString('es-ES') : 'N/A'}`);
      console.log(`   Precio: ${booking.price}€`);
      console.log(`   Court Number: ${booking.timeSlot?.courtNumber || 'No asignada'}`);
      console.log(`   Estado: ${booking.status}`);
      console.log(`   Cancelada el: ${updatedDate.toLocaleString('es-ES')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentTransactions();
