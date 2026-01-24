const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo palabras reservadas de PostgreSQL en consultas SQL...');

// Función para corregir solo dentro de template literals SQL
function fixSQLQueries(text) {
    // Buscar todos los bloques de prisma.$queryRaw` o prisma.$executeRaw`
    const regex = /(prisma\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;

        // Escapar palabras reservadas de SQL que aparecen como nombres de columnas
        // Usar lookbehind y lookahead para asegurar que son nombres de columnas, no keywords
        fixed = fixed.replace(/\b(start|end)\b(?=\s*[,\s]|$)/g, '"$1"');

        // Reemplazar nombres de tablas sin comillas
        fixed = fixed.replace(/FROM TimeSlot(?!\w)/g, 'FROM "TimeSlot"');
        fixed = fixed.replace(/JOIN TimeSlot(?!\w)/g, 'JOIN "TimeSlot"');
        fixed = fixed.replace(/UPDATE TimeSlot(?!\w)/g, 'UPDATE "TimeSlot"');
        fixed = fixed.replace(/INSERT INTO TimeSlot(?!\w)/g, 'INSERT INTO "TimeSlot"');

        fixed = fixed.replace(/FROM Booking(?!\w)/g, 'FROM "Booking"');
        fixed = fixed.replace(/JOIN Booking(?!\w)/g, 'JOIN "Booking"');
        fixed = fixed.replace(/UPDATE Booking(?!\w)/g, 'UPDATE "Booking"');

        fixed = fixed.replace(/FROM Court(?!\w)/g, 'FROM "Court"');
        fixed = fixed.replace(/JOIN Court(?!\w)/g, 'JOIN "Court"');

        fixed = fixed.replace(/FROM CourtSchedule(?!\w)/g, 'FROM "CourtSchedule"');
        fixed = fixed.replace(/INSERT INTO CourtSchedule(?!\w)/g, 'INSERT INTO "CourtSchedule"');

        // Reemplazar datetime('now') por NOW()
        fixed = fixed.replace(/datetime\('now'\)/g, 'NOW()');

        if (fixed !== sqlContent) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = fixSQLQueries(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Se corrigieron:');
console.log('   - Palabras reservadas: start → "start", end → "end"');
console.log('   - Nombres de tablas: TimeSlot → "TimeSlot", etc.');
console.log('   - Funciones SQL: datetime() → NOW()');
