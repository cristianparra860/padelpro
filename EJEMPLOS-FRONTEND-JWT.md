# Ejemplos de Integración Frontend - Sistema JWT

## 🎨 Componentes React

### 1. Context Provider de Autenticación

```typescript
// src/contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  points: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario al iniciar
  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token inválido
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const { token, user: userData } = await response.json();
    localStorage.setItem('auth_token', token);
    setUser(userData);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('auth_token');
    setUser(null);
    window.location.href = '/';
  }

  async function refreshUser() {
    await loadUser();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### 2. Componente de Login

```typescript
// src/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded border p-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
```

### 3. Componente de Registro

```typescript
// src/components/auth/RegisterForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    level: 'principiante'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          level: formData.level
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      // Redirigir a login
      router.push('/?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="mt-1 block w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="mt-1 block w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Contraseña</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={8}
          className="mt-1 block w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Confirmar Contraseña</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          className="mt-1 block w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Nivel</label>
        <select
          value={formData.level}
          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
          className="mt-1 block w-full rounded border p-2"
        >
          <option value="principiante">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Registrando...' : 'Registrarse'}
      </button>
    </form>
  );
}
```

### 4. Componente de Usuario Autenticado

```typescript
// src/components/auth/UserMenu.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function UserMenu() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
        <p className="text-xs">
          {user.credits} créditos • {user.points} puntos
        </p>
      </div>
      
      <button
        onClick={logout}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
```

### 5. HOC para Rutas Protegidas

```typescript
// src/components/auth/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (requiredRoles && !requiredRoles.includes(user.role)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, requiredRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="mt-2">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 6. Hook Personalizado para Peticiones Autenticadas

```typescript
// src/hooks/useAuthFetch.ts
import { useAuth } from '@/contexts/AuthContext';

export function useAuthFetch() {
  const { logout } = useAuth();

  async function authFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
      }
    });

    // Si el token expiró, hacer logout automático
    if (response.status === 401) {
      await logout();
      throw new Error('Session expired');
    }

    return response;
  }

  return { authFetch };
}

// Uso:
// const { authFetch } = useAuthFetch();
// const response = await authFetch('/api/users/me');
```

## 📱 Ejemplo de Página Completa

```typescript
// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserMenu } from '@/components/auth/UserMenu';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <UserMenu />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <DashboardContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Créditos</h3>
        <p className="text-3xl font-bold text-blue-600">{user?.credits} €</p>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Puntos</h3>
        <p className="text-3xl font-bold text-green-600">{user?.points}</p>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Nivel</h3>
        <p className="text-3xl font-bold text-purple-600">{user?.level}</p>
      </div>
    </div>
  );
}
```

## 🎯 Página de Admin Protegida

```typescript
// src/app/admin/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import { useEffect, useState } from 'react';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={['CLUB_ADMIN', 'SUPER_ADMIN']}>
      <AdminContent />
    </ProtectedRoute>
  );
}

function AdminContent() {
  const { authFetch } = useAuthFetch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await authFetch('/api/admin/protected-example');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <div>Cargando datos de administrador...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Panel de Administrador</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
```

## 🔧 Configuración en Layout Principal

```typescript
// src/app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 💡 Tips y Mejores Prácticas

1. **Refresco automático del usuario:**
   ```typescript
   // Refrescar cada vez que se haga una reserva, compra de créditos, etc.
   const { refreshUser } = useAuth();
   
   async function handleBooking() {
     await bookClass();
     await refreshUser(); // Actualizar créditos
   }
   ```

2. **Indicador de carga global:**
   ```typescript
   // Mostrar spinner mientras se verifica autenticación
   if (loading) return <LoadingSpinner />;
   ```

3. **Redirección después de login:**
   ```typescript
   // Usar query param para redirigir después de login
   const searchParams = useSearchParams();
   const redirect = searchParams.get('redirect') || '/dashboard';
   
   await login(email, password);
   router.push(redirect);
   ```

4. **Manejo de errores consistente:**
   ```typescript
   try {
     await authFetch('/api/endpoint');
   } catch (error) {
     if (error.message === 'Session expired') {
       // Ya hizo logout automático
       toast.error('Tu sesión ha expirado');
     } else {
       toast.error('Error al cargar datos');
     }
   }
   ```

## 🎨 Integración con Componentes UI Existentes

Para integrar con los componentes actuales de PadelPro, reemplaza el mock auth:

```typescript
// Antes (mock):
import { mockLoginUser } from '@/lib/mockData';

// Después (JWT):
import { useAuth } from '@/contexts/AuthContext';
const { login } = useAuth();
```

Esto permite mantener toda la UI existente mientras se actualiza el backend de autenticación.
