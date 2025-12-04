const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateFullFlow() {
  console.log('🔄 Simulando flujo completo del navegador\n');
  console.log('═'.repeat(70) + '\n');
  
  // Paso 1: Cargar timeSlots (lo que hace loadTimeSlots)
  console.log('📅 PASO 1: Cargar timeSlots del día\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: { gte: today, lt: tomorrow },
      courtId: null,
      instructorId: 'instructor-cristian-parra'
    },
    select: {
      id: true,
      start: true,
      end: true,
      totalPrice: true,
      creditsSlots: true,
      creditsCost: true
    },
    orderBy: { start: 'asc' },
    take: 5
  });
  
  console.log(`✅ Encontrados ${slots.length} slots de Cristian Parra\n`);
  
  if (slots.length === 0) {
    console.log('❌ No hay slots disponibles');
    await prisma.$disconnect();
    return;
  }
  
  // Paso 2: Simular batch load de creditsSlots
  console.log('📦 PASO 2: Cargar creditsSlots en batch\n');
  
  const slotIds = slots.map(s => s.id);
  console.log(`   Slot IDs: [${slotIds.map(id => id.substring(0, 12) + '...').join(', ')}]\n`);
  
  // Simular lo que hace el endpoint
  const creditsSlotsMap = {};
  
  for (const slot of slots) {
    if (slot.creditsSlots) {
      try {
        const parsed = typeof slot.creditsSlots === 'string' 
          ? JSON.parse(slot.creditsSlots) 
          : slot.creditsSlots;
        creditsSlotsMap[slot.id] = Array.isArray(parsed) ? parsed : [];
      } catch {
        creditsSlotsMap[slot.id] = [];
      }
    } else {
      creditsSlotsMap[slot.id] = [];
    }
  }
  
  console.log(`✅ Mapa de creditsSlots cargado:`);
  Object.entries(creditsSlotsMap).forEach(([id, credits]) => {
    console.log(`   ${id.substring(0, 15)}... → [${credits.join(', ')}]`);
  });
  console.log('');
  
  // Paso 3: Simular renderizado de ClassCardReal
  console.log('🎨 PASO 3: Renderizar ClassCardReal\n');
  
  const targetSlot = slots.find(s => s.id.includes('z9y4veby1rd'));
  
  if (!targetSlot) {
    console.log('⚠️ El slot actualizado no está en la lista');
    console.log('   Primeros 3 slots:');
    slots.slice(0, 3).forEach((s, i) => {
      const time = new Date(s.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   ${i + 1}. ${time} - ${s.id.substring(0, 20)}...`);
    });
  } else {
    const date = new Date(targetSlot.start).toLocaleString('es-ES');
    console.log(`✅ Slot encontrado: ${targetSlot.id}`);
    console.log(`   Fecha: ${date}`);
    console.log(`   creditsSlots prop: [${creditsSlotsMap[targetSlot.id].join(', ')}]`);
    console.log(`   creditsCost: ${targetSlot.creditsCost}\n`);
    
    console.log('🎨 Evaluación por modalidad:\n');
    
    [1, 2, 3, 4].forEach(players => {
      const creditsSlots = creditsSlotsMap[targetSlot.id] || [];
      const isCreditsSlot = Array.isArray(creditsSlots) && creditsSlots.includes(players);
      
      console.log(`   Modalidad ${players} jugador${players > 1 ? 'es' : ''}:`);
      console.log(`      creditsSlots = [${creditsSlots.join(', ')}]`);
      console.log(`      Array.isArray = ${Array.isArray(creditsSlots)}`);
      console.log(`      includes(${players}) = ${creditsSlots.includes(players)}`);
      console.log(`      isCreditsSlot = ${isCreditsSlot}`);
      
      if (isCreditsSlot) {
        console.log(`      ✅ VISUAL: 🎁 Fondo ámbar, icono regalo, "50p"`);
      } else {
        console.log(`      ⚪ VISUAL: Fondo blanco, borde verde discontinuo, "+"`);
      }
      console.log('');
    });
  }
  
  console.log('─'.repeat(70));
  console.log('\n🔍 DIAGNÓSTICO:\n');
  
  if (targetSlot) {
    const creditsArray = creditsSlotsMap[targetSlot.id];
    if (creditsArray && creditsArray.length > 0) {
      console.log('✅ Los datos están correctos en la base de datos');
      console.log('✅ El parsing funciona correctamente');
      console.log('✅ La evaluación isCreditsSlot es correcta');
      console.log('\n🎯 Si no se ve en el navegador, el problema está en:');
      console.log('   1. El componente no está recibiendo el prop creditsSlots');
      console.log('   2. El estado local no se sincroniza con el prop');
      console.log('   3. Hay un error en el renderizado del CSS');
      console.log('\n💡 Abre la consola del navegador (F12) y busca:');
      console.log('   - "🎁 Cargados creditsSlots" → Confirma que el batch se ejecuta');
      console.log('   - "🔄 ClassCard ... Sincronizando" → Confirma que el prop llega');
      console.log('   - "🐛 DEBUG slot" → Muestra la evaluación de isCreditsSlot');
    } else {
      console.log('❌ Los creditsSlots están vacíos en el mapa');
      console.log('   El slot tiene creditsSlots pero el parsing falló');
    }
  } else {
    console.log('⚠️ El slot actualizado no aparece en la lista de hoy');
    console.log('   Verifica que el slot tenga:');
    console.log('   - instructorId: instructor-cristian-parra');
    console.log('   - courtId: NULL');
    console.log('   - start: hoy (2 dic 2025)');
  }
  
  await prisma.$disconnect();
}

simulateFullFlow().catch(console.error);
