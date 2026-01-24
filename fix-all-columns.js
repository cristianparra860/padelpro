const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo TODAS las columnas sin comillas en consultas SQL...');

// Función para corregir solo dentro de template literals SQL
function fixAllSQLColumns(text) {
    // Buscar todos los bloques de prisma.$queryRaw` o prisma.$executeRaw`
    const regex = /(prisma\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)`)([\s\S]*?)`/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, sqlContent) => {
        let fixed = sqlContent;

        // Lista de columnas que necesitan comillas (camelCase)
        const columns = [
            'clubId', 'courtId', 'instructorId', 'userId', 'timeSlotId',
            'totalPrice', 'creditsSlots', 'creditsCost', 'courtNumber',
            'maxPlayers', 'assignedClubId', 'updatedAt', 'createdAt',
            'amountBlocked', 'matchGameId'
        ];

        // Reemplazar cada columna sin comillas por su versión con comillas
        // Solo si NO está ya entre comillas
        columns.forEach(col => {
            // WHERE, AND, OR cláusulas
            fixed = fixed.replace(new RegExp(`(WHERE|AND|OR)\\s+${col}\\s*([=<>!])`, 'g'), `$1 "${col}" $2`);
            // SET cláusulas
            fixed = fixed.replace(new RegExp(`SET\\s+${col}\\s*=`, 'g'), `SET "${col}" =`);
            // Múltiples SET (col1 = val, col2 = val)
            fixed = fixed.replace(new RegExp(`,\\s*${col}\\s*=`, 'g'), `, "${col}" =`);
        });

        if (fixed !== sqlContent) {
            correctedCount++;
        }

        return prefix + fixed + '`';
    });

    console.log(`  ✓ Corregidas ${correctedCount} consultas SQL`);
    return result;
}

content = fixAllSQLColumns(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones aplicadas exitosamente!');
console.log('\n📊 Se corrigieron todas las columnas camelCase en:');
console.log('   - Cláusulas WHERE');
console.log('   - Cláusulas SET');
console.log('   - Cláusulas AND/OR');
