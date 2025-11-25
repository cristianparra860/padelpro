"use client";

import { useEffect, useState } from 'react';

export default function TestPhotoPage() {
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        console.log('🔑 Token:', token ? 'Presente' : 'FALTA');
        
        const response = await fetch('/api/users/current', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Data recibida:', {
            name: data.name,
            email: data.email,
            hasProfilePictureUrl: !!data.profilePictureUrl,
            profilePictureUrlPreview: data.profilePictureUrl?.substring(0, 80)
          });
          setUserData(data);
        } else {
          const errorText = await response.text();
          setError(`Error ${response.status}: ${errorText}`);
        }
      } catch (err: any) {
        console.error('❌ Error:', err);
        setError(err.message);
      }
    };
    
    loadUser();
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#fee', color: '#c00' }}>
        <h1>❌ Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!userData) {
    return <div style={{ padding: '20px' }}>Cargando...</div>;
  }

  const hasPhoto = userData.profilePictureUrl && userData.profilePictureUrl.startsWith('data:image');

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>🧪 Test de Foto de Perfil</h1>
      
      <div style={{ background: '#f0f0f0', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
        <h2>📊 Datos del Usuario:</h2>
        <pre>{JSON.stringify({
          name: userData.name,
          email: userData.email,
          hasProfilePictureUrl: !!userData.profilePictureUrl,
          profilePictureUrlLength: userData.profilePictureUrl?.length,
          profilePictureUrlPreview: userData.profilePictureUrl?.substring(0, 100)
        }, null, 2)}</pre>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2>🖼️ Renderizado de la Imagen:</h2>
        <p><strong>hasPhoto:</strong> {hasPhoto ? '✅ SÍ' : '❌ NO'}</p>
        
        {hasPhoto ? (
          <div>
            <p style={{ color: 'green' }}>✅ Intentando renderizar imagen...</p>
            <img 
              src={userData.profilePictureUrl}
              alt="Profile"
              style={{ 
                width: '200px', 
                height: '200px', 
                border: '4px solid green',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onLoad={() => console.log('✅ ¡IMAGEN CARGADA EXITOSAMENTE!')}
              onError={(e) => console.error('❌ Error cargando imagen:', e)}
            />
            <p style={{ marginTop: '10px', color: 'green' }}>
              Si ves una imagen arriba, el backend funciona correctamente.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'red' }}>❌ No hay profilePictureUrl o no es válido</p>
            <div style={{ 
              width: '200px', 
              height: '200px', 
              border: '4px solid red',
              borderRadius: '50%',
              background: 'linear-gradient(to bottom right, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '60px',
              fontWeight: 'bold'
            }}>
              {userData.name ? userData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : '??'}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px', background: '#e0f2fe', padding: '20px', borderRadius: '8px' }}>
        <h2>🔍 Diagnóstico:</h2>
        {hasPhoto ? (
          <div>
            <p>✅ userData.profilePictureUrl existe</p>
            <p>✅ Empieza con "data:image"</p>
            <p>✅ Tamaño: {userData.profilePictureUrl.length} caracteres</p>
            <p>✅ La imagen DEBERÍA mostrarse arriba</p>
          </div>
        ) : (
          <div>
            <p>❌ userData.profilePictureUrl: {userData.profilePictureUrl ? 'Existe pero no es válido' : 'undefined/null'}</p>
            <p>❌ El API no está devolviendo la foto correctamente</p>
          </div>
        )}
      </div>
    </div>
  );
}
