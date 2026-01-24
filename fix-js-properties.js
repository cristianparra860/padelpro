const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'classes', 'book', 'route.ts');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Corrigiendo sintaxis JS inválida dentro de template literals...');

// Función para corregir propiedades entrecomilladas dentro de expresiones JS
function fixJsProperties(text) {
    // Buscar expresiones dentro de ${...} en todo el archivo (no solo dentro de queries SQL)
    // Esto es seguro porque en JS normal no deberíamos tener prop."name"

    // Patrón para encontrar ${...}
    // Nota: Esto es simplificado y podría fallar con llaves anidadas, pero
    // para el código típico de este archivo debería funcionar.
    const regex = /(\$\{)([^}]+)(\})/g;

    let correctedCount = 0;
    const result = text.replace(regex, (match, prefix, expression, suffix) => {
        let fixed = expression;

        // Reemplazar object."propery" por object.property
        // También maneja object?."property"
        if (fixed.match(/\."\w+"/)) {
            fixed = fixed.replace(/\."(\w+)"/g, '.$1');
            if (fixed !== expression) {
                correctedCount++;
            }
        }

        return prefix + fixed + suffix;
    });

    console.log(`  ✓ Corregidas ${correctedCount} expresiones JS`);
    return result;
}

content = fixJsProperties(content);

// Guardar archivo
console.log('\n💾 Guardando archivo corregido...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Correcciones JS aplicadas exitosamente!');
console.log('\n📊 Se corrigió la sintaxis ${obj."prop"} -> ${obj.prop}');
