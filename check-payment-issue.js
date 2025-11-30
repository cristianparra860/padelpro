const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPaymentIssue() {
  try {
    console.log('=== CHECKING PAYMENT ISSUE ===\n');
    
    // 1. Buscar todas las transacciones recientes
    const recentTransactions = await prisma.$queryRaw`
      SELECT * FROM "Transaction" 
      ORDER BY createdAt DESC 
      LIMIT 20
    `;
    
    console.log('Últimas 20 transacciones:');
    recentTransactions.forEach(t => {
      console.log(`  Amount: ${t.amount}€ | Type: ${t.type} | Action: ${t.action} | Concept: ${t.concept} | Date: ${new Date(Number(t.createdAt)).toLocaleString()}`);
    });
    
    // 2. Buscar todos los bookings recientes
    const recentBookings = await prisma.$queryRaw`
      SELECT 
        b.id, b.userId, b.status, b.groupSize, b.amountBlocked, b.timeSlotId, b.createdAt,
        t.start, t.totalPrice, t.maxPlayers, t.courtNumber,
        u.name as userName, u.email as userEmail
      FROM Booking b
      JOIN TimeSlot t ON b.timeSlotId = t.id
      JOIN User u ON b.userId = u.id
      ORDER BY b.createdAt DESC
      LIMIT 10
    `;
    
    console.log('\n\n🔍 Últimos 10 bookings:');
    recentBookings.forEach(b => {
      console.log(`\n  📅 Booking ID: ${b.id}`);
      console.log(`  👤 User: ${b.userName} (${b.userEmail})`);
      console.log(`  📊 Status: ${b.status}`);
      console.log(`  👥 GroupSize: ${b.groupSize}`);
      console.log(`  💰 AmountBlocked: ${b.amountBlocked}€`);
      console.log(`  🕐 Class time: ${new Date(Number(b.start)).toLocaleString()}`);
      console.log(`  💵 TimeSlot totalPrice: ${b.totalPrice}€`);
      console.log(`  👥 TimeSlot maxPlayers: ${b.maxPlayers}`);
      console.log(`  🎾 Court: ${b.courtNumber || 'Not assigned'}`);
      console.log(`  🧮 Expected price per player: ${(b.totalPrice / b.groupSize).toFixed(2)}€`);
      console.log(`  ⚠️  AmountBlocked should be: ${(b.totalPrice / b.groupSize).toFixed(2)}€ but is: ${b.amountBlocked}€`);
      if (b.amountBlocked !== parseFloat((b.totalPrice / b.groupSize).toFixed(2))) {
        console.log(`  🚨 MISMATCH! Difference: ${(parseFloat((b.totalPrice / b.groupSize).toFixed(2)) - b.amountBlocked).toFixed(2)}€`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentIssue();
