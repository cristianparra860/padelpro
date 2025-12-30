'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function DemoPage() {
  const router = useRouter();
  const [animationKey, setAnimationKey] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [token, setToken] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');

  // Countdown timer
  useEffect(() => {
    if (!showQR || countdown <= 0) return;
    
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
  }, [showQR, countdown]);

  // Polling para verificar aprobación
  useEffect(() => {
    if (!showQR || !token) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/qr-status?token=${token}`);
        const data = await res.json();
        
        if (data.status === 'approved' && data.authToken) {
          localStorage.setItem('auth_token', data.authToken);
          clearInterval(pollInterval);
          router.push('/activities?view=clases');
        } else if (data.status === 'expired') {
          generateQR();
        }
      } catch (err) {
        console.error('Error polling QR status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [showQR, token, router]);

  const generateQR = async () => {
    try {
      setError('');
      const res = await fetch('/api/auth/qr-generate', {
        method: 'POST'
      });
      
      if (!res.ok) throw new Error('Error generando QR');
      
      const data = await res.json();
      const newToken = data.token;
      setToken(newToken);
      setCountdown(60);
      
      // Obtener IP local del servidor para que el móvil pueda acceder
      const ipRes = await fetch('/api/system/local-ip');
      const ipData = await ipRes.json();
      const baseUrl = `http://${ipData.ip}:${ipData.port}`;
      const qrUrl = `${baseUrl}/auth-qr?token=${newToken}`;
      
      const qrData = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      setQrDataUrl(qrData);
    } catch (err: any) {
      console.error('Error generating QR:', err);
      setError(err.message || 'Error al generar código QR');
    }
  };

  const handleShowQR = () => {
    setShowQR(true);
    generateQR();
  };

  const replayAnimation = () => {
    setAnimationKey(prev => prev + 1);
  };

  const handleNavigation = (path: string) => {
    console.log('Navegando a:', path);
    router.push(path);
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#111',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      zIndex: 9999
    }}>
      <style jsx>{`

        .video-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 35% center;
          z-index: 0;
          opacity: 0.3;
        }

        .content-overlay {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }

        .mobile-container {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 25px;
          padding: 20px;
        }

        .btn {
          position: relative;
          width: 100%;
          height: 90px;
          border-radius: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          
          transform: scale(0); 
          opacity: 0;
          animation: growBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .btn:hover {
          transform: scale(1.05);
        }

        .btn:active {
          transform: scale(0.98);
        }

        .btn span {
          color: white;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          z-index: 2;
          display: inline-block;
        }

        .btn span .letter {
          display: inline-block;
          opacity: 0;
          animation: fadeInLetter 0.3s ease-in-out forwards;
        }

        .clases {
          background: linear-gradient(135deg, #00C6FF 0%, #0072FF 100%);
          animation-delay: 0.2s;
        }

        .clases .letter:nth-child(1) { animation-delay: 0.3s; }
        .clases .letter:nth-child(2) { animation-delay: 0.4s; }
        .clases .letter:nth-child(3) { animation-delay: 0.5s; }
        .clases .letter:nth-child(4) { animation-delay: 0.6s; }
        .clases .letter:nth-child(5) { animation-delay: 0.7s; }
        .clases .letter:nth-child(6) { animation-delay: 0.8s; }

        .partidas {
          background: linear-gradient(135deg, #FF512F 0%, #DD2476 100%);
          animation-delay: 0.4s;
        }

        .partidas .letter:nth-child(1) { animation-delay: 0.9s; }
        .partidas .letter:nth-child(2) { animation-delay: 1.0s; }
        .partidas .letter:nth-child(3) { animation-delay: 1.1s; }
        .partidas .letter:nth-child(4) { animation-delay: 1.2s; }
        .partidas .letter:nth-child(5) { animation-delay: 1.3s; }
        .partidas .letter:nth-child(6) { animation-delay: 1.4s; }
        .partidas .letter:nth-child(7) { animation-delay: 1.5s; }
        .partidas .letter:nth-child(8) { animation-delay: 1.6s; }

        .reserva {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          animation-delay: 0.6s;
        }

        .reserva .letter:nth-child(1) { animation-delay: 1.7s; }
        .reserva .letter:nth-child(2) { animation-delay: 1.8s; }
        .reserva .letter:nth-child(3) { animation-delay: 1.9s; }
        .reserva .letter:nth-child(4) { animation-delay: 2.0s; }
        .reserva .letter:nth-child(5) { animation-delay: 2.1s; }
        .reserva .letter:nth-child(6) { animation-delay: 2.2s; }
        .reserva .letter:nth-child(7) { animation-delay: 2.3s; }

        @keyframes growBounce {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeInLetter {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .replay-btn {
          margin-top: 50px;
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #555;
          color: #777;
          border-radius: 30px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
        }
        .replay-btn:hover {
          border-color: white;
          color: white;
        }

        .club-logo {
          width: 150px;
          height: 150px;
          margin-bottom: 40px;
          opacity: 0;
          transform: scale(0);
          animation: growBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0s;
          object-fit: contain;
          filter: drop-shadow(0 10px 40px rgba(0,0,0,0.6));
        }

        .qr-container {
          background: white;
          padding: 40px;
          border-radius: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 450px;
          opacity: 0;
          transform: scale(0.8);
          animation: growBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .qr-title {
          font-size: 28px;
          font-weight: 800;
          color: #333;
          text-align: center;
          margin: 0;
        }

        .qr-subtitle {
          font-size: 16px;
          color: #666;
          text-align: center;
          margin: 0;
          line-height: 1.5;
        }

        .qr-code-wrapper {
          background: white;
          padding: 20px;
          border-radius: 20px;
          border: 3px solid #667eea;
        }

        .countdown {
          font-size: 48px;
          font-weight: 800;
          color: #667eea;
        }

        .countdown-label {
          font-size: 14px;
          color: #999;
          margin-top: -10px;
        }

        .refresh-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 15px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }

        .refresh-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .back-btn {
          margin-top: 20px;
          padding: 10px 20px;
          background: transparent;
          border: 2px solid white;
          color: white;
          border-radius: 30px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .back-btn:hover {
          background: white;
          color: #333;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          border: 2px solid #faa;
        }
      `}</style>

      <video autoPlay loop muted playsInline className="video-background">
        <source src="/video_mejorado.mp4" type="video/mp4" />
      </video>

      <div className="content-overlay">
        <img 
          key={`logo-${animationKey}`}
          src="/LOGO_OFICIAL-METODO3.webp" 
          alt="Padel Estrella" 
          className="club-logo"
        />
        
        {!showQR ? (
          <>
            <div className="mobile-container" id="container" key={`container-${animationKey}`}>
              <div className="btn clases" onClick={() => handleNavigation('/activities?view=clases')}>
                <span>
                  <span className="letter">C</span>
                  <span className="letter">L</span>
                  <span className="letter">A</span>
                  <span className="letter">S</span>
                  <span className="letter">E</span>
                  <span className="letter">S</span>
                </span>
              </div>

              <div className="btn partidas" onClick={() => handleNavigation('/matchgames')}>
                <span>
                  <span className="letter">P</span>
                  <span className="letter">A</span>
                  <span className="letter">R</span>
                  <span className="letter">T</span>
                  <span className="letter">I</span>
                  <span className="letter">D</span>
                  <span className="letter">A</span>
                  <span className="letter">S</span>
                </span>
              </div>

              <div className="btn reserva" onClick={() => handleNavigation('/agenda')}>
                <span>
                  <span className="letter">R</span>
                  <span className="letter">E</span>
                  <span className="letter">S</span>
                  <span className="letter">E</span>
                  <span className="letter">R</span>
                  <span className="letter">V</span>
                  <span className="letter">A</span>
                </span>
              </div>

              <div className="btn" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', animationDelay: '0.8s'}} onClick={handleShowQR}>
                <span>
                  <span className="letter">L</span>
                  <span className="letter">O</span>
                  <span className="letter">G</span>
                  <span className="letter">I</span>
                  <span className="letter">N</span>
                  <span className="letter"> </span>
                  <span className="letter">Q</span>
                  <span className="letter">R</span>
                </span>
              </div>
            </div>

            <button className="replay-btn" onClick={replayAnimation}>🔄 Repetir Animación</button>
          </>
        ) : (
          <>
            <div className="qr-container">
              <h2 className="qr-title">🔐 Iniciar Sesión</h2>
              <p className="qr-subtitle">
                Escanea este código QR con tu teléfono móvil para iniciar sesión de forma segura
              </p>

              {error && (
                <div className="error-message">⚠️ {error}</div>
              )}

              {qrDataUrl && (
                <div className="qr-code-wrapper">
                  <img src={qrDataUrl} alt="QR Code" style={{ display: 'block' }} />
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <div className="countdown">{countdown}s</div>
                <div className="countdown-label">El código expira en</div>
              </div>

              <button className="refresh-btn" onClick={generateQR}>
                🔄 Generar nuevo código
              </button>
            </div>

            <button className="back-btn" onClick={() => setShowQR(false)}>
              ← Volver a los botones
            </button>
          </>
        )}
      </div>
    </div>
  );
}
