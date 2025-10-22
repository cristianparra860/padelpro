const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDatabase() {
  console.log('\n🔧 Reparando estructura de base de datos...\n');

  try {
    // 1. Agregar columnas a User
    console.log('👤 Agregando columnas a User...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN genderCategory TEXT`;
      console.log('   ✅ genderCategory agregada');
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('   ⏭️ genderCategory ya existe');
      } else throw e;
    }

    try {
      await prisma.$executeRaw`ALTER TABLE User ADD COLUMN preferredGameType TEXT`;
      console.log('   ✅ preferredGameType agregada');
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('   ⏭️ preferredGameType ya existe');
      } else throw e;
    }

    // 2. Verificar tablas de calendario
    console.log('\n📋 Verificando tablas de calendario...');
    
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' 
      AND name IN ('CourtSchedule', 'InstructorSchedule')
      ORDER BY name
    `;
    
    if (tables.length === 0) {
      console.log('   ⚠️ Creando tablas de calendario...\n');

      // Crear CourtSchedule
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS CourtSchedule (
          id TEXT PRIMARY KEY,
          courtId TEXT NOT NULL,
          date TEXT NOT NULL,
          startTime TEXT NOT NULL,
          endTime TEXT NOT NULL,
          isOccupied INTEGER NOT NULL DEFAULT 0,
          timeSlotId TEXT,
          reason TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (courtId) REFERENCES Court(id),
          UNIQUE(courtId, startTime)
        )
      `;
      console.log('   ✅ Tabla CourtSchedule creada');

      // Crear InstructorSchedule
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS InstructorSchedule (
          id TEXT PRIMARY KEY,
          instructorId TEXT NOT NULL,
          date TEXT NOT NULL,
          startTime TEXT NOT NULL,
          endTime TEXT NOT NULL,
          isOccupied INTEGER NOT NULL DEFAULT 0,
          timeSlotId TEXT,
          reason TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (instructorId) REFERENCES Instructor(id),
          UNIQUE(instructorId, startTime)
        )
      `;
      console.log('   ✅ Tabla InstructorSchedule creada');
    } else {
      console.log(`   ✅ Tablas ya existen: ${tables.map(t => t.name).join(', ')}`);
    }

    console.log('\n✅ Base de datos reparada correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase();
