const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    console.log('=== CHECKING USER PASSWORDS ===\n');
    
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'admin@padelpro.com',
            'instructor@padelpro.com',
            'ana@padelclub.com',
            'carlos@padelclub.com',
            'jugador1@padelpro.com',
            'jugador2@padelpro.com',
            'ana.nueva@padelpro.com',
            'cristian.parra@padelpro.com',
            'alex.garcia@padelpro.com',
            'david.collado@padelpro.com'
          ]
        }
      },
      select: {
        name: true,
        email: true,
        role: true,
        password: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`Found ${users.length} users\n`);
    
    // Passwords to test
    const testPasswords = ['Pass123!', 'AdminPass123!', 'pass123', 'password123', '123456'];
    
    for (const user of users) {
      console.log(`\n${user.role}: ${user.name} (${user.email})`);
      console.log(`Has password hash: ${user.password ? 'YES' : 'NO'}`);
      
      if (user.password) {
        console.log('Testing passwords...');
        for (const testPass of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPass, user.password);
            if (isMatch) {
              console.log(`  ✅ MATCH: "${testPass}"`);
              break;
            }
          } catch (err) {
            // Skip
          }
        }
      } else {
        console.log('  ⚠️ No password set - needs to be created');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();
