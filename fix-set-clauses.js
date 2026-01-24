const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo columnas en cláusulas SET...');

// Función para corregir solo dentro de template literals SQL
function fixSetClauses(text) {
    // Buscar todos los bloques de prisma.$queryRaw` o prisma.$executeRaw`
    const regex = /(prisma\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;

        // Corregir SET status = 
        fixed = fixed.replace(/SET status\s*=/g, 'SET "status" =');

        // Corregir SET category =
        fixed = fixed.replace(/SET category\s*=/g, 'SET "category" =');

        // Corregir SET courtId =
        fixed = fixed.replace(/SET courtId\s*=/g, 'SET "courtId" =');

        // Corregir SET assignedCourtId =
        fixed = fixed.replace(/SET assignedCourtId\s*=/g, 'SET "assignedCourtId" =');

        // Corregir SET genderCategory =
        fixed = fixed.replace(/SET genderCategory\s*=/g, 'SET "genderCategory" =');

        // Corregir SET level =
        fixed = fixed.replace(/SET level\s*=/g, 'SET "level" =');

        // Corregir SET levelRange =
        fixed = fixed.replace(/SET levelRange\s*=/g, 'SET "levelRange" =');

        if (fixed !== sqlContent) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = fixSetClauses(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Se corrigieron columnas en cláusulas SET:');
console.log('   - status, category, courtId, assignedCourtId');
console.log('   - genderCategory, level, levelRange');
