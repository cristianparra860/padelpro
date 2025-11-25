import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Obtener usuario de la base de datos
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });

    if (!user) {
      return new NextResponse('Usuario no encontrado', { status: 404 });
    }

    const hasPhoto = !!user.profilePictureUrl;
    const photoUrl = user.profilePictureUrl || '';

    // Crear página HTML de diagnóstico
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Diagnóstico Foto Perfil</title>
  <style>
    body {
      font-family: monospace;
      padding: 40px;
      background: #1a1a1a;
      color: #0f0;
    }
    .section {
      background: #000;
      border: 2px solid #0f0;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .success { color: #0f0; font-weight: bold; }
    .error { color: #f00; font-weight: bold; }
    .warning { color: #ff0; font-weight: bold; }
    h1 { color: #0ff; }
    h2 { color: #0f0; border-bottom: 1px solid #0f0; padding-bottom: 10px; }
    pre { background: #333; padding: 10px; overflow-x: auto; }
    .avatar-test {
      width: 200px;
      height: 200px;
      border: 4px solid #0f0;
      border-radius: 50%;
      margin: 20px 0;
      object-fit: cover;
    }
    .initials {
      width: 200px;
      height: 200px;
      border: 4px solid #f00;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 80px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>🔍 DIAGNÓSTICO COMPLETO - FOTO DE PERFIL</h1>

  <div class="section">
    <h2>1️⃣ DATOS EN BASE DE DATOS</h2>
    <p><strong>Usuario:</strong> ${user.name}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Tiene profilePictureUrl:</strong> <span class="${hasPhoto ? 'success' : 'error'}">${hasPhoto ? '✅ SÍ' : '❌ NO'}</span></p>
    <p><strong>Longitud:</strong> ${photoUrl.length} caracteres</p>
    <p><strong>Primeros 80 caracteres:</strong></p>
    <pre>${photoUrl.substring(0, 80)}</pre>
    <p><strong>Es data URI válido:</strong> <span class="${photoUrl.startsWith('data:image') ? 'success' : 'error'}">${photoUrl.startsWith('data:image') ? '✅ SÍ' : '❌ NO'}</span></p>
  </div>

  <div class="section">
    <h2>2️⃣ PRUEBA DE RENDERIZADO</h2>
    ${hasPhoto ? `
      <p class="success">✅ Intentando renderizar imagen...</p>
      <img 
        src="${photoUrl}" 
        class="avatar-test"
        onload="document.getElementById('img-status').innerHTML = '✅ IMAGEN CARGADA CORRECTAMENTE'; document.getElementById('img-status').className = 'success';"
        onerror="document.getElementById('img-status').innerHTML = '❌ ERROR AL CARGAR IMAGEN'; document.getElementById('img-status').className = 'error';"
      />
      <p id="img-status" class="warning">⏳ Cargando imagen...</p>
    ` : `
      <p class="error">❌ No hay foto en la base de datos</p>
      <div class="initials">${user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}</div>
    `}
  </div>

  <div class="section">
    <h2>3️⃣ VERIFICACIÓN API /api/users/current</h2>
    <p>Llamando al endpoint con token del localStorage...</p>
    <div id="api-result">⏳ Cargando...</div>
    <pre id="api-data"></pre>
  </div>

  <div class="section">
    <h2>4️⃣ DIAGNÓSTICO FINAL</h2>
    <div id="final-diagnosis">Analizando...</div>
  </div>

  <script>
    // Llamar al API
    async function testAPI() {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        document.getElementById('api-result').innerHTML = '<span class="error">❌ No hay token en localStorage</span>';
        document.getElementById('final-diagnosis').innerHTML = '<span class="error">❌ No estás logueado. Ve a http://localhost:9002 y loguéate primero.</span>';
        return;
      }

      try {
        const response = await fetch('/api/users/current', {
          headers: { 'Authorization': 'Bearer ' + token },
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          
          document.getElementById('api-result').innerHTML = '<span class="success">✅ API respondió correctamente</span>';
          document.getElementById('api-data').textContent = JSON.stringify({
            name: data.name,
            email: data.email,
            hasProfilePictureUrl: !!data.profilePictureUrl,
            profilePictureUrlLength: data.profilePictureUrl?.length,
            profilePictureUrlPreview: data.profilePictureUrl?.substring(0, 80)
          }, null, 2);

          // Diagnóstico final
          const dbHasPhoto = ${hasPhoto};
          const apiHasPhoto = !!data.profilePictureUrl;

          let diagnosis = '';
          
          if (dbHasPhoto && apiHasPhoto) {
            diagnosis = '<p class="success">✅ BASE DE DATOS: Tiene foto</p>';
            diagnosis += '<p class="success">✅ API: Devuelve foto correctamente</p>';
            diagnosis += '<p class="success">✅ RENDERIZADO: Imagen visible arriba</p>';
            diagnosis += '<br><p style="font-size: 18px; color: #0ff;"><strong>🎯 CONCLUSIÓN: Todo funciona correctamente</strong></p>';
            diagnosis += '<p class="warning">⚠️ Si no ves la foto en /profile, el problema está en el componente React UserProfileAvatar</p>';
            diagnosis += '<p class="warning">El componente no está recibiendo o procesando user.profilePictureUrl correctamente</p>';
          } else if (dbHasPhoto && !apiHasPhoto) {
            diagnosis = '<p class="success">✅ BASE DE DATOS: Tiene foto</p>';
            diagnosis += '<p class="error">❌ API: NO devuelve foto</p>';
            diagnosis += '<p class="error">🎯 CONCLUSIÓN: Problema en el endpoint /api/users/current</p>';
          } else if (!dbHasPhoto) {
            diagnosis = '<p class="error">❌ BASE DE DATOS: No hay foto</p>';
            diagnosis += '<p class="error">🎯 CONCLUSIÓN: Sube una foto desde /profile primero</p>';
          }

          document.getElementById('final-diagnosis').innerHTML = diagnosis;

        } else {
          document.getElementById('api-result').innerHTML = '<span class="error">❌ Error: ' + response.status + '</span>';
          document.getElementById('api-data').textContent = await response.text();
          document.getElementById('final-diagnosis').innerHTML = '<span class="error">❌ El API no responde correctamente. Verifica el token.</span>';
        }
      } catch (error) {
        document.getElementById('api-result').innerHTML = '<span class="error">❌ Error: ' + error.message + '</span>';
        document.getElementById('final-diagnosis').innerHTML = '<span class="error">❌ Error al llamar al API</span>';
      }
    }

    testAPI();
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('Error en diagnóstico:', error);
    return new NextResponse('Error: ' + (error as Error).message, { status: 500 });
  }
}
