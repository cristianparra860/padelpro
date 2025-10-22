const fs = require('fs');
const path = require('path');

// Archivos a optimizar
const files = [
  'src/app/api/admin/admins/route.ts',
  'src/app/api/admin/bookings/route.ts',
  'src/app/api/admin/bookings/[id]/route.ts',
  'src/app/api/admin/clients/route.ts',
  'src/app/api/admin/clubs/route.ts',
  'src/app/api/admin/courts/route.ts',
  'src/app/api/admin/create-infrastructure/route.ts',
  'src/app/api/admin/generate-class-proposals/route.ts',
  'src/app/api/admin/instructors/route.ts',
  'src/app/api/admin/instructors/[id]/route.ts',
  'src/app/api/admin/matches/route.ts',
  'src/app/api/admin/timeslots/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/admin/users/[id]/route.ts',
  'src/app/api/classes/book/route.ts',
  'src/app/api/classes/cancel/route.ts',
  'src/app/api/clubs/route.ts',
  'src/app/api/me/route.ts',
  'src/app/api/my/bookings/route.ts',
  'src/app/api/register/route.ts',
];

let totalFixed = 0;
let totalErrors = 0;

files.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Archivo no existe: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Reemplazar import de PrismaClient
    if (content.includes("import { PrismaClient } from '@prisma/client'")) {
      content = content.replace(
        /import { PrismaClient } from '@prisma\/client';?\n\nconst prisma = new PrismaClient\(\);?/g,
        "import { prisma } from '@/lib/prisma';"
      );
      modified = true;
    }

    // Eliminar bloques finally con $disconnect
    if (content.includes('await prisma.$disconnect()')) {
      // Patrón 1: } finally {\n    await prisma.$disconnect();\n  }
      content = content.replace(/\s*} finally {\s*await prisma\.\$disconnect\(\);\s*}/g, '  }');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Optimizado: ${filePath}`);
      totalFixed++;
    } else {
      console.log(`ℹ️  Sin cambios: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    totalErrors++;
  }
});

console.log('\n📊 Resumen:');
console.log(`✅ Archivos optimizados: ${totalFixed}`);
console.log(`❌ Errores: ${totalErrors}`);
console.log(`📁 Total procesados: ${files.length}`);
