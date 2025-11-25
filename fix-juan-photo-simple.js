const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixJuanPerez() {
  const user = await prisma.user.findFirst({
    where: { email: 'jugador1@padelpro.com' }
  });
  
  console.log('Usuario:', user.name);
  console.log('Tiene foto actual:', !!user.profilePictureUrl);
  console.log('Tamaño:', user.profilePictureUrl?.length || 0);
  
  // Crear imagen más simple y garantizada
  const simpleImage = 'data:image/svg+xml,%3Csvg width="200" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="100" cy="100" r="90" fill="%234f46e5"/%3E%3Ctext x="100" y="130" font-family="Arial" font-size="90" font-weight="bold" fill="white" text-anchor="middle"%3EJP%3C/text%3E%3C/svg%3E';
  
  await prisma.user.update({
    where: { id: user.id },
    data: { profilePictureUrl: simpleImage }
  });
  
  console.log('\n✅ Foto actualizada');
  console.log('Nueva foto:', simpleImage.substring(0, 100));
  
  await prisma.$disconnect();
}

fixJuanPerez();
