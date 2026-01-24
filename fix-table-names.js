const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo nombres de tablas User, Instructor, Court...');

// Función para corregir solo dentro de template literals SQL
function fixTableNames(text) {
    // Buscar todos los bloques de prisma.$queryRaw` o prisma.$executeRaw`
    const regex = /(prisma\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;

        // Reemplazar nombres de tablas sin comillas
        fixed = fixed.replace(/FROM User(?!\w)/g, 'FROM "User"');
        fixed = fixed.replace(/JOIN User(?!\w)/g, 'JOIN "User"');
        fixed = fixed.replace(/UPDATE User(?!\w)/g, 'UPDATE "User"');
        fixed = fixed.replace(/INSERT INTO User(?!\w)/g, 'INSERT INTO "User"');

        fixed = fixed.replace(/FROM Instructor(?!\w)/g, 'FROM "Instructor"');
        fixed = fixed.replace(/JOIN Instructor(?!\w)/g, 'JOIN "Instructor"');
        fixed = fixed.replace(/UPDATE Instructor(?!\w)/g, 'UPDATE "Instructor"');

        // Corregir columnas comunes que pueden estar sin comillas
        fixed = fixed.replace(/SELECT gender,/g, 'SELECT "gender",');
        fixed = fixed.replace(/SELECT level,/g, 'SELECT "level",');
        fixed = fixed.replace(/SELECT levelRanges/g, 'SELECT "levelRanges"');
        fixed = fixed.replace(/, gender,/g, ', "gender",');
        fixed = fixed.replace(/, level,/g, ', "level",');
        fixed = fixed.replace(/, level FROM/g, ', "level" FROM');
        fixed = fixed.replace(/SELECT genderCategory,/g, 'SELECT "genderCategory",');
        fixed = fixed.replace(/SELECT levelRange/g, 'SELECT "levelRange"');

        if (fixed !== sqlContent) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = fixTableNames(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Se corrigieron:');
console.log('   - Tablas: User, Instructor');
console.log('   - Columnas: gender, level, levelRanges, genderCategory, levelRange');
