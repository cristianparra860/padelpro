
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Fixing User table columns...')

        const columns = [
            { name: 'role', default: 'PLAYER' },
            { name: 'preference', default: 'NORMAL' },
            { name: 'visibility', default: 'PUBLIC' },
            { name: 'level', default: 'principiante' }
        ]

        for (const col of columns) {
            console.log(`Processing column: ${col.name}`)
            await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN 
          ALTER TABLE "User" ALTER COLUMN "${col.name}" DROP DEFAULT;
          ALTER TABLE "User" ALTER COLUMN "${col.name}" TYPE text USING "${col.name}"::text;
          ALTER TABLE "User" ALTER COLUMN "${col.name}" SET DEFAULT '${col.default}';
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Error altering column %: %', '${col.name}', SQLERRM;
        END $$;
      `)
        }

        console.log('User table columns fixed.')

    } catch (e) {
        console.error('Error executing raw SQL:', e)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
