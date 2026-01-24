const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo columna "id" en consultas SQL...');

// Función para corregir solo dentro de template literals SQL
function fixIdColumn(text) {
    // Buscar todos los bloques de prisma.$queryRaw` o prisma.$executeRaw`
    const regex = /(prisma\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;

        // Corregir "WHERE id =" y variantes
        fixed = fixed.replace(/WHERE id\s*([=<>!])/g, 'WHERE "id" $1');
        fixed = fixed.replace(/AND id\s*([=<>!])/g, 'AND "id" $1');
        fixed = fixed.replace(/OR id\s*([=<>!])/g, 'OR "id" $1');

        // Corregir "SELECT id" cuando no está ya entre comillas
        // Pero solo si no está seguido de otro nombre (como "identity")
        fixed = fixed.replace(/SELECT id,/g, 'SELECT "id",');
        fixed = fixed.replace(/SELECT id\s+FROM/g, 'SELECT "id" FROM');
        fixed = fixed.replace(/,\s*id,/g, ', "id",');
        fixed = fixed.replace(/,\s*id\s+FROM/g, ', "id" FROM');

        if (fixed !== sqlContent) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = fixIdColumn(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Se corrigió la columna "id" en:');
console.log('   - Cláusulas WHERE');
console.log('   - Cláusulas SELECT');
console.log('   - Cláusulas AND/OR');
