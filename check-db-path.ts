import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

console.log('\n🔍 Verificando rutas de base de datos...\n');

// Verificar .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('📄 .env contiene:');
  console.log(envContent);
}

// Verificar qué DB está usando Prisma
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function verify() {
  try {
    // Hacer un query simple
    const count = await prisma.timeSlot.count({
      where: { courtId: null }
    });
    
    console.log(`\n📊 TimeSlots con courtId=null: ${count}`);
    
    // Verificar propuestas de octubre
    const octoberCount = await prisma.timeSlot.count({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31T23:59:59')
        }
      }
    });
    
    console.log(`📅 Propuestas en Octubre: ${octoberCount}`);
    
    // Ver archivos .db que existen
    console.log('\n📁 Archivos .db encontrados:');
    const prismaDir = path.join(process.cwd(), 'prisma');
    function findDbFiles(dir: string, prefix = '') {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            findDbFiles(fullPath, prefix + file + '/');
          } else if (file.endsWith('.db')) {
            const size = (stat.size / 1024).toFixed(2);
            console.log(`   ${prefix}${file} (${size} KB)`);
          }
        });
      } catch (err) {
        // Ignorar errores
      }
    }
    findDbFiles(prismaDir);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
