// Script para verificar el estado de las reservas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificar() {
  try {
    console.log('=== VERIFICANDO RESERVAS DEL DÍA 20 A LAS 8:00 ===\n');
    
    // Buscar slots del día 20 a las 8:00
    const fecha20 = new Date('2025-11-20T08:00:00.000Z');
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: fecha20,
          lt: new Date(fecha20.getTime() + 3600000) // +1 hora
        }
      }
    });
    
    console.log(`Slots encontrados para el 20 a las 8:00: ${slots.length}`);
    
    if (slots.length > 0) {
      for (const slot of slots) {
        console.log(`\n📅 TimeSlot ID: ${slot.id}`);
        console.log(`   Hora: ${new Date(Number(slot.start)).toLocaleString('es-ES')}`);
        console.log(`   Pista: ${slot.courtNumber || 'Sin asignar'}`);
        
        // Buscar TODAS las reservas de este slot (incluyendo canceladas)
        const todasReservas = await prisma.booking.findMany({
          where: { timeSlotId: slot.id },
          include: { user: { select: { name: true } } }
        });
        
        console.log(`   Total reservas: ${todasReservas.length}`);
        
        todasReservas.forEach(b => {
          console.log(`   - ${b.user.name}: ${b.status} (${b.groupSize} jugadores)`);
        });
        
        // Contar activas vs canceladas
        const activas = todasReservas.filter(b => b.status !== 'CANCELLED').length;
        const canceladas = todasReservas.filter(b => b.status === 'CANCELLED').length;
        
        console.log(`\n   ✅ Activas: ${activas}`);
        console.log(`   ❌ Canceladas: ${canceladas}`);
      }
    } else {
      console.log('No se encontraron slots para esa fecha/hora');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificar();
