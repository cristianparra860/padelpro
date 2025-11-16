// Verificar estado de la base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("=== VERIFICANDO BASE DE DATOS ===\n");
  
  // 1. Contar clases confirmadas
  const confirmed = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM TimeSlot WHERE courtNumber IS NOT NULL
  `;
  console.log(`📗 Clases confirmadas: ${confirmed[0].count}`);
  
  // 2. Contar propuestas
  const proposals = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM TimeSlot WHERE courtNumber IS NULL
  `;
  console.log(`🟧 Propuestas: ${proposals[0].count}`);
  
  // 3. Contar instructores
  const instructors = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM Instructor WHERE isActive = 1
  `;
  console.log(`👨‍🏫 Instructores activos: ${instructors[0].count}`);
  
  // 4. Mostrar algunas clases de ejemplo
  const sampleClasses = await prisma.$queryRaw`
    SELECT 
      id,
      instructorId,
      courtNumber,
      datetime(
        CASE 
          WHEN typeof(start) = 'integer' THEN start/1000
          ELSE strftime('%s', start)
        END,
        'unixepoch', 'localtime'
      ) as startFormatted
    FROM TimeSlot
    ORDER BY start DESC
    LIMIT 5
  `;
  
  console.log("\n📋 Últimas 5 clases:");
  sampleClasses.forEach(c => {
    console.log(`   - ${c.startFormatted} | Instructor: ${c.instructorId} | Pista: ${c.courtNumber || 'SIN ASIGNAR'}`);
  });
  
  await prisma.$disconnect();
}

checkDatabase();
