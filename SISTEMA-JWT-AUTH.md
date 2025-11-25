# Sistema de Autenticación JWT - PadelPro

## 🎯 Descripción General

Sistema de autenticación completo implementado con JWT (JSON Web Tokens), bcrypt para hashing de contraseñas, y control de roles/permisos.

## 📦 Componentes Implementados

### 1. Biblioteca de Autenticación (`src/lib/auth.ts`)

**Funciones principales:**

- `generateToken(payload)` - Genera JWT con datos del usuario
- `verifyToken(token)` - Valida y decodifica JWT
- `extractToken(request)` - Extrae token de headers o cookies
- `getCurrentUser(request)` - Obtiene usuario desde token
- `requireAuth(request)` - Middleware para rutas protegidas
- `requireRole(request, roles)` - Middleware para validar roles

### 2. Endpoints de Autenticación

#### POST `/api/auth/login`
**Login con generación de JWT**

```typescript
// Request
{
  "email": "usuario@example.com",
  "password": "MiContraseña123!"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "user-123",
    "name": "Usuario",
    "email": "usuario@example.com",
    "role": "PLAYER",
    "credits": 50,
    "points": 100
  }
}
```

**Características:**
- ✅ Valida email y password contra BD
- ✅ Hashea password con bcrypt (10 salt rounds)
- ✅ Genera JWT válido por 7 días
- ✅ Establece cookie httpOnly segura
- ✅ Retorna token en body para SPAs

#### GET `/api/auth/me`
**Obtener usuario actual desde JWT**

```typescript
// Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...

// Response
{
  "success": true,
  "user": {
    "id": "user-123",
    "name": "Usuario",
    "email": "usuario@example.com",
    "role": "PLAYER",
    "club": { ... }
  }
}
```

#### POST `/api/auth/logout`
**Cerrar sesión (eliminar cookie)**

```typescript
// Response
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 3. Endpoints Protegidos

#### GET `/api/users/me`
**Usuario autenticado (requiere JWT)**

```typescript
// Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...

// Response - Datos completos del usuario incluyendo créditos, puntos, etc.
```

#### GET `/api/admin/protected-example`
**Ejemplo de endpoint con validación de roles**

Solo accesible para `CLUB_ADMIN` y `SUPER_ADMIN`.

### 4. Middleware de Next.js (`middleware.ts`)

Protege rutas del frontend automáticamente:

**Rutas protegidas:**
- `/dashboard` - Requiere autenticación
- `/classes` - Requiere autenticación
- `/bookings` - Requiere autenticación
- `/profile` - Requiere autenticación
- `/admin` - Requiere autenticación + rol admin

**Rutas públicas:**
- `/` (login page)
- `/register`
- `/activities`

**Comportamiento:**
- Sin token → Redirige a `/` con query param `?redirect=/ruta-destino`
- Token inválido → Redirige a login
- Ya autenticado en `/` → Redirige a `/dashboard`
- PLAYER en `/admin` → Redirige a `/dashboard`

## 🔐 Seguridad

### Hashing de Contraseñas
```typescript
import * as bcrypt from 'bcryptjs';

// Al registrar
const hashedPassword = await bcrypt.hash(password, 10);

// Al login
const isValid = await bcrypt.compare(password, user.password);
```

### JWT Configuration
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'padelpro-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Payload del token
{
  userId: string,
  email: string,
  role: string,
  clubId: string
}
```

### Cookies Seguras
```typescript
response.cookies.set('auth_token', token, {
  httpOnly: true,              // No accesible desde JavaScript
  secure: NODE_ENV === 'production', // Solo HTTPS en producción
  sameSite: 'lax',             // Protección CSRF
  maxAge: 60 * 60 * 24 * 7,    // 7 días
  path: '/'
});
```

## 🔨 Uso en el Código

### Proteger un Endpoint API

**Opción 1: Solo autenticación**
```typescript
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;
  
  // Tu lógica aquí con acceso a `user`
  return NextResponse.json({ data: 'protegido' });
}
```

**Opción 2: Con validación de roles**
```typescript
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['CLUB_ADMIN', 'SUPER_ADMIN']);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;
  
  // Solo admins llegan aquí
  return NextResponse.json({ adminData: 'sensible' });
}
```

**Opción 3: Obtener usuario sin requerir autenticación**
```typescript
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (user) {
    // Usuario autenticado
    return NextResponse.json({ data: 'personalizada', user });
  } else {
    // Usuario anónimo
    return NextResponse.json({ data: 'pública' });
  }
}
```

## 🎨 Uso en el Frontend

### Login
```typescript
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const { token, user } = await response.json();
  
  // Guardar token (opcional, ya está en cookie httpOnly)
  localStorage.setItem('auth_token', token);
  
  return { token, user };
}
```

### Peticiones Autenticadas
```typescript
async function fetchProtectedData() {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch('/api/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    // Token expirado o inválido → redirigir a login
    window.location.href = '/login';
    return;
  }

  return await response.json();
}
```

### Logout
```typescript
async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST'
  });
  
  localStorage.removeItem('auth_token');
  window.location.href = '/';
}
```

### Hook React Personalizado
```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return { user, loading };
}
```

## 🧪 Testing

### Test Básico
```bash
node test-auth-flow.js
```

Valida:
- ✅ Registro con password hasheado
- ✅ Login con credenciales correctas
- ✅ Rechazo de contraseña incorrecta
- ✅ Rechazo de email no existente

### Test JWT
```bash
node test-auth-jwt-flow.js
```

Valida:
- ✅ Generación de JWT en login
- ✅ Validación de token válido
- ✅ Rechazo sin token
- ✅ Rechazo con token inválido
- ✅ Logout exitoso

### Test de Roles
```bash
node test-auth-roles.js
```

Valida:
- ✅ Usuario PLAYER puede acceder a endpoints públicos
- ✅ PLAYER bloqueado en endpoints admin
- ✅ Sistema de permisos funcionando

## 📊 Roles Disponibles

```typescript
enum Role {
  PLAYER = 'PLAYER',           // Usuario regular
  INSTRUCTOR = 'INSTRUCTOR',   // Profesor de padel
  CLUB_ADMIN = 'CLUB_ADMIN',   // Administrador del club
  SUPER_ADMIN = 'SUPER_ADMIN'  // Administrador global
}
```

**Jerarquía de permisos:**
1. `PLAYER` - Acceso básico (reservas, perfil)
2. `INSTRUCTOR` - Gestión de clases propias
3. `CLUB_ADMIN` - Gestión completa del club
4. `SUPER_ADMIN` - Acceso total al sistema

## ⚙️ Variables de Entorno

```env
# .env
JWT_SECRET=tu-clave-secreta-muy-larga-y-aleatoria-cambia-en-produccion
NODE_ENV=production
```

⚠️ **IMPORTANTE:** En producción, usa una clave secreta fuerte y única. Puedes generar una con:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🔄 Migración de Usuarios Existentes

Los usuarios creados antes de este sistema tienen `password = NULL`. Para migrarlos:

**Opción 1: Forzar creación de password**
```sql
-- Marcar usuarios sin password
UPDATE User SET password = NULL WHERE password IS NULL;
```

Luego implementar flujo de "primera vez" que les pida crear password.

**Opción 2: Script de migración**
```typescript
// scripts/migrate-passwords.ts
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

async function migratePasswords() {
  const users = await prisma.user.findMany({
    where: { password: null }
  });

  for (const user of users) {
    // Password temporal = email sin @dominio
    const tempPassword = user.email.split('@')[0];
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    console.log(`✅ Password temporal para ${user.email}: ${tempPassword}`);
  }
}
```

## 🚀 Próximas Mejoras

- [ ] Refresh tokens para renovación automática
- [ ] Rate limiting en endpoints de auth
- [ ] Verificación de email
- [ ] Recuperación de contraseña
- [ ] Autenticación de dos factores (2FA)
- [ ] OAuth (Google, Facebook)
- [ ] Auditoría de sesiones (tabla LoginHistory)
- [ ] Detección de actividad sospechosa

## 📚 Referencias

- [JWT.io](https://jwt.io/) - Debugger de tokens
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - Documentación
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)

## 💡 Notas de Implementación

1. **Cookie vs LocalStorage:**
   - Cookie httpOnly: Más seguro (no accesible desde JS → protege contra XSS)
   - LocalStorage: Más flexible pero vulnerable a XSS
   - Este sistema usa ambos: cookie para web, token en body para apps

2. **Expiración de tokens:**
   - Actual: 7 días
   - Recomendado para producción: 15-30 minutos + refresh token

3. **CORS:**
   - Si el frontend está en diferente dominio, configurar CORS en Next.js
   - Las cookies requieren `credentials: 'include'` en fetch

4. **HTTPS:**
   - En producción, SIEMPRE usar HTTPS
   - La flag `secure: true` en cookies requiere HTTPS

## ✅ Checklist de Producción

- [ ] Cambiar `JWT_SECRET` a valor aleatorio fuerte
- [ ] Establecer `JWT_SECRET` como variable de entorno
- [ ] Configurar `NODE_ENV=production`
- [ ] Habilitar `secure: true` en cookies
- [ ] Implementar rate limiting
- [ ] Configurar logs de seguridad
- [ ] Añadir monitoreo de tokens expirados
- [ ] Implementar refresh tokens
- [ ] Documentar para el equipo
- [ ] Realizar auditoría de seguridad
