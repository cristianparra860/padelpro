# 👥 Usuarios de Prueba - PadelPro

## 🔐 Credenciales de Acceso

### 🎾 Jugadores (PLAYER)

#### Jugador 1 - Juan Pérez
- **Email:** `jugador1@padelpro.com`
- **Password:** `Pass123!`
- **Nivel:** Intermedio
- **Role:** PLAYER

#### Jugador 2 - María García
- **Email:** `jugador2@padelpro.com`
- **Password:** `Pass123!`
- **Nivel:** Avanzado
- **Role:** PLAYER

### 👨‍🏫 Instructores (INSTRUCTOR)

#### Instructor - Carlos Ruiz
- **Email:** `instructor@padelpro.com`
- **Password:** `Pass123!`
- **Nivel:** Avanzado
- **Role:** INSTRUCTOR

### 👔 Administradores (ADMIN)

#### Admin - Admin PadelPro
- **Email:** `admin@padelpro.com`
- **Password:** `AdminPass123!`
- **Role:** CLUB_ADMIN

## 🚀 Cómo Usar

1. **Ir a la página de login:** http://localhost:9002/
2. **Introducir credenciales** de cualquier usuario de arriba
3. **Hacer clic en "Acceder"**
4. El sistema te redirigirá automáticamente según tu rol:
   - **PLAYER** → `/dashboard`
   - **INSTRUCTOR** → `/simple-instructor`
   - **CLUB_ADMIN** → `/admin`

## ➕ Crear Más Usuarios

```bash
node create-user-with-password.js <email> <password> <nombre> [role] [nivel]

# Ejemplos:
node create-user-with-password.js nuevo@test.com Pass123! "Nuevo Usuario" PLAYER intermedio
node create-user-with-password.js admin2@test.com Admin123! "Segundo Admin" CLUB_ADMIN avanzado
```

## 🔄 Cambiar entre Usuarios

1. Hacer clic en **"Cerrar Sesión"** en el menú de usuario
2. Volver a la página de login
3. Introducir las credenciales del nuevo usuario

## 📊 Roles Disponibles

- **PLAYER** - Usuario regular (puede reservar clases, ver su perfil)
- **INSTRUCTOR** - Profesor (puede gestionar sus clases)
- **CLUB_ADMIN** - Administrador del club (acceso completo)
- **SUPER_ADMIN** - Administrador global (acceso total)

## 🔒 Nota de Seguridad

⚠️ Estas son contraseñas de **DESARROLLO**. En producción:
- Usa contraseñas fuertes y únicas
- No compartas credenciales
- Cambia las contraseñas regularmente
