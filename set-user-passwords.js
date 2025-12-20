const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setPasswordsForAllUsers() {
  try {
    console.log('=== SETTING PASSWORDS FOR ALL USERS ===\n');
    
    const standardPassword = 'Pass123!';
    const adminPassword = 'AdminPass123!';
    
    // Hash passwords
    const standardHash = await bcrypt.hash(standardPassword, 10);
    const adminHash = await bcrypt.hash(adminPassword, 10);
    
    console.log('✅ Passwords hashed\n');
    
    // Users to update
    const usersToUpdate = [
      // Admin
      { email: 'admin@padelpro.com', password: adminHash, name: 'Admin' },
      
      // Instructors
      { email: 'instructor@padelpro.com', password: standardHash, name: 'Carlos Ruiz' },
      { email: 'ana@padelclub.com', password: standardHash, name: 'Ana Lopez' },
      { email: 'carlos@padelclub.com', password: standardHash, name: 'Carlos Martinez' },
      
      // Players
      { email: 'jugador1@padelpro.com', password: standardHash, name: 'Marc Parra' },
      { email: 'jugador2@padelpro.com', password: standardHash, name: 'María García' },
      { email: 'ana.nueva@padelpro.com', password: standardHash, name: 'Ana Nueva' },
      { email: 'cristian.parra@padelpro.com', password: standardHash, name: 'Cristian Parra' },
      { email: 'alex.garcia@padelpro.com', password: standardHash, name: 'Alex García' },
      { email: 'david.collado@padelpro.com', password: standardHash, name: 'David Collado' }
    ];
    
    for (const userData of usersToUpdate) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: userData.email }
        });
        
        if (user) {
          await prisma.user.update({
            where: { email: userData.email },
            data: { password: userData.password }
          });
          const passToShow = userData.email === 'admin@padelpro.com' ? 'AdminPass123!' : 'Pass123!';
          console.log(`✅ ${userData.name} (${userData.email}) → Password: ${passToShow}`);
        } else {
          console.log(`⚠️ ${userData.name} (${userData.email}) → Usuario no encontrado`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${userData.email}:`, error.message);
      }
    }
    
    console.log('\n✅ PASSWORDS UPDATED SUCCESSFULLY');
    console.log('\nCredentials summary:');
    console.log('  Admin: admin@padelpro.com / AdminPass123!');
    console.log('  All others: <email> / Pass123!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setPasswordsForAllUsers();
