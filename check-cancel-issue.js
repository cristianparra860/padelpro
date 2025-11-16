const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCancelIssue() {
  try {
    console.log('🔍 Investigando problema de cancelación...\n');
    
    // 1. Verificar usuario Alex Garcia
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'alex.garcia@email.com' },
          { name: { contains: 'Alex' } }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ No se encontró el usuario Alex Garcia');
      return;
    }
    
    console.log('👤 Usuario encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Créditos: ${user.credit / 100}€`);
    console.log(`   Puntos: ${user.points}`);
    console.log('');
    
    // 2. Verificar TODAS las transacciones del usuario
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Total de transacciones en BD: ${allTransactions.length}\n`);
    
    if (allTransactions.length > 0) {
      console.log('Últimas 5 transacciones:');
      allTransactions.slice(0, 5).forEach((tx, i) => {
        const date = new Date(tx.createdAt);
        console.log(`${i + 1}. ${tx.type} - ${tx.action} - ${tx.amount} - ${tx.concept}`);
        console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
      });
    } else {
      console.log('⚠️  NO HAY TRANSACCIONES REGISTRADAS EN LA BASE DE DATOS');
    }
    console.log('');
    
    // 3. Verificar reservas canceladas recientemente
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentBookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        updatedAt: {
          gte: BigInt(oneHourAgo)
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        timeSlot: true
      }
    });
    
    console.log(`🔖 Reservas modificadas en la última hora: ${recentBookings.length}\n`);
    
    if (recentBookings.length > 0) {
      recentBookings.forEach((booking, i) => {
        const updated = new Date(Number(booking.updatedAt));
        const slotTime = booking.timeSlot ? new Date(Number(booking.timeSlot.start)) : null;
        
        console.log(`${i + 1}. Booking ID: ${booking.id}`);
        console.log(`   Estado: ${booking.status}`);
        console.log(`   Precio: ${booking.price}€`);
        console.log(`   CourtNumber: ${booking.timeSlot?.courtNumber || 'null'}`);
        console.log(`   Clase: ${slotTime ? slotTime.toLocaleString('es-ES') : 'N/A'}`);
        console.log(`   Actualizada: ${updated.toLocaleString('es-ES')}`);
        console.log('');
      });
    }
    
    // 4. Ver TODAS las reservas del usuario
    const allBookings = await prisma.booking.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });
    
    console.log(`📋 Total de reservas (últimas 10): ${allBookings.length}\n`);
    allBookings.forEach((b, i) => {
      console.log(`${i + 1}. ID: ${b.id} - Estado: ${b.status} - Precio: ${b.price}€`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCancelIssue();
