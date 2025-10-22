# 🖼️ Fix: Imágenes de perfil de alumnos no se mostraban

## Problema
Después de la optimización del endpoint `/api/timeslots`, las imágenes de perfil de los alumnos registrados en las clases no se mostraban. Solo aparecía el círculo verde sin la imagen.

## Causa Raíz
Al optimizar la query de Prisma, olvidé incluir el campo `profilePictureUrl` en el `select` del usuario:

```typescript
// ❌ ANTES (incompleto)
user: {
  select: {
    id: true,
    name: true,
    email: true,
    level: true,
    position: true
    // ⚠️ Faltaba profilePictureUrl
  }
}
```

## Solución Aplicada

### 1. Agregar `profilePictureUrl` al select de Prisma
**Archivo**: `src/app/api/timeslots/route.ts` (línea 50-65)

```typescript
// ✅ DESPUÉS (completo)
user: {
  select: {
    id: true,
    name: true,
    email: true,
    level: true,
    position: true,
    profilePictureUrl: true  // ✅ Agregado
  }
}
```

### 2. Incluir en el objeto formateado de bookings
**Archivo**: `src/app/api/timeslots/route.ts` (línea 103-116)

```typescript
const formattedBookings = slotBookings.map(booking => ({
  id: booking.id,
  userId: booking.userId,
  groupSize: booking.groupSize,
  status: booking.status,
  name: booking.user.name,  // Para ClassCardReal
  userName: booking.user.name,  // Para classesApi
  userEmail: booking.user.email,
  userLevel: booking.user.level,
  userGender: booking.user.position,
  profilePictureUrl: booking.user.profilePictureUrl,  // ✅ Agregado
  createdAt: booking.createdAt
}));
```

### 3. Actualizar interfaz TypeScript
**Archivo**: `src/lib/classesApi.ts` (línea 26-35)

```typescript
bookings?: Array<{
  id: string;
  userId: string;
  groupSize: number;
  status: string;
  userName?: string;
  profilePictureUrl?: string;  // ✅ Agregado
  userLevel?: string;
  userGender?: string;
  createdAt?: string;
}>;
```

## Resultado ✅
- Las imágenes de perfil de los alumnos ahora se muestran correctamente
- Si no hay imagen, se muestra el fallback con iniciales en círculo verde
- Compatibilidad mantenida con todos los componentes existentes

## Archivos Modificados
1. `src/app/api/timeslots/route.ts` - Query y formateo de datos
2. `src/lib/classesApi.ts` - Interfaz TypeScript actualizada

## Testing
Recargar la página de clases y verificar que:
- ✅ Las imágenes de perfil se muestran si el usuario las tiene configuradas
- ✅ Se muestran iniciales si no hay imagen
- ✅ El círculo verde sigue apareciendo para indicar reserva ocupada
