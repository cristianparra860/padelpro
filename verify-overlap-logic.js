// Verificar la lógica de detección de solapamiento

console.log("=== VERIFICACIÓN DE LÓGICA DE SOLAPAMIENTO ===\n");

// Función de solapamiento corregida
function overlaps(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// Casos de prueba
const testCases = [
  {
    name: "Caso 1: Solapamiento parcial al inicio",
    class1: { start: "08:00", end: "09:00" },
    class2: { start: "08:30", end: "09:30" },
    shouldOverlap: true
  },
  {
    name: "Caso 2: Solapamiento parcial al final",
    class1: { start: "08:30", end: "09:30" },
    class2: { start: "08:00", end: "09:00" },
    shouldOverlap: true
  },
  {
    name: "Caso 3: Una clase dentro de otra",
    class1: { start: "08:00", end: "10:00" },
    class2: { start: "08:30", end: "09:30" },
    shouldOverlap: true
  },
  {
    name: "Caso 4: Misma hora exacta",
    class1: { start: "08:00", end: "09:00" },
    class2: { start: "08:00", end: "09:00" },
    shouldOverlap: true
  },
  {
    name: "Caso 5: Clases consecutivas (NO solapan)",
    class1: { start: "08:00", end: "09:00" },
    class2: { start: "09:00", end: "10:00" },
    shouldOverlap: false
  },
  {
    name: "Caso 6: Clases separadas (NO solapan)",
    class1: { start: "08:00", end: "09:00" },
    class2: { start: "10:00", end: "11:00" },
    shouldOverlap: false
  }
];

// Convertir horas a timestamps para simular la DB
function timeToTimestamp(time) {
  const [hour, minute] = time.split(':');
  return new Date(2025, 0, 1, parseInt(hour), parseInt(minute)).getTime();
}

console.log("Probando algoritmo: start1 < end2 AND end1 > start2\n");

let allPassed = true;
testCases.forEach(test => {
  const start1 = timeToTimestamp(test.class1.start);
  const end1 = timeToTimestamp(test.class1.end);
  const start2 = timeToTimestamp(test.class2.start);
  const end2 = timeToTimestamp(test.class2.end);
  
  const result = overlaps(start1, end1, start2, end2);
  const passed = result === test.shouldOverlap;
  
  console.log(`${passed ? '✅' : '❌'} ${test.name}`);
  console.log(`   Clase A: ${test.class1.start} - ${test.class1.end}`);
  console.log(`   Clase B: ${test.class2.start} - ${test.class2.end}`);
  console.log(`   Resultado: ${result ? 'SOLAPAN' : 'NO SOLAPAN'}`);
  console.log(`   Esperado: ${test.shouldOverlap ? 'SOLAPAN' : 'NO SOLAPAN'}\n`);
  
  if (!passed) allPassed = false;
});

console.log("=".repeat(50));
console.log(allPassed ? "✅ TODOS LOS TESTS PASARON" : "❌ ALGUNOS TESTS FALLARON");
console.log("=".repeat(50));
