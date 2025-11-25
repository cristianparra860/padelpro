# Sistema de Autenticación Real - PadelPro

## 📋 Resumen
Sistema de autenticación con contraseñas hasheadas usando **bcryptjs** y validación contra la base de datos SQLite mediante Prisma.

---

## 🎯 Arquitectura

### Base de Datos
**Tabla `User`** con campo `password`:
```prisma
model User {
  id          String  @id @default(cuid())
  email       String  @unique
  name        String
  password    String?  // Hash de bcrypt (nullable para compatibilidad)
  // ... otros campos
}
```

**Migración**: `20251120213730_add_password_field`

### Dependencias
```json
{
  "bcryptjs": "^3.0.3",
  "@types/bcryptjs": "^2.4.6"
}
```

---

## 🔐 Endpoints de Autenticación

### 1. Registro de Usuario
**Endpoint**: `POST /api/register`

**Request Body**:
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "MiContraseñaSegura123!",
  "level": "intermedio",          // opcional
  "genderCategory": "masculino"   // opcional
}
```

**Proceso**:
1. Valida campos requeridos (`name`, `email`, `password`)
2. Verifica que el email no exista en la BD
3. **Hashea la contraseña** con bcrypt (10 salt rounds)
4. Crea usuario en BD con contraseña hasheada
5. Retorna usuario sin campo `password`

**Response 201 (Éxito)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "user-1763675434114-n7r1tew5f",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "level": "intermedio",
    "role": "PLAYER",
    "createdAt": "2024-11-20T..."
  }
}
```

**Errores**:
- `400`: Faltan campos requeridos
- `409`: Email ya registrado
- `500`: Error interno del servidor

---

### 2. Login de Usuario
**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "juan@example.com",
  "password": "MiContraseñaSegura123!"
}
```

**Proceso**:
1. Valida campos requeridos
2. Busca usuario en BD por email
3. Verifica que el usuario tenga contraseña configurada
4. **Compara contraseña** con `bcrypt.compare(plain, hashed)`
5. Retorna datos del usuario (sin password)

**Response 200 (Éxito)**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user-1763675434114-n7r1tew5f",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "PLAYER",
    "credits": 0,
    "points": 0,
    "level": "intermedio",
    "club": {
      "id": "padel-estrella-madrid",
      "name": "Padel Estrella Madrid"
    }
  }
}
```

**Errores**:
- `400`: Faltan campos requeridos
- `401`: Email no existe / Contraseña incorrecta / Usuario sin contraseña configurada
- `500`: Error interno del servidor

---

## 🔧 Implementación Técnica

### Hashing de Contraseñas
```typescript
import * as bcrypt from 'bcryptjs';

// Al registrar usuario
const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

// Guardar en BD
await prisma.user.create({
  data: {
    // ... otros campos
    password: hashedPassword,
  }
});
```

### Validación de Contraseñas
```typescript
import * as bcrypt from 'bcryptjs';

// Al hacer login
const user = await prisma.user.findUnique({ where: { email } });

// Comparar contraseña
const isPasswordValid = await bcrypt.compare(password, user.password);
```

### Importación Correcta
```typescript
// ✅ CORRECTO - Funciona con bcryptjs 3.0.3
import * as bcrypt from 'bcryptjs';

// ❌ INCORRECTO - Puede fallar con ESM/CommonJS
import bcrypt from 'bcryptjs';
```

---

## 🧪 Testing

### Script de Prueba Completo
Archivo: `test-auth-flow.js`

**Ejecutar**:
```bash
node test-auth-flow.js
```

**Tests incluidos**:
1. ✅ Registro de usuario nuevo
2. ✅ Login con credenciales correctas
3. ✅ Rechazo de contraseña incorrecta
4. ✅ Rechazo de email no existente

### Resultado Esperado
```
🎉 Sistema de autenticación funcionando correctamente

📊 Resumen:
   ✅ Registro con contraseña hasheada
   ✅ Login con credenciales correctas
   ✅ Rechazo de contraseña incorrecta
   ✅ Rechazo de email no existente
```

---

## ⚠️ Limitaciones Actuales

### 1. No hay Gestión de Sesiones
- Login retorna datos del usuario pero **no crea sesión persistente**
- No hay JWT, cookies, ni tokens
- Frontend debe manejar estado de autenticación manualmente

**Próximos pasos**:
- Implementar JWT (JSON Web Tokens)
- Configurar cookies httpOnly con Next.js middleware
- Proteger rutas con middleware de autenticación

### 2. Usuarios Antiguos sin Contraseña
- Usuarios creados antes de la migración tienen `password = NULL`
- **No pueden hacer login** hasta configurar contraseña

**Solución temporal**:
```sql
-- Ver usuarios sin contraseña
SELECT id, email, name FROM User WHERE password IS NULL;
```

**Soluciones futuras**:
- Flujo de "Configurar contraseña" en primer login
- Envío de email de activación
- Reset de contraseña para usuarios antiguos

### 3. No hay Recuperación de Contraseña
Actualmente falta implementar:
- Endpoint `POST /api/auth/forgot-password`
- Envío de emails con tokens de reset
- Endpoint `POST /api/auth/reset-password`

### 4. No hay Validación de Fortaleza de Contraseña
Se acepta cualquier contraseña. Recomendaciones:
- Mínimo 8 caracteres
- Al menos 1 mayúscula, 1 minúscula, 1 número
- Caracteres especiales opcionales

---

## 🚀 Migración desde Mock Auth

### Antes (Mock)
```typescript
// src/lib/mockData.ts
const mockUsers = [
  { email: 'alex@example.com', password: 'password123' }
];

// Login validaba contra array hardcodeado
```

### Después (Base de Datos)
```typescript
// src/app/api/auth/login/route.ts
const user = await prisma.user.findUnique({ where: { email } });
const isValid = await bcrypt.compare(password, user.password);
```

### Compatibilidad
**Usuarios mock actuales** requieren:
1. Agregar contraseña hasheada a la BD
2. O usar flujo de "primer login" para configurar password

---

## 📁 Archivos Clave

### Endpoints
- `src/app/api/register/route.ts` - Registro con hashing
- `src/app/api/auth/login/route.ts` - Login con validación DB

### Base de Datos
- `prisma/schema.prisma` - Modelo User con campo password
- `prisma/migrations/20251120213730_add_password_field/` - Migración

### Testing
- `test-auth-flow.js` - Test end-to-end completo

### Configuración
- `package.json` - Dependencias bcryptjs

---

## 🔐 Seguridad

### ✅ Implementado
- ✅ Hashing de contraseñas con bcrypt (10 salt rounds)
- ✅ Campo password excluido de respuestas API
- ✅ Validación de email único
- ✅ Mensajes de error genéricos (no revela si email existe)

### ❌ Pendiente
- ❌ Rate limiting en endpoints de autenticación
- ❌ Protección contra fuerza bruta
- ❌ Tokens CSRF
- ❌ Verificación de email
- ❌ 2FA (autenticación de dos factores)
- ❌ Logs de intentos de login fallidos
- ❌ Bloqueo temporal de cuentas tras intentos fallidos

---

## 💡 Uso Recomendado

### Frontend (React/Next.js)
```typescript
// Registro
const register = async (userData) => {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  const data = await response.json();
  
  if (response.ok) {
    // Guardar usuario en estado/localStorage
    localStorage.setItem('user', JSON.stringify(data.user));
    // Redirigir a dashboard
  }
};

// Login
const login = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  
  if (response.ok) {
    // Guardar usuario en estado
    localStorage.setItem('user', JSON.stringify(data.user));
    // Redirigir a dashboard
  } else {
    // Mostrar error
    alert(data.error);
  }
};
```

---

## 🛠️ Comandos Útiles

### Regenerar Cliente Prisma
```bash
npx prisma generate
```

### Ver Base de Datos
```bash
npx prisma studio
```

### Crear Nueva Migración
```bash
npx prisma migrate dev --name nombre_migracion
```

### Ejecutar Tests
```bash
node test-auth-flow.js
```

### Verificar Usuarios en BD
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(users => {
  console.log(users.map(u => ({ 
    email: u.email, 
    hasPassword: !!u.password 
  })));
  prisma.\$disconnect();
});
"
```

---

## 📝 Notas de Desarrollo

### bcrypt vs bcryptjs
- **bcryptjs**: Implementación pura JavaScript (usada en este proyecto)
  - ✅ No requiere compilación nativa
  - ✅ Compatible con Windows sin build tools
  - ⚠️ Ligeramente más lento que bcrypt nativo

- **bcrypt**: Versión nativa con C++ bindings
  - ✅ Más rápido
  - ❌ Requiere compiladores C++ en Windows (node-gyp)

### Salt Rounds
- **Actual**: 10 rounds (2^10 = 1024 iteraciones)
- **Tiempo**: ~100-150ms por hash
- **Seguridad**: Adecuado para 2024
- **Recomendación**: Aumentar a 12 en producción

### Nullable Password
Campo `password` es nullable por dos razones:
1. **Compatibilidad**: Usuarios existentes sin contraseña
2. **Migración gradual**: Permite transición desde mock auth

**En producción**: Considerar hacer campo obligatorio tras migración completa.

---

## ✅ Estado Final

**Sistema implementado y funcionando**:
- ✅ Base de datos con campo password
- ✅ Registro con hashing bcrypt
- ✅ Login con validación DB
- ✅ Tests completos pasando
- ✅ Seguridad básica implementada

**Próximos pasos críticos**:
1. Implementar gestión de sesiones (JWT/cookies)
2. Proteger rutas con middleware
3. Agregar recuperación de contraseña
4. Migrar usuarios mock existentes
5. Implementar rate limiting
