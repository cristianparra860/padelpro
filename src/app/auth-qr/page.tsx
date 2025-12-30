'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthQRContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de QR inválido');
      setLoading(false);
      return;
    }

    // Verificar si el usuario está logueado
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
      router.push(`/?redirect=/auth-qr?token=${token}`);
      return;
    }

    fetch('/api/users/current', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => {
        setUser(data.user || data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching user:', err);
        router.push(`/?redirect=/auth-qr?token=${token}`);
      });
  }, [token, router]);

  const handleApprove = async () => {
    setApproving(true);
    setError('');
    
    try {
      const authToken = localStorage.getItem('auth_token');
      
      const res = await fetch('/api/auth/qr-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al aprobar sesión');
      }

      // Mostrar mensaje de éxito
      alert('✅ Sesión iniciada en la pantalla del club');
      router.push('/activities?view=clases');
    } catch (err: any) {
      console.error('Error approving session:', err);
      setError(err.message || 'Error al aprobar la sesión');
      setApproving(false);
    }
  };

  const handleCancel = () => {
    router.push('/activities?view=clases');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '2rem' }}>⏳ Cargando...</div>
        </div>
      </div>
    );
  }

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
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          🔐
        </div>

        <h1 style={{
          fontSize: '2rem',
          color: '#333',
          marginBottom: '1rem',
          fontWeight: 800
        }}>
          Confirmación de Inicio de Sesión
        </h1>

        <div style={{
          background: '#f0f9ff',
          padding: '1.5rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '2px solid #bae6fd'
        }}>
          <p style={{
            fontSize: '0.9rem',
            color: '#0369a1',
            margin: 0,
            marginBottom: '1rem',
            fontWeight: 600
          }}>
            Iniciando sesión como:
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem'
          }}>
            {user?.profilePictureUrl && (
              <img 
                src={user.profilePictureUrl} 
                alt={user.name}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #667eea'
                }}
              />
            )}
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: '#333',
                margin: 0
              }}>
                {user?.name}
              </p>
              <p style={{
                fontSize: '0.9rem',
                color: '#666',
                margin: 0
              }}>
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            border: '2px solid #faa'
          }}>
            ⚠️ {error}
          </div>
        )}

        <p style={{
          fontSize: '1.1rem',
          color: '#475569',
          marginBottom: '2rem',
          lineHeight: 1.6
        }}>
          ¿Deseas iniciar sesión en la <strong>pantalla del club</strong>?
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <button 
            onClick={handleApprove}
            disabled={approving}
            style={{
              background: approving ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '1.2rem 2rem',
              fontSize: '1.3rem',
              fontWeight: 700,
              border: 'none',
              borderRadius: '15px',
              cursor: approving ? 'not-allowed' : 'pointer',
              boxShadow: '0 5px 20px rgba(16,185,129,0.3)',
              transition: 'all 0.3s',
              opacity: approving ? 0.6 : 1
            }}
            onMouseOver={(e) => {
              if (!approving) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(16,185,129,0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!approving) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 5px 20px rgba(16,185,129,0.3)';
              }
            }}
          >
            {approving ? '⏳ Iniciando sesión...' : '✓ Sí, iniciar sesión'}
          </button>
          
          <button 
            onClick={handleCancel}
            disabled={approving}
            style={{
              background: 'white',
              color: '#ef4444',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              border: '2px solid #ef4444',
              borderRadius: '15px',
              cursor: approving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              opacity: approving ? 0.6 : 1
            }}
            onMouseOver={(e) => {
              if (!approving) {
                e.currentTarget.style.background = '#fee';
              }
            }}
            onMouseOut={(e) => {
              if (!approving) {
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            × Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthQRPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ fontSize: '2rem', color: 'white' }}>⏳ Cargando...</div>
      </div>
    }>
      <AuthQRContent />
    </Suspense>
  );
}
