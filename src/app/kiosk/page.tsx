'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function KioskLoginPage() {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [token, setToken] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');

  useEffect(() => {
    generateQR();
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          generateQR();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/qr-status?token=${token}`);
        const data = await res.json();
        
        if (data.status === 'approved') {
          console.log('✅ QR Aprobado! Guardando token y redirigiendo...');
          localStorage.setItem('auth_token', data.authToken);
          window.location.href = '/activities?view=clases';
        } else if (data.status === 'expired') {
          console.log('⏱️ QR Expirado, regenerando...');
          generateQR();
        }
      } catch (err) {
        console.error('Error polling QR status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [token]);

  const generateQR = async () => {
    try {
      setError('');
      
      const res = await fetch('/api/auth/qr-generate', { method: 'POST' });
      
      if (!res.ok) {
        throw new Error('Failed to generate QR');
      }
      
      const { token } = await res.json();
      setToken(token);

      // Obtener IP local del servidor para que el móvil pueda acceder
      const ipRes = await fetch('/api/system/local-ip');
      const ipData = await ipRes.json();
      const url = `http://${ipData.ip}:${ipData.port}/auth-qr?token=${token}`;
      
      const dataUrl = await QRCode.toDataURL(url, { 
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrDataUrl(dataUrl);
      setCountdown(60);
      
      console.log('🎯 Nuevo QR generado:', token);
      console.log('🌐 URL del QR:', url);
    } catch (err) {
      console.error('Error generating QR:', err);
      setError('Error al generar código QR. Intentando de nuevo...');
      setTimeout(generateQR, 3000);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '30px',
        padding: '3rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          color: '#333', 
          fontSize: '2.5rem', 
          marginBottom: '1rem',
          fontWeight: 800
        }}>
          🎾 PadelPro
        </h1>
        
        <h2 style={{
          color: '#666',
          fontSize: '1.5rem',
          marginBottom: '2rem',
          fontWeight: 600
        }}>
          Escanea para iniciar sesión
        </h2>
        
        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
        
        {qrDataUrl && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              background: 'white',
              padding: '1rem',
              borderRadius: '20px',
              border: '3px solid #667eea',
              boxShadow: '0 5px 20px rgba(102,126,234,0.3)'
            }}>
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                style={{ 
                  display: 'block',
                  width: '300px',
                  height: '300px'
                }}
              />
            </div>
            
            <div style={{
              background: countdown <= 10 ? '#fee' : '#f0f9ff',
              color: countdown <= 10 ? '#c33' : '#0369a1',
              padding: '0.75rem 1.5rem',
              borderRadius: '50px',
              fontSize: '1.1rem',
              fontWeight: 700,
              border: countdown <= 10 ? '2px solid #faa' : '2px solid #bae6fd'
            }}>
              {countdown <= 10 ? '⚠️' : '⏱️'} Expira en {countdown}s
            </div>
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '15px',
          border: '2px dashed #cbd5e1'
        }}>
          <p style={{ 
            color: '#475569', 
            fontSize: '1rem',
            margin: 0,
            lineHeight: 1.6
          }}>
            📱 Abre <strong>PadelPro</strong> en tu móvil<br/>
            y escanea el código QR
          </p>
        </div>
      </div>

      <button
        onClick={generateQR}
        style={{
          marginTop: '2rem',
          padding: '1rem 2rem',
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid white',
          color: 'white',
          borderRadius: '50px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        🔄 Generar nuevo código
      </button>
    </div>
  );
}
