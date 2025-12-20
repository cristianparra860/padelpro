/**
 * Script para verificar si el campo unavailableHours existe en la tabla Instructor
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUnavailableHoursField() {
  try {
    console.log('🔍 Verificando campo unavailableHours en tabla Instructor...\n');
    
    // Intentar obtener un instructor con unavailableHours
    const instructor = await prisma.$queryRaw`
      SELECT id, name, hourlyRate, levelRanges, unavailableHours
      FROM Instructor
      LIMIT 1
    `;
    
    console.log('✅ Campo unavailableHours existe en la tabla Instructor');
    console.log('📋 Ejemplo de datos:', instructor[0]);
    
  } catch (error) {
    if (error.message.includes('no such column: Instructor.unavailableHours')) {
      console.log('❌ El campo unavailableHours NO existe en la tabla Instructor');
      console.log('\n📝 Necesitas agregar este campo al esquema Prisma y ejecutar una migración:');
      console.log('   1. Agregar en prisma/schema.prisma:');
      console.log('      unavailableHours String? // JSON con horarios de no disponibilidad por día');
      console.log('   2. Ejecutar: npx prisma db push');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUnavailableHoursField();
