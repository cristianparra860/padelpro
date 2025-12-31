// Script para verificar configuración de precios de Pedro López y el club
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPriceConfiguration() {
  try {
    console.log('🔍 Verificando configuración de precios...\n');
    
    // Buscar instructor Pedro López
    const instructor = await prisma.instructor.findFirst({
      where: {
        user: {
          name: {
            contains: 'Pedro'
          }
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        club: {
          select: {
            id: true,
            name: true,
            courtRentalPrice: true
          }
        }
      }
    });
    
    if (!instructor) {
      console.log('❌ No se encontró instructor Pedro López');
      return;
    }
    
    console.log('👤 Instructor: Pedro López');
    console.log('  - ID:', instructor.id);
    console.log('  - Email:', instructor.user.email);
    console.log('  - hourlyRate:', instructor.hourlyRate || 'NO CONFIGURADO');
    console.log('  - defaultRatePerHour:', instructor.defaultRatePerHour || 'NO CONFIGURADO');
    
    console.log('\n🏟️  Club:', instructor.club.name);
    console.log('  - courtRentalPrice:', instructor.club.courtRentalPrice || 'NO CONFIGURADO');
    
    // Calcular qué precio se debería usar
    const effectiveRate = instructor.hourlyRate || instructor.defaultRatePerHour || 0;
    const effectiveCourtPrice = instructor.club.courtRentalPrice || 0;
    const totalPerHour = effectiveRate + effectiveCourtPrice;
    
    console.log('\n💰 Cálculo de precios:');
    console.log('  - Tarifa efectiva del instructor:', effectiveRate, '€/hora');
    console.log('  - Precio de la pista:', effectiveCourtPrice, '€/hora');
    console.log('  - Total por hora:', totalPerHour, '€');
    console.log('  - Clase de 30 min:', (totalPerHour / 2).toFixed(2), '€');
    console.log('  - Por jugador (4 plazas):', (totalPerHour / 2 / 4).toFixed(2), '€');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPriceConfiguration();
