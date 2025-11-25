const puppeteer = require('puppeteer');

async function captureProfilePage() {
  let browser;
  
  try {
    console.log('🔍 Capturando estado real de la página de perfil...\n');
    
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Capturar logs de consola
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Usuario cargado') || 
          text.includes('profilePictureUrl') || 
          text.includes('hasPhoto') ||
          text.includes('UserProfileAvatar')) {
        console.log('📱 BROWSER LOG:', text);
      }
    });
    
    // Ir a la home para loguearse
    console.log('1️⃣ Navegando a home...');
    await page.goto('http://localhost:9002/', { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Login
    console.log('2️⃣ Llenando formulario de login...');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', 'jugador1@padelpro.com', { delay: 50 });
    await page.type('input[type="password"]', 'password123', { delay: 50 });
    
    console.log('3️⃣ Haciendo click en login...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    console.log('4️⃣ Navegando a /profile...');
    await page.goto('http://localhost:9002/profile', { waitUntil: 'networkidle2', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Verificar qué hay en el DOM
    console.log('\n5️⃣ ANALIZANDO DOM...');
    const domInfo = await page.evaluate(() => {
      // Buscar el componente de avatar
      const avatarContainers = document.querySelectorAll('[class*="rounded-full"]');
      const img = document.querySelector('img[alt*="Foto de perfil"]');
      const allImages = document.querySelectorAll('img');
      
      // Buscar divs con iniciales
      const initialsDiv = Array.from(document.querySelectorAll('div')).find(div => {
        const text = div.textContent?.trim();
        return text && text.length === 2 && text === text.toUpperCase();
      });
      
      return {
        avatarContainersCount: avatarContainers.length,
        hasProfileImage: !!img,
        profileImageSrc: img?.src?.substring(0, 80),
        allImagesCount: allImages.length,
        allImagesSrcs: Array.from(allImages).map(i => ({
          alt: i.alt,
          src: i.src?.substring(0, 60)
        })),
        hasInitialsDiv: !!initialsDiv,
        initialsText: initialsDiv?.textContent,
        initialsClasses: initialsDiv?.className
      };
    });
    
    console.log('\n📊 ESTADO DEL DOM:');
    console.log('   Avatar containers encontrados:', domInfo.avatarContainersCount);
    console.log('   Tiene <img> de perfil:', domInfo.hasProfileImage ? '✅ SÍ' : '❌ NO');
    if (domInfo.hasProfileImage) {
      console.log('   Src de la imagen:', domInfo.profileImageSrc);
    }
    console.log('   Total imágenes en página:', domInfo.allImagesCount);
    console.log('   Tiene div con iniciales:', domInfo.hasInitialsDiv ? '✅ SÍ' : '❌ NO');
    if (domInfo.hasInitialsDiv) {
      console.log('   Texto iniciales:', domInfo.initialsText);
    }
    
    // Verificar localStorage
    const storageInfo = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      return {
        hasToken: !!token,
        tokenPreview: token?.substring(0, 50)
      };
    });
    
    console.log('\n🔑 LOCALSTORAGE:');
    console.log('   Tiene token:', storageInfo.hasToken ? '✅ SÍ' : '❌ NO');
    
    // Llamar al API desde el navegador
    console.log('\n6️⃣ LLAMANDO AL API desde el navegador...');
    const apiResponse = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/users/current', {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            hasProfilePictureUrl: !!data.profilePictureUrl,
            profilePictureUrlLength: data.profilePictureUrl?.length,
            profilePictureUrlPreview: data.profilePictureUrl?.substring(0, 60),
            userName: data.name
          };
        } else {
          return {
            success: false,
            status: response.status,
            error: await response.text()
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('\n📡 RESPUESTA DEL API:');
    if (apiResponse.success) {
      console.log('   ✅ API respondió OK');
      console.log('   Usuario:', apiResponse.userName);
      console.log('   Tiene profilePictureUrl:', apiResponse.hasProfilePictureUrl ? '✅ SÍ' : '❌ NO');
      if (apiResponse.hasProfilePictureUrl) {
        console.log('   Longitud:', apiResponse.profilePictureUrlLength);
        console.log('   Preview:', apiResponse.profilePictureUrlPreview);
      }
    } else {
      console.log('   ❌ Error:', apiResponse.error);
    }
    
    // Tomar screenshot
    console.log('\n7️⃣ Tomando screenshot...');
    await page.screenshot({ 
      path: 'profile-actual-state.png', 
      fullPage: true 
    });
    console.log('   ✅ Screenshot guardado: profile-actual-state.png');
    
    // Diagnóstico final
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 DIAGNÓSTICO FINAL');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (apiResponse.success && apiResponse.hasProfilePictureUrl) {
      console.log('✅ El API devuelve la foto correctamente');
      
      if (!domInfo.hasProfileImage && domInfo.hasInitialsDiv) {
        console.log('❌ PROBLEMA CONFIRMADO: El componente está renderizando iniciales');
        console.log('   Iniciales mostradas:', domInfo.initialsText);
        console.log('   ');
        console.log('🔧 CAUSA: El prop user.profilePictureUrl llega como undefined al componente');
        console.log('   aunque currentUser SÍ tiene la foto');
        console.log('   ');
        console.log('💡 SOLUCIÓN: Ya cambié para usar currentUser directamente');
        console.log('   Si aún no funciona, hay un problema con la key o el re-render');
      } else if (domInfo.hasProfileImage) {
        console.log('✅ HAY una imagen en el DOM');
        console.log('   Revisar visualmente si se ve en el screenshot');
      }
    } else {
      console.log('❌ El API no devuelve la foto');
    }
    
    console.log('\n⏳ Dejando el navegador abierto 10 segundos para inspección manual...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

captureProfilePage();
