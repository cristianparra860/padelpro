const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function visualize() {
  console.log('🎨 VISUALIZACIÓN: Cómo ve el usuario las plazas con puntos\n');
  console.log('═'.repeat(70) + '\n');
  
  // Tomar un slot con creditsSlots configurados
  const slot = await prisma.timeSlot.findFirst({
    where: {
      creditsSlots: { not: '[]' },
      start: { gte: new Date() }
    },
    include: {
      instructor: { select: { name: true } },
      bookings: {
        where: { status: 'CONFIRMED' },
        select: { groupSize: true }
      }
    }
  });
  
  if (!slot) {
    console.log('❌ Slot no encontrado');
    await prisma.$disconnect();
    return;
  }
  
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
  } catch (e) {}
  
  console.log(`📅 CLASE: ${date}`);
  console.log(`👨‍🏫 Instructor: ${slot.instructor?.name || 'Sin nombre'}`);
  console.log(`🎁 Modalidades con puntos activas: [${creditsSlots.join(', ')}]\n`);
  console.log('─'.repeat(70) + '\n');
  
  // Visualizar cada modalidad
  [1, 2, 3, 4].forEach(modality => {
    const isCreditsSlot = creditsSlots.includes(modality);
    const bookingsCount = slot.bookings?.filter(b => b.groupSize === modality).length || 0;
    const isOccupied = bookingsCount > 0;
    
    console.log(`\n${'▀'.repeat(70)}`);
    console.log(`  MODALIDAD: ${modality} JUGADOR${modality > 1 ? 'ES' : ''}`);
    console.log('▀'.repeat(70));
    
    if (isOccupied) {
      console.log('\n  ✅ ESTADO: Ocupado\n');
      console.log('  🎨 VISUAL:');
      console.log('     ┌──────────────┐');
      console.log('     │   ●   ●   ●  │  Círculos con fotos/iniciales');
      console.log('     │  Borde verde │  (No importa si era puntos)');
      console.log('     └──────────────┘');
    } else if (isCreditsSlot) {
      console.log('\n  🎁 ESTADO: DISPONIBLE CON PUNTOS\n');
      console.log('  🎨 VISUAL DEL CÍRCULO:');
      console.log('     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
      console.log('     ┃  ╔════════════════════════════╗      ┃');
      console.log('     ┃  ║  🌟 FONDO ÁMBAR BRILLANTE  ║      ┃');
      console.log('     ┃  ║     (bg-amber-50)          ║      ┃');
      console.log('     ┃  ╚════════════════════════════╝      ┃');
      console.log('     ┃                                       ┃');
      console.log('     ┃  ┌─────────────────────────────┐     ┃');
      console.log('     ┃  │ Borde: SÓLIDO ámbar dorado  │     ┃');
      console.log('     ┃  │ (border-amber-500, no dash) │     ┃');
      console.log('     ┃  └─────────────────────────────┘     ┃');
      console.log('     ┃                                       ┃');
      console.log('     ┃         ┏━━━━━━━━━━━━━━┓            ┃');
      console.log('     ┃         ┃   🎁 REGALO  ┃            ┃');
      console.log('     ┃         ┃  text-amber  ┃            ┃');
      console.log('     ┃         ┗━━━━━━━━━━━━━━┛            ┃');
      console.log('     ┃                                       ┃');
      console.log('     ┃  💫 BRILLO: Glow dorado pulsante     ┃');
      console.log('     ┃     (shadow + animate-pulse)         ┃');
      console.log('     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
      console.log('');
      console.log('  📝 TEXTO DEBAJO:');
      console.log('     ╔═══════════════╗');
      console.log(`     ║   ${slot.creditsCost || 50}p (ámbar)  ║`);
      console.log('     ╚═══════════════╝');
      console.log('');
      console.log('  💰 PRECIO A LA DERECHA:');
      console.log('     ╔═══════════════════════════════╗');
      console.log('     ║  🎁 Distintivo dorado         ║');
      console.log(`     ║  "${slot.creditsCost || 50} Puntos"            ║`);
      console.log('     ║  (fondo: gradient amber)      ║');
      console.log('     ╚═══════════════════════════════╝');
    } else {
      console.log('\n  ⚪ ESTADO: DISPONIBLE (Euros)\n');
      console.log('  🎨 VISUAL DEL CÍRCULO:');
      console.log('     ┌──────────────────────────────┐');
      console.log('     │  ○  Fondo blanco             │');
      console.log('     │  ┊  Borde DISCONTINUO verde  │');
      console.log('     │  +  Símbolo + verde          │');
      console.log('     └──────────────────────────────┘');
      console.log('');
      console.log('  📝 TEXTO DEBAJO:');
      console.log('     ┌───────────────┐');
      console.log('     │ "Libre" verde │');
      console.log('     └───────────────┘');
      console.log('');
      console.log('  💰 PRECIO A LA DERECHA:');
      console.log('     ┌──────────────┐');
      console.log('     │  € X.XX      │');
      console.log('     └──────────────┘');
    }
    
    console.log('\n' + '▄'.repeat(70) + '\n');
  });
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 RESUMEN DE DIFERENCIAS VISUALES:\n');
  console.log('╔════════════════════════╦═══════════════════════╦═══════════════════════╗');
  console.log('║      ELEMENTO          ║   PLAZA CON PUNTOS    ║    PLAZA NORMAL       ║');
  console.log('╠════════════════════════╬═══════════════════════╬═══════════════════════╣');
  console.log('║ Fondo del círculo     ║   🟡 Ámbar brillante  ║   ⚪ Blanco           ║');
  console.log('║ Borde del círculo     ║   ━━ Sólido ámbar    ║   ┈┈ Discontinuo verde║');
  console.log('║ Icono/símbolo         ║   🎁 Regalo dorado    ║   + verde             ║');
  console.log('║ Efecto visual         ║   💫 Glow pulsante    ║   Sin efectos         ║');
  console.log('║ Texto debajo          ║   "50p" ámbar         ║   "Libre" verde       ║');
  console.log('║ Precio derecha        ║   🎁 Distintivo oro   ║   € X.XX              ║');
  console.log('║ Botones edición       ║   ❌ NO (solo visual) ║   ❌ NO               ║');
  console.log('╚════════════════════════╩═══════════════════════╩═══════════════════════╝');
  
  console.log('\n🔑 PUNTOS CLAVE:\n');
  console.log('   1. Los usuarios VEN las plazas con puntos (visual dorado)');
  console.log('   2. Los usuarios NO ven botones 🎁/€ (solo instructores)');
  console.log('   3. La diferencia es MUY clara: dorado brillante vs verde');
  console.log('   4. Los usuarios PUEDEN reservar con puntos en plazas doradas');
  console.log('');
  
  await prisma.$disconnect();
}

visualize().catch(console.error);
