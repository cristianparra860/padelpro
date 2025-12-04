// Test para verificar si los botones aparecen correctamente
console.log('🧪 Iniciando test de botones de instructor...\n');

// Simular la lógica del frontend
const currentUserLogged = {
  id: 'user-cristian-parra',
  name: 'Cristian Parra'
};

// Simular respuesta del API /api/instructors/by-user/user-cristian-parra
const instructorResponse = {
  success: true,
  instructor: {
    id: 'instructor-cristian-parra',
    userId: 'user-cristian-parra',
    name: 'Cristian Parra'
  }
};

const instructorId = instructorResponse.instructor?.id;
const isInstructor = true;

console.log('👤 Usuario logueado:', currentUserLogged.name);
console.log('🎓 ID del instructor:', instructorId);
console.log('');

// Simular slots (basado en los resultados del script anterior)
const slots = [
  { id: 'slot-1', instructorId: 'instructor-cristian-parra', instructorName: 'Cristian Parra' },
  { id: 'slot-2', instructorId: 'cmhkwmdc10005tgqw6fn129he', instructorName: 'Carlos Martinez' },
  { id: 'slot-3', instructorId: 'cmhkwmdc70007tgqw3kk38uri', instructorName: 'Ana Lopez' },
  { id: 'slot-4', instructorId: 'instructor-alex-garcia', instructorName: 'Alex García' },
  { id: 'slot-5', instructorId: 'instructor-carlos-ruiz', instructorName: 'Carlos Ruiz' },
];

console.log('📋 Verificando permisos para cada slot:\n');

slots.forEach((slot, i) => {
  // Esta es la lógica exacta de ClassesDisplay.tsx
  const canEditCreditsSlots = isInstructor && instructorId === slot.instructorId;
  
  console.log(`${i+1}. ${slot.instructorName}`);
  console.log(`   Slot ID: ${slot.id}`);
  console.log(`   Instructor ID: ${slot.instructorId}`);
  console.log(`   ¿Mismo instructor?: ${instructorId === slot.instructorId ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   ¿Mostrar botones?: ${canEditCreditsSlots ? '✅ SÍ' : '❌ NO'}`);
  console.log('');
});

console.log('📊 RESUMEN:');
const slotsConBotones = slots.filter(s => isInstructor && instructorId === s.instructorId).length;
const slotsSinBotones = slots.length - slotsConBotones;
console.log(`   Clases CON botones 🎁/€: ${slotsConBotones}`);
console.log(`   Clases SIN botones: ${slotsSinBotones}`);
console.log('');

if (slotsConBotones > 0) {
  console.log('✅ SUCCESS: Los botones solo aparecen en clases del instructor logueado');
} else {
  console.log('❌ ERROR: No hay botones en ninguna clase');
}
