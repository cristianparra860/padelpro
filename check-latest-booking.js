// Script para verificar la última reserva realizada
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestBooking() {
  try {
    console.log('\n🔍 VERIFICANDO ÚLTIMA RESERVA\n');
    console.log('='.repeat(60));
    
    // Obtener la última reserva
    const latestBooking = await prisma.booking.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            credits: true
          }
        },
        timeSlot: {
          select: {
            id: true,
            start: true,
            end: true,
            level: true,
            courtNumber: true
          }
        }
      }
    });
    
    if (!latestBooking) {
      console.log('❌ No se encontraron reservas en la base de datos');
      return;
    }
    
    console.log('\n📋 ÚLTIMA RESERVA:');
    console.log('─'.repeat(60));
    console.log(`ID Reserva: ${latestBooking.id}`);
    console.log(`Estado: ${latestBooking.status}`);
    console.log(`Grupo: ${latestBooking.groupSize} jugadores`);
    console.log(`Créditos bloqueados: ${latestBooking.amountBlocked}€`);
    console.log(`Creada: ${latestBooking.createdAt}`);
    
    console.log('\n👤 USUARIO QUE RESERVÓ:');
    console.log('─'.repeat(60));
    console.log(`ID: ${latestBooking.user.id}`);
    console.log(`Nombre: ${latestBooking.user.name}`);
    console.log(`Email: ${latestBooking.user.email}`);
    console.log(`Créditos actuales: ${latestBooking.user.credits}€`);
    
    console.log('\n🎾 CLASE:');
    console.log('─'.repeat(60));
    console.log(`ID TimeSlot: ${latestBooking.timeSlot.id}`);
    console.log(`Fecha/Hora: ${latestBooking.timeSlot.start}`);
    console.log(`Nivel: ${latestBooking.timeSlot.level}`);
    console.log(`Pista: ${latestBooking.timeSlot.courtNumber || 'Sin asignar'}`);
    
    console.log('\n' + '='.repeat(60));
    
    // Verificar si el usuario es Alex García
    if (latestBooking.user.email === 'alex@example.com') {
      console.log('\n⚠️ PROBLEMA CONFIRMADO: La reserva se hizo con Alex García');
      console.log('   Debería ser Juan Pérez (jugador1@padelpro.com)');
    } else {
      console.log('\n✅ La reserva se hizo con el usuario correcto');
    }
    
    // Mostrar últimas 5 reservas para contexto
    console.log('\n📚 ÚLTIMAS 5 RESERVAS (para contexto):');
    console.log('─'.repeat(60));
    
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        timeSlot: {
          select: {
            start: true
          }
        }
      }
    });
    
    recentBookings.forEach((b, i) => {
      console.log(`\n${i + 1}. ${b.user.name} (${b.user.email})`);
      console.log(`   Status: ${b.status} | Grupo: ${b.groupSize} | Fecha: ${new Date(b.timeSlot.start).toLocaleString('es-ES')}`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestBooking();
