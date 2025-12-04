const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyUserView() {
  console.log('🔍 Verificación: Vista de usuario de plazas con puntos\n');
  
  // 1. Buscar slots con creditsSlots configurados
  const slotsWithCredits = await prisma.timeSlot.findMany({
    where: {
      creditsSlots: { not: null },
      start: { gte: new Date() }
    },
    include: {
      instructor: {
        select: { name: true }
      },
      bookings: {
        select: {
          id: true,
          groupSize: true,
          status: true
        }
      }
    },
    take: 10,
    orderBy: { start: 'asc' }
  });
  
  console.log(`📊 Total slots con creditsSlots configurados: ${slotsWithCredits.length}\n`);
  
  if (slotsWithCredits.length === 0) {
    console.log('⚠️ No hay slots con creditsSlots configurados.');
    console.log('🎯 Configurando slot de ejemplo...\n');
    
    // Encontrar un slot futuro disponible
    const futureSlot = await prisma.timeSlot.findFirst({
      where: {
        start: { gte: new Date() },
        courtId: null
      },
      include: {
        instructor: { select: { name: true } }
      }
    });
    
    if (futureSlot) {
      // Configurar modalidad de 2 jugadores como reservable con puntos
      await prisma.timeSlot.update({
        where: { id: futureSlot.id },
        data: {
          creditsSlots: [2], // Solo la modalidad de 2 jugadores
          creditsCost: 50
        }
      });
      
      console.log('✅ Slot configurado con creditsSlots:');
      console.log(`   ID: ${futureSlot.id}`);
      console.log(`   Fecha: ${new Date(futureSlot.start).toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${futureSlot.instructor?.name || 'Sin nombre'}`);
      console.log(`   creditsSlots: [2]`);
      console.log(`   creditsCost: 50\n`);
      
      slotsWithCredits.push({
        ...futureSlot,
        creditsSlots: [2],
        creditsCost: 50,
        bookings: []
      });
    }
  }
  
  console.log('─'.repeat(60));
  console.log('\n🎨 VISTA DEL USUARIO (NO INSTRUCTOR):\n');
  
  slotsWithCredits.slice(0, 5).forEach((slot, i) => {
    const date = new Date(slot.start).toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let creditsSlots = [];
    try {
      creditsSlots = typeof slot.creditsSlots === 'string' 
        ? JSON.parse(slot.creditsSlots)
        : (Array.isArray(slot.creditsSlots) ? slot.creditsSlots : []);
    } catch (e) {
      console.error('Error parseando creditsSlots:', e);
    }
    
    const creditsCost = slot.creditsCost || 50;
    
    console.log(`${i + 1}. ${date}`);
    console.log(`   Instructor: ${slot.instructor?.name || 'Sin nombre'}`);
    console.log(`   creditsSlots activos: [${creditsSlots.join(', ')}]`);
    console.log(`   Costo en puntos: ${creditsCost}p\n`);
    
    // Simular cómo se ve cada modalidad
    [1, 2, 3, 4].forEach(modality => {
      const isCreditsSlot = creditsSlots.includes(modality);
      const bookingsForModality = slot.bookings?.filter(b => b.groupSize === modality && b.status === 'CONFIRMED') || [];
      const isOccupied = bookingsForModality.length > 0;
      
      console.log(`   📍 Modalidad ${modality} jugador${modality > 1 ? 'es' : ''}:`);
      
      if (isOccupied) {
        console.log(`      ✅ Ocupado (${bookingsForModality.length}/${modality})`);
        console.log(`      🎨 Círculo: Borde verde, foto/iniciales`);
      } else if (isCreditsSlot) {
        console.log(`      🎁 PLAZA CON PUNTOS`);
        console.log(`      🎨 Visual:`);
        console.log(`         • Círculo: Fondo ÁMBAR (bg-amber-50)`);
        console.log(`         • Borde: SÓLIDO ámbar (border-amber-500)`);
        console.log(`         • Icono: 🎁 Regalo (text-amber-600)`);
        console.log(`         • Brillo: Glow dorado pulsante`);
        console.log(`         • Texto debajo: "${creditsCost}p" en color ámbar`);
        console.log(`         • Precio derecha: 🎁 Distintivo dorado "Puntos"`);
      } else {
        console.log(`      ⚪ Plaza normal (euros)`);
        console.log(`      🎨 Visual:`);
        console.log(`         • Círculo: Fondo blanco`);
        console.log(`         • Borde: DISCONTINUO verde (border-dashed)`);
        console.log(`         • Símbolo: + (verde)`);
        console.log(`         • Texto debajo: "Libre" en verde`);
        console.log(`         • Precio derecha: € X.XX`);
      }
      console.log('');
    });
    
    console.log('   ' + '─'.repeat(50) + '\n');
  });
  
  console.log('📋 RESUMEN DE LO QUE DEBE VER EL USUARIO:\n');
  console.log('✅ Plazas con puntos activadas:');
  console.log('   • Fondo de círculo: Color ámbar claro brillante');
  console.log('   • Borde: Sólido ámbar (no discontinuo)');
  console.log('   • Icono dentro: 🎁 Regalo dorado');
  console.log('   • Animación: Pulso/glow dorado suave');
  console.log('   • Texto: "50p" (o puntos configurados) en ámbar');
  console.log('   • Precio: Distintivo dorado con "🎁 Puntos"\n');
  
  console.log('⚪ Plazas normales (euros):');
  console.log('   • Fondo de círculo: Blanco');
  console.log('   • Borde: Discontinuo verde');
  console.log('   • Símbolo: +');
  console.log('   • Texto: "Libre" en verde');
  console.log('   • Precio: € seguido del precio\n');
  
  console.log('🔑 Diferencia CLAVE: Los usuarios VEN pero NO pueden EDITAR');
  console.log('   • Sin botones 🎁/€ en esquina superior (solo instructores)');
  console.log('   • Pueden reservar con puntos en plazas doradas');
  console.log('   • Pueden reservar con euros en plazas verdes');
  
  await prisma.$disconnect();
}

verifyUserView().catch(console.error);
