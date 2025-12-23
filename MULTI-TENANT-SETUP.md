# Sistema Multi-Tenant para Múltiples Clubes

## 🏢 Arquitectura Implementada

Se ha implementado un sistema **path-based multi-tenant** que permite gestionar múltiples clubes de pádel de forma aislada.

## 📁 Estructura de URLs

```
/estrella/login        → Club Estrella
/estrella/classes      → Clases del Club Estrella
/estrella/profile      → Perfil en Club Estrella

/casillas/login        → Club Casillas
/casillas/classes      → Clases del Club Casillas
```

## 🔧 Componentes Implementados

### 1. Middleware (`src/middleware.ts`)
- Detecta el club desde la URL automáticamente
- Valida que el club exista
- Redirige rutas inválidas
- Agrega header `x-club-slug` para usar en el servidor

**Clubes válidos actuales:**
- `estrella` → Padel Estrella Madrid
- `casillas` → Club Casillas (o Club 1)
- `demo` → Club Demo

### 2. ClubContext (`src/contexts/ClubContext.tsx`)
- Provider React para compartir configuración del club
- Hook `useClub()` para acceder al club actual
- Carga configuración dinámica del club (logo, colores, tema)

**Uso en componentes:**
```typescript
import { useClub } from '@/contexts/ClubContext';

function MyComponent() {
  const { club, loading } = useClub();
  
  return <div>{club?.name}</div>;
}
```

### 3. API de Configuración (`/api/clubs/by-slug/[slug]`)
- Retorna configuración específica del club
- Mapea slug a clubId real en BD
- Permite personalización por club:
  - Logo
  - Color primario
  - Tema completo
  - Información de contacto

## 🚀 Próximos Pasos para Implementación Completa

### Paso 1: Migrar Páginas Existentes
Mover todas las páginas a la estructura de clubes:

```
src/app/(app)/          →   src/app/[clubSlug]/(app)/
src/app/(app)/login/    →   src/app/[clubSlug]/login/
src/app/(app)/classes/  →   src/app/[clubSlug]/classes/
```

### Paso 2: Actualizar Layout Principal
Envolver con ClubProvider:

```typescript
// src/app/[clubSlug]/layout.tsx
import { ClubProvider } from '@/contexts/ClubContext';

export default function ClubLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: { clubSlug: string };
}) {
  return (
    <ClubProvider clubSlug={params.clubSlug}>
      {children}
    </ClubProvider>
  );
}
```

### Paso 3: Actualizar APIs para Filtrar por Club
Todas las APIs deben filtrar por el clubId del contexto:

```typescript
// Obtener clubId desde el slug
const clubSlug = request.headers.get('x-club-slug');
const clubId = CLUB_SLUG_MAP[clubSlug];

// Filtrar queries
const classes = await prisma.timeSlot.findMany({
  where: { clubId: clubId }
});
```

### Paso 4: Actualizar Autenticación
El token debe incluir el clubId del usuario:

```typescript
// Al hacer login, verificar que el usuario pertenece al club
const user = await prisma.user.findUnique({
  where: { email, clubId: clubId }
});
```

### Paso 5: Página de Selección de Club (Opcional)
Crear una landing page en `/` que muestre todos los clubes disponibles.

## 🎨 Personalización por Club

Cada club puede tener su propia identidad:

### Logo
```typescript
// Agregar logos en public/logos/
/public/logos/estrella.png
/public/logos/casillas.png
```

### Colores y Tema
```typescript
// En src/app/api/clubs/by-slug/[slug]/route.ts
const colors = {
  'estrella': '#FFD700', // Dorado
  'casillas': '#0066CC', // Azul
};
```

### Base de Datos - Campo slug en Club
Agregar campo opcional `slug` al modelo Club:

```prisma
model Club {
  id    String  @id
  slug  String? @unique // "estrella", "casillas"
  name  String
  // ...
}
```

## 🔐 Seguridad y Aislamiento

### Reglas Implementadas:
1. ✅ Cada club solo ve sus propios datos
2. ✅ URLs contienen el identificador del club
3. ✅ Middleware valida clubes existentes
4. ✅ APIs deben filtrar por clubId

### Reglas Pendientes:
- [ ] Validar que usuario pertenece al club al hacer login
- [ ] Impedir cross-club data access en APIs
- [ ] Rate limiting por club
- [ ] Sesiones aisladas por club

## 📊 Migración de Datos

Para clubes existentes:
```sql
-- Agregar slug a clubes existentes
UPDATE Club SET slug = 'estrella' WHERE id = 'padel-estrella-madrid';
UPDATE Club SET slug = 'casillas' WHERE id = 'club-1';
```

## 🔄 Migración Futura a Subdominios

Cuando estés listo para producción, puedes migrar fácilmente:

```
/estrella/login  →  estrella.padelapp.com/login
/casillas/login  →  casillas.padelapp.com/login
```

Solo necesitas:
1. Configurar DNS con wildcard (*.padelapp.com)
2. Modificar middleware para detectar desde hostname en lugar de path
3. Mantener toda la lógica de ClubContext igual

## 📝 Checklist de Implementación

- [x] Middleware de detección de club
- [x] ClubContext y Provider
- [x] API de configuración por slug
- [ ] Migrar estructura de carpetas
- [ ] Actualizar layout con ClubProvider
- [ ] Actualizar todas las APIs para filtrar por clubId
- [ ] Actualizar autenticación
- [ ] Testing completo
- [ ] Documentación para nuevos clubes
