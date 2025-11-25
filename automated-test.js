const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fullAutomatedTest() {
  let browser;
  
  try {
    console.log('🤖 INICIANDO TEST AUTOMATIZADO COMPLETO\n');
    
    // 1. Verificar datos en DB
    console.log('1️⃣ Verificando base de datos...');
    const dbUser = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('   ✅ Usuario:', dbUser.name);
    console.log('   ✅ Tiene foto:', !!dbUser.profilePictureUrl);
    console.log('   ✅ Longitud:', dbUser.profilePictureUrl?.length);
    
    if (!dbUser.profilePictureUrl) {
      console.log('   ❌ ERROR: No hay foto en DB, agregando una...');
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          profilePictureUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
        }
      });
      console.log('   ✅ Foto agregada');
    }
    
    // 2. Lanzar navegador
    console.log('\n2️⃣ Lanzando navegador headless...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar logs de consola
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('Avatar render') || text.includes('profilePictureUrl') || text.includes('hasPhoto')) {
        console.log('   📱 Console:', text);
      }
    });
    
    // 3. Ir a login
    console.log('\n3️⃣ Navegando a login...');
    await page.goto('http://localhost:9002/', { waitUntil: 'networkidle2' });
    
    // 4. Login
    console.log('\n4️⃣ Haciendo login...');
    await page.type('input[type="email"]', 'jugador1@padelpro.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Esperar navegación
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('   ✅ Login exitoso');
    
    // 5. Ir a perfil
    console.log('\n5️⃣ Navegando a perfil...');
    await page.goto('http://localhost:9002/profile', { waitUntil: 'networkidle2' });
    
    // Esperar que cargue
    await page.waitForTimeout(2000);
    
    // 6. Verificar qué devuelve el API
    console.log('\n6️⃣ Verificando respuesta del API...');
    const apiData = await page.evaluate(async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return {
        hasProfilePictureUrl: !!data.profilePictureUrl,
        profilePictureUrlLength: data.profilePictureUrl?.length,
        profilePictureUrlPreview: data.profilePictureUrl?.substring(0, 60)
      };
    });
    
    console.log('   ✅ API Response:', apiData);
    
    // 7. Verificar el DOM
    console.log('\n7️⃣ Verificando DOM...');
    const domInfo = await page.evaluate(() => {
      const avatarContainer = document.querySelector('[class*="rounded-full"]');
      const img = document.querySelector('img[alt*="Foto de perfil"]');
      const initialsDiv = document.querySelector('[class*="rounded-full"] div[class*="font-bold"]');
      
      return {
        hasAvatarContainer: !!avatarContainer,
        hasImgTag: !!img,
        imgSrc: img?.src?.substring(0, 60),
        hasInitialsDiv: !!initialsDiv,
        initialsText: initialsDiv?.textContent
      };
    });
    
    console.log('   DOM Estado:', domInfo);
    
    // 8. Buscar logs específicos
    console.log('\n8️⃣ Analizando logs de consola...');
    const avatarLogs = consoleLogs.filter(log => 
      log.includes('UserProfileAvatar') || 
      log.includes('user.profilePictureUrl') ||
      log.includes('hasPhoto')
    );
    
    if (avatarLogs.length > 0) {
      console.log('   📋 Logs del componente Avatar:');
      avatarLogs.forEach(log => console.log('      ', log));
    } else {
      console.log('   ⚠️ No se encontraron logs del componente');
    }
    
    // 9. Tomar screenshot
    console.log('\n9️⃣ Tomando screenshot...');
    await page.screenshot({ path: 'profile-screenshot.png', fullPage: true });
    console.log('   ✅ Screenshot guardado: profile-screenshot.png');
    
    // 10. Diagnóstico final
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 DIAGNÓSTICO FINAL');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (apiData.hasProfilePictureUrl) {
      console.log('✅ API devuelve profilePictureUrl correctamente');
    } else {
      console.log('❌ API NO devuelve profilePictureUrl');
    }
    
    if (domInfo.hasImgTag) {
      console.log('✅ Hay un tag <img> en el DOM');
      console.log('   src:', domInfo.imgSrc);
    } else {
      console.log('❌ NO hay tag <img> en el DOM');
    }
    
    if (domInfo.hasInitialsDiv) {
      console.log('⚠️ Se está mostrando el fallback de iniciales:', domInfo.initialsText);
    }
    
    console.log('\n🔍 CONCLUSIÓN:');
    if (apiData.hasProfilePictureUrl && !domInfo.hasImgTag) {
      console.log('❌ EL PROBLEMA ESTÁ EN EL COMPONENTE REACT');
      console.log('   El API devuelve la foto pero el componente no la renderiza');
      console.log('   Revisar: user.profilePictureUrl llegando como undefined al componente');
    } else if (!apiData.hasProfilePictureUrl) {
      console.log('❌ EL PROBLEMA ESTÁ EN EL API');
      console.log('   El API no devuelve profilePictureUrl');
    } else {
      console.log('✅ TODO FUNCIONA - La imagen debería estar visible');
    }
    
  } catch (error) {
    console.error('❌ Error en test automatizado:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    await prisma.$disconnect();
  }
}

fullAutomatedTest();
