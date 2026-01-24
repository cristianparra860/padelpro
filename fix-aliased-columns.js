const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo columnas con alias de tabla (b.timeSlotId, ts.id, etc.)...');

// Función para corregir solo dentro de template literals SQL
function fixAliasedColumns(text) {
    const regex = /(prisma\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;

        // Lista de columnas camelCase que necesitan comillas cuando se usan con alias
        const columns = [
            'id', 'userId', 'timeSlotId', 'clubId', 'courtId', 'instructorId',
            'amountBlocked', 'status', 'courtNumber', 'totalPrice',
            'creditsSlots', 'creditsCost', 'maxPlayers', 'updatedAt', 'createdAt',
            'genderCategory', 'levelRange', 'levelRanges', 'gender', 'level',
            'assignedCourtId', 'assignedInstructorId', 'matchGameId'
        ];

        // Corregir columnas con alias de tabla (b.column, ts.column, etc.)
        columns.forEach(col => {
            // Patrón: alias.column (donde alias es una o dos letras)
            fixed = fixed.replace(new RegExp(`([a-z]{1,3})\\.${col}(?![a-zA-Z])`, 'g'), `$1."${col}"`);
        });

        if (fixed !== sqlContent) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = fixAliasedColumns(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Se corrigieron columnas con alias de tabla:');
console.log('   - b.timeSlotId → b."timeSlotId"');
console.log('   - ts.id → ts."id"');
console.log('   - b.userId → b."userId"');
console.log('   - etc.');
