# 🐛 BUG FIX: Fotos de instructor no se guardaban

## Problema
Cuando se intentaba añadir una foto a un instructor en la página Admin > Database > Instructors:
- El componente permitía subir la foto
- La foto se subía correctamente al servidor (`/public/uploads/profiles/`)
- La API de actualización funcionaba correctamente
- **PERO** la foto no se guardaba en la base de datos

## Causa Raíz
En el archivo `src/app/admin/database/page.tsx`, la función `openEditInstructor` (línea ~1330) 
NO estaba copiando los campos `userId` y `profilePictureUrl` al estado local `editingInstructor`.

```typescript
// ❌ ANTES (incorrecto)
setEditingInstructor({
  id: instructor.id,
  specialties: instructor.specialties || '',
  experience: instructor.yearsExperience ? `${instructor.yearsExperience}-${instructor.yearsExperience + 2} años` : '',
  hourlyRate: instructor.hourlyRate || 30,
  bio: instructor.bio || '',
  isActive: instructor.isActive
  // ⚠️ FALTABA: userId y profilePictureUrl
});
```

Cuando el usuario subía una foto, el componente `ImageUpload` actualizaba el estado con:
```typescript
setEditingInstructor({...editingInstructor, profilePictureUrl: url})
```

Pero como `userId` tampoco estaba en el estado, al enviar la petición PUT:
- El campo `userId` era `undefined`
- La API no podía actualizar la tabla User
- Resultado: foto no se guardaba

## Solución Implementada

### 1. Arreglar `openEditInstructor` (línea ~1330)
```typescript
// ✅ DESPUÉS (correcto)
setEditingInstructor({
  id: instructor.id,
  userId: instructor.userId,                    // ✅ Agregado
  profilePictureUrl: instructor.profilePictureUrl || null, // ✅ Agregado
  specialties: instructor.specialties || '',
  experience: instructor.yearsExperience ? `${instructor.yearsExperience}-${instructor.yearsExperience + 2} años` : '',
  hourlyRate: instructor.hourlyRate || 30,
  bio: instructor.bio || '',
  isActive: instructor.isActive
});
```

### 2. Añadir logging en `updateInstructor` (línea ~1343)
```typescript
console.log('📤 Updating instructor with data:', {
  id: editingInstructor.id,
  userId: editingInstructor.userId,
  profilePictureUrl: editingInstructor.profilePictureUrl
});
```

### 3. Añadir logging en `ImageUpload.tsx`
```typescript
console.log('✅ Image uploaded successfully:', data.url);
console.log('📸 Image URL passed to parent component:', data.url);
```

## Verificación

### Backend (funcionaba correctamente)
- ✅ API `/api/upload/image` sube archivos a `/public/uploads/profiles/`
- ✅ API `/api/admin/instructors` (PUT) actualiza correctamente:
  - Tabla `Instructor`: campos propios del instructor
  - Tabla `User`: campo `profilePictureUrl` cuando se proporciona `userId`

### Frontend (arreglado)
- ✅ El diálogo de edición ahora inicializa correctamente todos los campos
- ✅ El componente `ImageUpload` actualiza el estado local correctamente
- ✅ La petición PUT envía `userId` y `profilePictureUrl`
- ✅ Después de guardar, `loadData()` recarga los datos y muestra la foto

## Pasos de Prueba

1. Refrescar navegador con **Ctrl+Shift+R** (limpiar cache)
2. Ir a `http://localhost:9002/admin/database`
3. Scroll hasta sección **Instructors Management**
4. Hacer clic en editar (✏️) de Carlos Martínez
5. En el diálogo, hacer clic en "Subir imagen"
6. Seleccionar una imagen (JPG, PNG, máx 5MB)
7. Hacer clic en "Update Instructor"
8. **Resultado esperado**: 
   - Toast "Success: Instructor updated successfully"
   - Diálogo se cierra
   - Tabla se recarga
   - La foto aparece en la columna "Photo"

## Console Logs Esperados

### Al abrir el diálogo:
```
🔍 Opening edit dialog for instructor: {id: "instructor-carlos", ...}
🔍 Setting dialog open to true with profilePictureUrl: null
```

### Al subir imagen:
```
✅ Image uploaded successfully: /uploads/profiles/profile_1760877200123.jpg
📸 Image URL passed to parent component: /uploads/profiles/profile_1760877200123.jpg
```

### Al guardar:
```
📤 Updating instructor with data: {
  id: "instructor-carlos",
  userId: "instructor-carlos-user",
  profilePictureUrl: "/uploads/profiles/profile_1760877200123.jpg"
}
✅ Instructor updated successfully: {...}
```

## Archivos Modificados
- ✅ `src/app/admin/database/page.tsx` (líneas ~1330, ~1343)
- ✅ `src/components/admin/ImageUpload.tsx` (logging adicional)

## Estado del Sistema
- Base de datos: ✅ Tabla User tiene columna `profilePictureUrl`
- Directorio uploads: ✅ `/public/uploads/profiles/` existe
- API upload: ✅ Funciona correctamente
- API instructors: ✅ UPDATE funciona correctamente
- Frontend: ✅ ARREGLADO - ahora envía todos los campos necesarios
